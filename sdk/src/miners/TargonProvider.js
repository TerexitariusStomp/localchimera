/**
 * TargonProvider — Auto-setup and run Targon CPU provider.
 *
 * Security: never stores or transmits the hotkey mnemonic.
 * The hotkey lives in ~/.config/.targon.json (user-owned, 0600).
 * The SDK only passes the config file path to the miner binary.
 */

import { spawn } from 'child_process';
import path from 'path';
import os from 'os';
import { KeyringManager } from './KeyringManager.js';

const TARGON_DIR = path.join(os.homedir(), 'CascadeProjects', 'qvac-chimera', 'upstream', 'targon');
const TARGON_CLI = path.join(TARGON_DIR, 'targon-cli');

export class TargonProvider {
  constructor(opts = {}) {
    this.configPath = null;
    this.process = null;
    this.running = false;
    this.logs = [];
  }

  async init() {
    this.configPath = await KeyringManager.targonConfigPath();
  }

  async start() {
    if (this.running) return { success: true, alreadyRunning: true };
    if (!this.configPath) await this.init();

    return new Promise((resolve) => {
      const env = {
        ...process.env,
        TARGON_SKIP_HW_ATTESTATION: '1',
        TARGON_SKIP_GPU_CHECK: '1'
      };

      this.process = spawn(TARGON_CLI, [], {
        cwd: TARGON_DIR,
        env,
        detached: true
      });

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
          resolve({ success: true, pid: this.process.pid, provider: 'targon' });
        } else {
          resolve({ success: false, error: 'Targon provider exited immediately. Check logs.' });
        }
      }, 3000);
    });
  }

  async stop() {
    if (!this.process || !this.running) return { success: true, alreadyStopped: true };
    this.process.kill('SIGTERM');
    this.running = false;
    return { success: true, provider: 'targon' };
  }

  status() {
    return {
      provider: 'targon',
      running: this.running,
      pid: this.process?.pid || null,
      configPath: this.configPath,
      recentLogs: this.logs.slice(-10)
    };
  }
}
