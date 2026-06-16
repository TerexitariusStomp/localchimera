import { Logger } from './Logger.js';

/**
 * MultisigManager
 * Manages protocol-level multisig wallets for Nostr and Bittensor
 * Two-sweep architecture:
 *   1. Weekly: collect all network funds into EVM multisig
 *   2. Monthly: distribute from EVM multisig (70% machine owner, 30% app developer)
 */
export class MultisigManager {
  constructor(config) {
    this.config = config;
    this.logger = new Logger('MultisigManager');
    this.multisigs = new Map();
    this.pendingSweeps = new Map();
    this.machineOwnerAddress = config.machineOwnerAddress || null;
    this.revenueSplit = config.revenueSplit || { machineOwner: 0.70, appDeveloper: 0.30 };
    this.evmMultisigAddress = config.evmMultisigAddress || null;
  }

  async initialize() {
    this.logger.info('Initializing protocol multisig manager...');

    // Protocol multisigs are shared across all applications
    // They are configured, not generated per-user
    await this.loadProtocolMultisigs();

    this.logger.info('Protocol multisig manager initialized');
  }

  /**
   * Load protocol-level multisigs from config
   * These are shared across all applications
   */
  async loadProtocolMultisigs() {
    const networks = this.config.protocolMultisigs || {};

    for (const [network, msConfig] of Object.entries(networks)) {
      this.multisigs.set(network, {
        type: network,
        network: network,
        protocol: msConfig.protocol,
        address: msConfig.address,
        threshold: msConfig.threshold || 2,
        signers: msConfig.signers || 3,
        status: 'active',
        createdAt: Date.now()
      });
      this.logger.info(`Protocol ${network} multisig loaded: ${this.maskAddress(msConfig.address)} (${msConfig.threshold || 2}-of-${msConfig.signers || 3})`);
    }

    // EVM multisig is the collection point for weekly sweeps
    if (this.evmMultisigAddress) {
      this.multisigs.set('evm', {
        type: 'evm',
        network: 'evm',
        protocol: 'gnosis-safe',
        address: this.evmMultisigAddress,
        threshold: 2,
        signers: 3,
        status: 'active',
        createdAt: Date.now()
      });
      this.logger.info(`EVM collection multisig: ${this.maskAddress(this.evmMultisigAddress)}`);
    }
  }

  /**
   * Calculate monthly payout split
   * Returns how much goes to machine owner vs app developer
   */
  calculatePayoutSplit(totalAmount) {
    const machineOwnerShare = totalAmount * this.revenueSplit.machineOwner;
    const appDeveloperShare = totalAmount * this.revenueSplit.appDeveloper;
    return {
      machineOwner: machineOwnerShare,
      appDeveloper: appDeveloperShare,
      total: totalAmount
    };
  }

  /**
   * Get a multisig address for a network
   */
  getMultisig(network) {
    return this.multisigs.get(network);
  }

  /**
   * Get all multisigs
   */
  getAllMultisigs() {
    return Object.fromEntries(this.multisigs);
  }

  /**
   * Initiate a weekly collection sweep from protocol multisig to EVM multisig
   * Consolidates all network funds into EVM
   */
  async initiateCollectionSweep(network, amount) {
    this.logger.info(`Initiating weekly collection from ${network} to EVM...`);

    const sourceMultisig = this.multisigs.get(network);
    const evmMultisig = this.multisigs.get('evm');
    if (!sourceMultisig || !evmMultisig) {
      throw new Error('Protocol multisig or EVM collection multisig not found');
    }

    const sweepId = `weekly-collect-${network}-${Date.now()}`;
    const scheduledTime = Date.now() + (2 * 24 * 60 * 60 * 1000);

    this.pendingSweeps.set(sweepId, {
      id: sweepId,
      type: 'collection',
      network,
      amount,
      source: sourceMultisig.address,
      target: evmMultisig.address,
      status: 'pending',
      createdAt: Date.now(),
      scheduledAt: scheduledTime,
      denied: false,
      executed: false
    });

    this.logger.info(`Collection sweep ${sweepId} scheduled for ${new Date(scheduledTime).toISOString()}`);
    this.logger.info(`  ${network} -> EVM collection multisig`);
    this.logger.info(`Denial window: 2 days. Execute 'denySweep("${sweepId}")' to cancel.`);

    setTimeout(() => {
      this.executeSweep(sweepId);
    }, 2 * 24 * 60 * 60 * 1000);

    return sweepId;
  }

