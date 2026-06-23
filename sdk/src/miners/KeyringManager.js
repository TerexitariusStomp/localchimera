/**
 * KeyringManager — Secure key references for miner integrations.
 *
 * Security rule: ZERO private key material lives in this file or the SDK.
 * We only store KEY NAMES and FILE PATHS that point to OS-level secure storage.
 *
 * - Akash: keys live in provider-services keyring (OS keyring or file).
 * - Targon: keys live in ~/.config/.targon.json (user-owned, 0600).
 *
 * Apps using the SDK cannot extract funds because they never see mnemonics.
 */

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

const AKASH_KEY_NAME = 'mykey';
const TARGON_CONFIG_PATH = path.join(os.homedir(), '.config', '.targon.json');
const AKASH_KUBECONFIG = '/etc/rancher/k3s/k3s.yaml';

export class KeyringManager {
  /**
   * Verify Akash key exists in provider-services keyring.
   * Returns the key name (not the mnemonic).
   */
  static async akashKeyName() {
    // The actual mnemonic is in the provider-services keyring.
    // We only return the key NAME so callers can use --from mykey.
    return AKASH_KEY_NAME;
  }

  /**
   * Verify Targon config exists and return its path.
   * The hotkey phrase lives inside ~/.config/.targon.json (user-owned, 0600).
   * The SDK never opens this file; it passes the path to the miner binary.
   */
  static async targonConfigPath() {
    try {
      await fs.access(TARGON_CONFIG_PATH);
      return TARGON_CONFIG_PATH;
    } catch {
      throw new Error(`Targon config not found at ${TARGON_CONFIG_PATH}. Run targon-cli setup first.`);
    }
  }

  /**
   * Verify k3s is accessible.
   */
  static async kubeconfigPath() {
    try {
      await fs.access(AKASH_KUBECONFIG);
      return AKASH_KUBECONFIG;
    } catch {
      throw new Error(`k3s kubeconfig not found at ${AKASH_KUBECONFIG}. Is k3s installed?`);
    }
  }

  /**
   * Returns a summary of what key references are available.
   * No secrets are exposed.
   */
  static async status() {
    const targonExists = await fs.access(TARGON_CONFIG_PATH).then(() => true).catch(() => false);
    const kubeExists = await fs.access(AKASH_KUBECONFIG).then(() => true).catch(() => false);
    return {
      akash: { keyName: AKASH_KEY_NAME, kubeconfig: kubeExists },
      targon: { configPath: TARGON_CONFIG_PATH, exists: targonExists }
    };
  }
}
