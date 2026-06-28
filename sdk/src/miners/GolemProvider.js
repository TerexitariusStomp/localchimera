/**
 * GolemProvider — Auto-setup and run Golem provider node.
 *
 * Decentralized compute marketplace (yagna daemon).
 * Docker-based, no local private keys in SDK.
 */

import { spawn, execSync } from 'child_process';
import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';

const GOLEM_DIR = path.join(os.homedir(), 'CascadeProjects', 'qvac-chimera', 'upstream', 'golem');

export class GolemProvider {
  constructor(opts = {}) {
    this.process = null;
    this.running = false;
    this.logs = [];
    this.subnet = opts.subnet || 'public';
  }

  async init() {
    const exists = await fs.access(GOLEM_DIR).then(() => true).catch(() => false);
    if (!exists) throw new Error('Golem provider not found. Clone: git submodule add https://github.com/golemcloud/golem-runner.git upstream/golem');

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
        '--name', 'golem-provider',
        '--restart', 'unless-stopped',
        '-e', `GOLEM_SUBNET=${this.subnet}`,
        '-v', '/var/run/docker.sock:/var/run/docker.sock',
        '-v', path.join(GOLEM_DIR, 'data') + ':/root/.local/share/yagna',
        'golemprovider/golem-provider:latest'
      ], { cwd: GOLEM_DIR });

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
          resolve({ success: true, pid: this.process.pid, provider: 'golem', subnet: this.subnet });
        } else {
          resolve({ success: false, error: 'Golem provider exited immediately. Check logs.' });
        }
      }, 5000);
    });
  }

  async stop() {
    if (!this.process || !this.running) return { success: true, alreadyStopped: true };
    try {
      execSync('docker stop golem-provider', { stdio: 'ignore' });
      execSync('docker rm golem-provider', { stdio: 'ignore' });
    } catch {}
    this.process.kill('SIGTERM');
    this.running = false;
    return { success: true, provider: 'golem' };
  }

  status() {
    return {
      provider: 'golem',
      running: this.running,
      pid: this.process?.pid || null,
      subnet: this.subnet,
      resources: 'Docker-based, CPU + optional GPU',
      recentLogs: this.logs.slice(-10)
    };
  }
}
