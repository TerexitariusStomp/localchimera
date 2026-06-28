import { Logger } from '../core/Logger.js';

export class CasperUnifiedBridge {
  constructor(config, layers) {
    this.config = config || {};
    this.layers = layers || {};
    this.logger = new Logger('CasperUnifiedBridge');
    this.isRunning = false;
  }

  async initialize() {
    this.logger.info('CasperUnifiedBridge initialized (disabled in config)');
  }

  async start() {
    this.isRunning = true;
    this.logger.info('CasperUnifiedBridge started (disabled in config)');
  }

  async startMonitoring() {
    this.isRunning = true;
    this.logger.info('CasperUnifiedBridge monitoring started (disabled in config)');
  }

  async stop() {
    this.isRunning = false;
    this.logger.info('CasperUnifiedBridge stopped');
  }

  getStatus() {
    return { running: this.isRunning, enabled: false };
  }

  async onInferenceTask(task) {
    this.logger.info('CasperUnifiedBridge onInferenceTask called (disabled in config)');
  }
}
