/**
 * AI Writer Integration Example
 *
 * This example demonstrates how the AI Writer application integrates
 * with the QVAC-Pear Miner Node for collaborative content generation.
 *
 * Usage:
 * - Active session: AI Writer uses device for LLM inference and wiki generation
 * - Idle session: Node earns from multi-protocol mining
 * - Miners monitor in parallel for immediate inference task detection
 */

import { NodeManager } from '../src/core/NodeManager.js';
import { Logger } from '../src/core/Logger.js';
import { promises as fs } from 'fs';
import path from 'path';

const logger = new Logger('AIWriterIntegration');

class AIWriterIntegration {
  constructor(nodeManager) {
    this.nodeManager = nodeManager;
    this.isSessionActive = false;
    this.idleTimeout = null;
    this.idleDelayMs = 300000; // 5 minutes
  }

  async initialize() {
    logger.info('Initializing AI Writer integration...');

    // Listen for session events
    this.nodeManager.on('inferenceTask', (task) => {
      this.handleInferenceTask(task);
    });

    logger.info('AI Writer integration initialized');
  }

  startSession() {
    logger.info('✍️  AI Writer session started');
    this.isSessionActive = true;
    this.clearIdleTimer();

    // Notify miners to reduce resource usage
    if (this.nodeManager.minerManager) {
      this.nodeManager.minerManager.setLowPowerMode(true);
    }
  }

  endSession() {
    logger.info('AI Writer session ended. Starting idle timer...');
    this.clearIdleTimer();
    this.idleTimeout = setTimeout(() => {
      this.isSessionActive = false;
      logger.info('Device idle. Miners resuming full operation.');
      if (this.nodeManager.minerManager) {
        this.nodeManager.minerManager.setLowPowerMode(false);
      }
    }, this.idleDelayMs);
  }

  clearIdleTimer() {
    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
      this.idleTimeout = null;
    }
  }

  async generate({ prompt, title = '', model = 'llama-2-7b' }) {
    if (!this.isSessionActive) {
      this.startSession();
    }

    logger.info(`Generating content: "${title || prompt.slice(0, 40)}..."`);

    const inferenceLayer = this.nodeManager.inferenceLayer;
    const result = await inferenceLayer.handleInferenceRequest({
      model,
      prompt: `Write a wiki article titled "${title}" about: ${prompt}`
    });

    // Save to distributed wiki via Hypercore
    const wikiEntry = {
      title,
      prompt,
      content: result.text,
      wordCount: result.text.split(/\s+/).length,
      model,
      timestamp: Date.now(),
      nodeId: this.nodeManager.nodeId
    };

    logger.info(`Generated ${wikiEntry.wordCount} words`);
    return wikiEntry;
  }

  handleInferenceTask(task) {
    logger.info(`Inference task detected: ${task.id || 'unknown'}`);
    // AI Writer can display real-time task status in the UI
  }

  getStatus() {
    return {
      sessionActive: this.isSessionActive,
      idleTimerRunning: !!this.idleTimeout,
      nodeStatus: this.nodeManager.getStatus()
    };
  }
}

// Example usage
async function main() {
  try {
    logger.info('Starting AI Writer integration example...');

    // Load config
    const configPath = path.join(process.cwd(), 'config.json');
    const configContent = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    // Initialize node manager
    const nodeManager = new NodeManager(config);
    await nodeManager.initialize();
    await nodeManager.start();

    // Initialize AI Writer integration
    const aiWriter = new AIWriterIntegration(nodeManager);
    await aiWriter.initialize();

    // Simulate a writing session
    aiWriter.startSession();
    const result = await aiWriter.generate({
      prompt: 'Explain how decentralized AI inference works',
      title: 'Decentralized AI Inference',
      model: 'llama-2-7b'
    });
    logger.info('Generated article:', result.title, `${result.wordCount} words`);

    // End session and let miners resume
    aiWriter.endSession();

    // Keep running
    process.on('SIGINT', async () => {
      logger.info('Shutting down...');
      aiWriter.clearIdleTimer();
      await nodeManager.stop();
      process.exit(0);
    });

  } catch (error) {
    logger.error('Error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { AIWriterIntegration };
