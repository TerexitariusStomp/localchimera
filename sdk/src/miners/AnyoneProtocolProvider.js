/**
 * AnyoneProtocolProvider — Auto-setup and run Anyone Protocol relay.
 *
 * Onion routing relay node (Snowflake-style bridge).
 * Docker-based, no keys required in SDK.
 */

import { spawn, execSync } from 'child_process';
import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';

const ANYONE_DIR = path.join(os.homedir(), 'CascadeProjects', 'qvac-chimera', 'upstream', 'anyone-protocol');

export class AnyoneProtocolProvider {
  constructor(opts = {}) {
    this.process = null;
    this.running = false;
    this.logs = [];
    this.relayPort = opts.relayPort || 9001;
  }

  async init() {
    const exists = await fs.access(ANYONE_DIR).then(() => true).catch(() => false);
    if (!exists) throw new Error('Anyone Protocol not found. Clone: git submodule add https://github.com/anyone-protocol/anyone.git upstream/anyone-protocol');

    try {
      execSync('docker --version', { stdio: 'ignore' });
    } catch {
      throw new Error('Docker not available. Install Docker first.');
    }
  }

  async start() {
    if (this.running) return { success: true, alreadyRunning: true };

    return new Promise((resolve) => {
      this.process = spawn('docker', [
        'run', '-d',
        '--name', 'anyone-relay',
        '--restart', 'unless-stopped',
        '-p', `${this.relayPort}:9001`,
        '-v', path.join(ANYONE_DIR, 'config') + ':/app/config',
        'anyoneprotocol/relay:latest'
      ], { cwd: ANYONE_DIR });

      this.running = true;

      this.process.stdout.on('data', (data) => {
        const line = data.toString().trim();
        this.logs.push({ ts: Date.now(), level: 'info', msg: line });
        if (this.logs.length > 500) this.logs.shift();
      });

      this.process.stderr.on('data', (data) => {
        const line = data.toString().trim();
        this.logs.push({ ts: Date.now(), level: 'error', msg: line });
        if (this.logs.length > 500) this.logs.shift();
      });

      this.process.on('exit', (code) => {
        this.running = false;
      });

      setTimeout(() => {
        if (this.process && !this.process.killed) {
          resolve({ success: true, pid: this.process.pid, provider: 'anyone-protocol', relayPort: this.relayPort });
        } else {
          resolve({ success: false, error: 'Anyone Protocol relay exited immediately. Check logs.' });
        }
      }, 5000);
    });
  }

  async stop() {
    if (!this.process || !this.running) return { success: true, alreadyStopped: true };
    try {
      execSync('docker stop anyone-relay', { stdio: 'ignore' });
      execSync('docker rm anyone-relay', { stdio: 'ignore' });
    } catch {}
    this.process.kill('SIGTERM');
    this.running = false;
    return { success: true, provider: 'anyone-protocol' };
  }

  status() {
    return {
      provider: 'anyone-protocol',
      running: this.running,
      pid: this.process?.pid || null,
      relayPort: this.relayPort,
      resources: 'Docker-based, bandwidth + CPU',
      recentLogs: this.logs.slice(-10)
    };
  }
}