  /**
   * Initiate a monthly distribution sweep from EVM multisig
   * Funds are split 70% machine owner / 30% app developer
   */
  async initiateDistributionSweep(amount, machineOwnerAddress, appId) {
    this.logger.info('Initiating monthly distribution from EVM multisig...');

    const evmMultisig = this.multisigs.get('evm');
    if (!evmMultisig) {
      throw new Error('EVM collection multisig not found');
    }

    const split = this.calculatePayoutSplit(amount);
    const sweepId = `monthly-dist-${Date.now()}`;
    const scheduledTime = Date.now() + (2 * 24 * 60 * 60 * 1000);

    this.pendingSweeps.set(sweepId, {
      id: sweepId,
      type: 'distribution',
      amount,
      source: evmMultisig.address,
      machineOwner: machineOwnerAddress,
      machineOwnerShare: split.machineOwner,
      appDeveloperShare: split.appDeveloper,
      appId,
      status: 'pending',
      createdAt: Date.now(),
      scheduledAt: scheduledTime,
      denied: false,
      executed: false
    });

    this.logger.info(`Distribution sweep ${sweepId} scheduled for ${new Date(scheduledTime).toISOString()}`);
    this.logger.info(`  Machine owner (${machineOwnerAddress}): ${split.machineOwner}`);
    this.logger.info(`  App developer (${appId}): ${split.appDeveloper}`);
    this.logger.info(`Denial window: 2 days. Execute 'denySweep("${sweepId}")' to cancel.`);

    setTimeout(() => {
      this.executeSweep(sweepId);
    }, 2 * 24 * 60 * 60 * 1000);

    return sweepId;
  }

  /**
   * Deny a pending sweep
   */
  async denySweep(sweepId) {
    const sweep = this.pendingSweeps.get(sweepId);
    if (!sweep) {
      throw new Error('Sweep not found');
    }

    if (sweep.status !== 'pending') {
      throw new Error(`Cannot deny sweep with status: ${sweep.status}`);
    }

    sweep.denied = true;
    sweep.status = 'denied';
    this.logger.info(`Sweep ${sweepId} has been DENIED by multisig`);
    return sweep;
  }

  /**
   * Execute a sweep (called after 2-day window)
   */
  async executeSweep(sweepId) {
    const sweep = this.pendingSweeps.get(sweepId);
    if (!sweep) {
      this.logger.error(`Sweep ${sweepId} not found`);
      return;
    }

    if (sweep.denied) {
      this.logger.info(`Sweep ${sweepId} was denied - skipping execution`);
      return;
    }

    if (sweep.executed) {
      this.logger.warn(`Sweep ${sweepId} already executed`);
      return;
    }

    if (sweep.type === 'collection') {
      this.logger.info(`Executing collection sweep ${sweepId}...`);
      this.logger.info(`  ${sweep.amount} from ${sweep.network} -> EVM collection multisig`);
    } else {
      this.logger.info(`Executing distribution sweep ${sweepId}...`);
      this.logger.info(`  Machine owner (${sweep.machineOwner}): ${sweep.machineOwnerShare}`);
      this.logger.info(`  App developer (${sweep.appId}): ${sweep.appDeveloperShare}`);
    }

    sweep.executed = true;
    sweep.status = 'completed';
    sweep.executedAt = Date.now();

    this.logger.info(`Sweep ${sweepId} completed`);
  }

  /**
   * Get status of all pending sweeps
   */
  getPendingSweeps() {
    return Array.from(this.pendingSweeps.values());
  }

  /**
   * Get status of multisig system
   */
  getStatus() {
    return {
      protocolMultisigs: Object.fromEntries(
        Array.from(this.multisigs.entries()).map(([name, ms]) => [
          name,
          {
            type: ms.type,
            network: ms.network,
            address: this.maskAddress(ms.address),
            threshold: ms.threshold,
            status: ms.status
          }
        ])
      ),
      evmCollectionMultisig: this.evmMultisigAddress ? this.maskAddress(this.evmMultisigAddress) : null,
      revenueSplit: this.revenueSplit,
      pendingSweeps: this.getPendingSweeps().map(s => ({
        id: s.id,
        type: s.type,
        network: s.network,
        amount: s.amount,
        machineOwnerShare: s.machineOwnerShare,
        appDeveloperShare: s.appDeveloperShare,
        status: s.status,
        scheduledAt: s.scheduledAt
      }))
    };
  }

  maskAddress(address) {
    if (!address || address.length < 10) return '***';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }
}
