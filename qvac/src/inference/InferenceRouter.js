import { Logger } from '../core/Logger.js';

export class InferenceRouter {
  constructor(qvacInferenceLayer, relayServer = null) {
    this.qvacInference = qvacInferenceLayer;
    this.relay = relayServer;
    this.logger = new Logger('InferenceRouter');
    this.activeRoutes = new Map();
    this.isRunning = false;
  }

  async initialize() {
    this.logger.info('Initializing centralized inference router...');
    this.logger.info('All miners will route through single QVAC inference instance');
    this.isRunning = true;
    this.logger.info('Centralized inference router initialized');
  }

  async routeInferenceRequest(task, minerName) {
    if (!this.isRunning) {
      throw new Error('Inference router not running');
    }

    this.logger.info(`Routing inference request from ${minerName}: ${task.id || 'unknown'}`);

    const routeId = `${minerName}-${task.id || Date.now()}`;
    
    // Try mobile devices first if relay is available and has connected devices
    if (this.relay && this.relay.getConnectedDevices().length > 0) {
      try {
        const deviceId = this.selectDevice();
        this.logger.info(`Forwarding inference to mobile device: ${deviceId}`);
        const result = await this.relay.forwardInference(deviceId, task.prompt || task.input || '', task.maxTokens || 128);
        
        this.logger.info(`Mobile inference completed for ${minerName} via ${deviceId}: ${routeId}`);
        this.relay.recordEarning(deviceId, minerName, task.id || routeId);
        
        return {
          success: true,
          routeId,
          miner: minerName,
          device: deviceId,
          source: 'mobile',
          result: { output: result.output, tokens: result.tokensGenerated }
        };
      } catch (relayError) {
        this.logger.warn(`Mobile inference failed, falling back to local: ${relayError.message}`);
      }
    }
    
    try {
      // Route through the centralized QVAC inference layer
      const result = await this.qvacInference.handleInferenceRequest({
        ...task,
        source: minerName,
        routeId
      });

      this.logger.info(`Inference completed for ${minerName}: ${routeId}`);
      
      return {
        success: true,
        routeId,
        miner: minerName,
        source: 'local',
        result
      };
    } catch (error) {
      this.logger.error(`Inference failed for ${minerName}: ${error.message}`);
      return {
        success: false,
        routeId,
        miner: minerName,
        error: error.message
      };
    }
  }

  selectDevice() {
    const devices = this.relay.getConnectedDevices();
    // Round-robin selection
    return devices[Math.floor(Math.random() * devices.length)];
  }

  async start() {
    if (this.isRunning) {
      this.logger.warn('Inference router already running');
      return;
    }
    
    this.logger.info('Starting centralized inference router...');
    this.isRunning = true;
    this.logger.info('Centralized inference router started');
  }

  async stop() {
    this.logger.info('Stopping centralized inference router...');
    this.isRunning = false;
    this.activeRoutes.clear();
    this.logger.info('Centralized inference router stopped');
  }

  getStatus() {
    return {
      running: this.isRunning,
      activeRoutes: this.activeRoutes.size,
      qvacInferenceStatus: this.qvacInference?.getStatus() || null
    };
  }
}
