import { config } from 'dotenv';
config();

import { CasperEscrowBridge } from '../src/miners/CasperEscrowBridge.js';
import { QVACInferenceLayer } from '../src/inference/QVACInferenceLayer.js';

async function main() {
  console.log('=== QVAC Casper Escrow Bridge ===');
  console.log('This bridge polls the Casper testnet escrow vault for pending jobs,');
  console.log('routes them to the QVAC inference layer, and completes the payment flow.');
  console.log('');

  // Load config — support inline PEM or file path
  let providerKeyPem = process.env.CASPER_PROVIDER_KEY_PEM;
  if (!providerKeyPem && process.env.CASPER_PROVIDER_KEY_PEM_PATH) {
    const { readFileSync } = await import('fs');
    providerKeyPem = readFileSync(process.env.CASPER_PROVIDER_KEY_PEM_PATH, 'utf8');
  }

  const bridgeConfig = {
    providerKeyPem,
  };

  if (!bridgeConfig.providerKeyPem) {
    console.error('ERROR: CASPER_PROVIDER_KEY_PEM or CASPER_PROVIDER_KEY_PEM_PATH not set in .env');
    process.exit(1);
  }

  // Initialize inference layer
  const inferenceConfig = {
    qvac: {
      endpoint: 'local',
      models: ['llama-3.2-1b-instruct'],
      modelConst: 'LLAMA_3_2_1B_INST_Q4_0',
      maxConcurrent: 4,
    },
    idleTimeout: 300000,
  };

  const inferenceLayer = new QVACInferenceLayer(inferenceConfig);
  await inferenceLayer.initialize();
  await inferenceLayer.start();
  console.log('QVAC inference layer started');

  // Initialize bridge
  const bridge = new CasperEscrowBridge(bridgeConfig, inferenceLayer);
  await bridge.initialize();

  console.log('');
  console.log('Provider account:', bridge.providerAccountHash);
  console.log('Balance:', await bridge.getAccountBalance(bridge.providerAccountHash));
  console.log('');

  if (process.argv.includes('--info')) {
    console.log('Run without --info to start polling');
    await bridge.stop();
    await inferenceLayer.stop();
    process.exit(0);
  }

  console.log('Starting job polling... (Ctrl+C to stop)');
  await bridge.start();

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await bridge.stop();
    await inferenceLayer.stop();
    process.exit(0);
  });

  // Keep alive
  setInterval(() => {
    const status = bridge.getStatus();
    console.log(`[status] running=${status.running} processed=${status.processedJobs}`);
  }, 30000);
}

main().catch((e) => {
  console.error('Fatal error:', e.message);
  process.exit(1);
});
