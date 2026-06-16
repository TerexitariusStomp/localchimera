#!/usr/bin/env node

/**
 * Monthly Fund Sweep Script
 *
 * Distributes funds from the EVM collection multisig.
 * Step 2 of the two-sweep architecture: weekly collects to EVM, monthly distributes.
 * Funds are split 70% machine owner / 30% app developer.
 * Includes a 2-day denial window.
 *
 * Usage:
 *   node scripts/monthly-fund-sweep.js
 *   node scripts/monthly-fund-sweep.js --dry-run
 *   node scripts/monthly-fund-sweep.js --deny <sweep-id>
 */

import { Logger } from '../src/core/Logger.js';
import { MultisigManager } from '../src/core/MultisigManager.js';

const logger = new Logger('MonthlyFundSweep');

// Parse CLI args
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const denyIndex = args.indexOf('--deny');
const denySweepId = denyIndex !== -1 ? args[denyIndex + 1] : null;

async function main() {
  logger.info('========================================');
  logger.info('Monthly Fund Sweep Starting');
  logger.info('========================================');

  // Load config
  let config;
  try {
    const configModule = await import('../config.json', { assert: { type: 'json' } });
    config = configModule.default;
  } catch (error) {
    logger.error('Failed to load config.json:', error.message);
    process.exit(1);
  }

  const msConfig = config.multisig;
  if (!msConfig || !msConfig.enabled) {
    logger.error('Multisig not enabled in config');
    process.exit(1);
  }

  // Initialize multisig manager with protocol addresses
  const multisigManager = new MultisigManager(msConfig);
  await multisigManager.initialize();

  // Handle denial request
  if (denySweepId) {
    logger.info(`Processing denial for sweep: ${denySweepId}`);
    try {
      await multisigManager.denySweep(denySweepId);
      logger.info(`Sweep ${denySweepId} has been denied successfully`);
    } catch (error) {
      logger.error(`Failed to deny sweep: ${error.message}`);
      process.exit(1);
    }
    process.exit(0);
  }

  // Display protocol multisig status
  const status = multisigManager.getStatus();
  logger.info('Protocol Multisig Status:');
  for (const [network, ms] of Object.entries(status.protocolMultisigs)) {
    logger.info(`  ${network}: ${ms.address} (${ms.threshold}-of-3)`);
  }
  logger.info(`EVM Collection: ${status.evmCollectionMultisig || 'not configured'}`);
  logger.info(`Revenue Split: ${(status.revenueSplit.machineOwner * 100).toFixed(0)}% machine owner / ${(status.revenueSplit.appDeveloper * 100).toFixed(0)}% app developer`);

  if (isDryRun) {
    logger.info('');
    logger.info('DRY RUN MODE - No transactions will be executed');
    logger.info('');
  }

  // Query EVM collection multisig balance
  const evmBalance = await queryEVMBalance(multisigManager, isDryRun);

  if (evmBalance <= 0) {
    logger.info('No funds in EVM collection multisig to distribute this month.');
    logger.info('========================================');
    process.exit(0);
  }

  logger.info('');
  logger.info(`EVM collection balance: ${evmBalance}`);
  logger.info('');
  logger.info('Initiating monthly distribution from EVM multisig (2-day denial window)...');
  logger.info('');

  await initiateDistributionSweep(evmBalance, msConfig, multisigManager, isDryRun);

  // Display pending sweeps
  const pendingSweeps = multisigManager.getPendingSweeps();
  if (pendingSweeps.length > 0) {
    logger.info('');
    logger.info('Pending Distribution Sweeps:');
    for (const sweep of pendingSweeps) {
      const scheduledDate = new Date(sweep.scheduledAt);
      logger.info(`  ${sweep.id}:`);
      logger.info(`    Source: EVM collection multisig`);
      logger.info(`    Total: ${sweep.amount}`);
      logger.info(`    Machine Owner (${sweep.machineOwner}): ${sweep.machineOwnerShare}`);
      logger.info(`    App Developer (${sweep.appId}): ${sweep.appDeveloperShare}`);
      logger.info(`    Scheduled: ${scheduledDate.toISOString()}`);
      logger.info(`    Deny command: node scripts/monthly-fund-sweep.js --deny ${sweep.id}`);
    }
  }

  logger.info('');
  logger.info('Monthly Distribution Sweep Complete');
  logger.info('========================================');
}

/**
 * Query EVM collection multisig balance
 */
async function queryEVMBalance(multisigManager, isDryRun) {
  const evmMultisig = multisigManager.getMultisig('evm');
  if (!evmMultisig) {
    logger.warn('No EVM collection multisig found');
    return 0;
  }

  // In production, query the EVM chain for balance
  // For now, simulate
  await new Promise(resolve => setTimeout(resolve, 500));
  const simulatedBalance = isDryRun ? 0.01 : parseFloat((Math.random() * 0.05).toFixed(6));
  return simulatedBalance;
}

/**
 * Initiate a distribution sweep from EVM multisig (70/30 split)
 */
async function initiateDistributionSweep(amount, msConfig, multisigManager, isDryRun) {
  if (isDryRun) {
    logger.info(`[DRY RUN] Would distribute ${amount} from EVM collection multisig`);
    return;
  }

  try {
    const machineOwner = msConfig.machineOwnerAddress || 'unknown';
    const appId = 'protocol-default';
    const sweepId = await multisigManager.initiateDistributionSweep(amount, machineOwner, appId);
    logger.info(`Distribution sweep initiated: ${sweepId}`);
    logger.info(`  Amount: ${amount}`);
    logger.info(`  Machine owner: ${machineOwner}`);
    logger.info(`  Deny window: 2 days`);
  } catch (error) {
    logger.error(`Failed to initiate distribution sweep: ${error.message}`);
  }
}

function getNetworkToken(network) {
  const tokens = {
    nostr: 'sats',
    bittensor: 'TAO'
  };
  return tokens[network] || 'tokens';
}

main().catch(error => {
  logger.error('Unhandled error:', error);
  process.exit(1);
});
