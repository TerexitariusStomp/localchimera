/**
 * MonthlyDistributor
 * Scheduled job that runs monthly to compute payout manifests
 * and prepare distribution transactions.
 *
 * In production, this triggers the actual EVM multisig distribution.
 * For now it produces a distribution manifest that can be executed.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { PayoutRouter } from './PayoutRouter.js';
import { Logger } from '../core/Logger.js';

const logger = new Logger('MonthlyDistributor');

export class MonthlyDistributor {
  constructor(payoutRouter = null) {
    this.payoutRouter = payoutRouter || new PayoutRouter();
    this.intervalMs = 60 * 60 * 1000; // check every hour
    this.timer = null;
  }

  start() {
    logger.info('MonthlyDistributor started — checking every hour');
    this.check(); // immediate check
    this.timer = setInterval(() => this.check(), this.intervalMs);
  }

  stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    logger.info('MonthlyDistributor stopped');
  }

  async check() {
    const now = new Date();
    const isFirstOfMonth = now.getUTCDate() === 1;
    const isMidnight = now.getUTCHours() === 0;
    if (!isFirstOfMonth || !isMidnight) return;

    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1; // current month = 1-based
    // We calculate the PREVIOUS month's payouts on the 1st
    const targetMonth = month === 1 ? 12 : month - 1;
    const targetYear = month === 1 ? year - 1 : year;

    logger.info(`[monthly] Running distribution for ${targetYear}-${String(targetMonth).padStart(2, '0')}`);

    try {
      // 1. Calculate manifest
      const calcResult = await this.payoutRouter.calculateMonthlyPayout(targetYear, targetMonth);
      if (!calcResult.success) {
        logger.error(`[monthly] Calculation failed: ${calcResult.error}`);
        return;
      }
      const manifest = calcResult.manifest;
      logger.info(`[monthly] Manifest: ${manifest.totalOrders} orders, ${manifest.totalRevenue.toFixed(6)} total`);

      // 2. Initialize distribution with denial window
      const initResult = await this.payoutRouter.markDistributed(targetYear, targetMonth, null);
      if (!initResult.success) {
        logger.error(`[monthly] Failed to initialize distribution: ${initResult.error}`);
        return;
      }
      logger.info(`[monthly] Distribution ${targetYear}-${String(targetMonth).padStart(2, '0')} — status: calculated, denial window: 168 hours (7 days)`);

      // 3. Write transparency plan file — aggregate per wallet from manifest
      const byWallet = {};
      for (const d of manifest.distributions) {
        byWallet[d.developerEVM] = (byWallet[d.developerEVM] || 0) + d.devAmount;
        byWallet[d.machineOwnerEVM] = (byWallet[d.machineOwnerEVM] || 0) + d.userAmount;
      }
      const recipients = Object.entries(byWallet)
        .map(([address, amount]) => ({ address, amount: parseFloat(amount.toFixed(6)) }))
        .filter(x => x.amount > 0);

      const dir = path.join(process.cwd(), 'data', 'payouts');
      await fs.mkdir(dir, { recursive: true });
      const file = path.join(dir, `distribution-${targetYear}-${String(targetMonth).padStart(2, '0')}.json`);
      await fs.writeFile(file, JSON.stringify({
        year: targetYear, month: targetMonth,
        generatedAt: Date.now(), denialWindowHours: 168, status: 'calculated',
        totalRevenue: manifest.totalRevenue, totalRecipients: recipients.length, recipients
      }, null, 2), 'utf-8');
      logger.info(`[monthly] Distribution plan saved to ${file}`);

      // 4. Check if we can auto-execute (only if window already expired, e.g. test scenario)
      const statusResult = await this.payoutRouter.getDistributionStatus(targetYear, targetMonth);
      if (statusResult.autoExecuted) {
        logger.info(`[monthly] Distribution ${targetYear}-${String(targetMonth).padStart(2, '0')} AUTO-EXECUTED — no denial within window`);
      }

    } catch (err) {
      logger.error(`[monthly] Error: ${err.message}`);
    }
  }
}
