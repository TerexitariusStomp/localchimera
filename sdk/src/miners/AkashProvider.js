/**
 * AkashProvider — Auto-setup and run Akash provider node.
 *
 * Security: never stores or transmits the wallet mnemonic.
 * Uses provider-services keyring reference (--from mykey).
 */

import { spawn } from 'child_process';
import { KeyringManager } from './KeyringManager.js';

export class AkashProvider {
  constructor(opts = {}) {
    this.keyName = null;
    this.kubeconfig = null;
    this.akashNode = opts.akashNode || 'https://rpc.akashnet.net:443';
    this.process = null;
    this.running = false;
    this.logs = [];
  }

  async init() {
    this.keyName = await KeyringManager.akashKeyName();
    this.kubeconfig = await KeyringManager.kubeconfigPath();
  }

  async start() {
    if (this.running) return { success: true, alreadyRunning: true };
    if (!this.keyName) await this.init();

    return new Promise((resolve) => {
      const env = {
        ...process.env,
        KUBECONFIG: this.kubeconfig
      };

      this.process = spawn('provider-services', [
        'run',
        '--from', this.keyName,
        '--node', this.akashNode
      ], { env, detached: true });

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

      // Give it 3s to see if it crashes immediately
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          resolve({ success: true, pid: this.process.pid, provider: 'akash' });
        } else {
          resolve({ success: false, error: 'Akash provider exited immediately. Check logs.' });
        }
      }, 3000);
    });
  }

  async stop() {
    if (!this.process || !this.running) return { success: true, alreadyStopped: true };
    this.process.kill('SIGTERM');
    this.running = false;
    return { success: true, provider: 'akash' };
  }

  status() {
    return {
      provider: 'akash',
      running: this.running,
      pid: this.process?.pid || null,
      keyName: this.keyName,
      akashNode: this.akashNode,
      recentLogs: this.logs.slice(-10)
    };
  }
}
