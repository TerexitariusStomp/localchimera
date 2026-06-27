import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import sdk from 'casper-js-sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CHAIN_NAME = 'casper-test';
const RPC_URL = 'https://node.testnet.casper.network/rpc';
const PAYMENT = '500000000000'; // 500 CSPR for contract install (large WASM)
const WASM_DIR = '/home/user/CascadeProjects/qvac-chimera/contracts-casper/target/wasm32-unknown-unknown/release';
const PEM_PATH = process.env.CSPR_PEM_PATH || join(process.env.HOME, '.chimera/protocol_key.pem');
const CONFIG_OUT = join(__dirname, '..', 'config', 'casper-contracts.json');

function loadKey() {
  if (!existsSync(PEM_PATH)) throw new Error(`PEM not found: ${PEM_PATH}`);
  const pem = readFileSync(PEM_PATH, 'utf-8');
  return sdk.PrivateKey.fromPem(pem, sdk.KeyAlgorithm.SECP256K1);
}

async function sendDeploy(client, key, session) {
  const payment = sdk.ExecutableDeployItem.standardPayment(PAYMENT);
  const header = sdk.DeployHeader.default();
  header.account = key.publicKey;
  header.chainName = CHAIN_NAME;
  const deploy = sdk.Deploy.makeDeploy(header, payment, session);
  deploy.sign(key);
  const result = await client.putDeploy(deploy);
  return result.deployHash.toHex ? result.deployHash.toHex() : String(result.deployHash);
}

async function waitForDeploy(client, deployHash) {
  console.log(`  Waiting for ${deployHash}...`);
  for (let i = 0; i < 360; i++) { // 30 min max wait
    try {
      // Use raw RPC for protocol 2.0 compatibility
      const resp = await fetch(RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0', id: 1,
          method: 'info_get_deploy',
          params: { deploy_hash: deployHash },
        }),
      });
      const data = await resp.json();
      const ei = data.result?.execution_info;
      if (ei) {
        const er = ei.execution_result?.Version2;
        if (er?.error_message) {
          throw new Error(`Deploy failed: ${er.error_message}`);
        }
        console.log(`  Executed. Cost: ${er?.cost || 'unknown'}, Gas consumed: ${parseInt(er?.consumed || '0') / 1e9} CSPR`);
        return data.result;
      }
    } catch (e) {
      if (e.message?.includes('Deploy failed')) throw e;
    }
    await new Promise(r => setTimeout(r, 5000));
  }
  throw new Error(`Deploy ${deployHash} did not finalize in time`);
}

async function getContractHash(client, accountHash, namedKey, publicKeyHex) {
  // Use raw RPC to get account info (protocol 2.0 compatible)
  const response = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 1,
      method: 'state_get_account_info',
      params: { public_key: publicKeyHex },
    }),
  });
  const data = await response.json();
  const namedKeys = data.result?.account?.named_keys || [];
  const nk = namedKeys.find(n => n.name === namedKey);
  if (!nk) throw new Error(`Named key "${namedKey}" not found. Available: ${namedKeys.map(k => k.name).join(', ')}`);
  return nk.key;
}

async function deployContract(name, client, key, args, publicKeyHex) {
  const wasmPath = join(WASM_DIR, `${name}.wasm`);
  if (!existsSync(wasmPath)) throw new Error(`WASM not found: ${wasmPath}`);
  const wasmBytes = readFileSync(wasmPath);
  const session = sdk.ExecutableDeployItem.newModuleBytes(wasmBytes, args);
  const hash = await sendDeploy(client, key, session);
  console.log(`  Deploy hash: ${hash}`);
  await waitForDeploy(client, hash);
  const accountHash = key.publicKey.accountHash().toPrefixedString();
  const contractHash = await getContractHash(client, accountHash, `${name}_hash`, publicKeyHex);
  console.log(`  Contract hash: ${contractHash}`);
  return { deployHash: hash, contractHash };
}

async function main() {
  console.log('='.repeat(60));
  console.log('Casper Testnet Contract Deployment');
  console.log(`Chain: ${CHAIN_NAME}`);
  console.log(`RPC:   ${RPC_URL}`);
  console.log(`Key:   ${PEM_PATH}`);
  console.log('='.repeat(60));

  const key = loadKey();
  const client = new sdk.RpcClient(new sdk.HttpHandler(RPC_URL));
  const accountHash = key.publicKey.accountHash().toPrefixedString();
  const publicKeyHex = key.publicKey.toHex();
  console.log('Deployer:', accountHash);

  const feeBps = 250; // 2.5%
  const owner = sdk.CLValue.newCLByteArray(key.publicKey.accountHash().hashBytes);

  const contracts = {};

  // inference_market already deployed - use existing contract hash
  console.log('\ninference_market already deployed, using existing contract hash...');
  contracts.inferenceMarket = {
    deployHash: '4d98c92d2e114a1f74c74618c9c0861cdf6ebfbdb128f2a41baec3ce851e95ff',
    contractHash: 'hash-663812cfe4103b9d1584e3caccf7be9188e4c6c5f77851dacb64b8f308947f82',
  };
  console.log(`  Contract hash: ${contracts.inferenceMarket.contractHash}`);

  // storage_market already deployed - use existing contract hash
  console.log('\nstorage_market already deployed, using existing contract hash...');
  contracts.storageMarket = {
    deployHash: '7a2c65cc78e25f4f3d7b99663e37b7bd3fced85a6c8bee830a3b6295d6089863',
    contractHash: 'hash-',
  };
  // Get the actual storage_market hash from account named keys
  {
    const resp = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'state_get_account_info', params: { public_key: publicKeyHex } }),
    });
    const data = await resp.json();
    const nk = data.result?.account?.named_keys?.find(n => n.name === 'storage_market_hash');
    if (nk) {
      contracts.storageMarket.contractHash = nk.key;
      console.log(`  Contract hash: ${nk.key}`);
    } else {
      console.log(`  WARNING: storage_market_hash named key not found`);
    }
  }

  // Deploy compute_market
  console.log('\nDeploying compute_market...');
  contracts.computeMarket = await deployContract('compute_market', client, key, sdk.Args.fromMap({
    owner, fee_recipient: owner, fee_bps: sdk.CLValue.newCLUint64(feeBps),
  }), publicKeyHex);

  // Deploy bandwidth_market
  console.log('\nDeploying bandwidth_market...');
  contracts.bandwidthMarket = await deployContract('bandwidth_market', client, key, sdk.Args.fromMap({
    owner, fee_recipient: owner, fee_bps: sdk.CLValue.newCLUint64(feeBps),
  }), publicKeyHex);

  // Save config
  const configDir = dirname(CONFIG_OUT);
  if (!existsSync(configDir)) mkdirSync(configDir, { recursive: true });
  const config = {
    network: CHAIN_NAME,
    rpcUrl: RPC_URL,
    deployedAt: new Date().toISOString(),
    deployerAccount: accountHash,
    contracts: {},
    deployHashes: {},
  };
  for (const [name, info] of Object.entries(contracts)) {
    config.contracts[name] = info.contractHash;
    config.deployHashes[name] = info.deployHash;
  }
  writeFileSync(CONFIG_OUT, JSON.stringify(config, null, 2));

  console.log('\n' + '='.repeat(60));
  console.log('Deployment complete!');
  console.log('Config saved to:', CONFIG_OUT);
  console.log('='.repeat(60));
  for (const [name, info] of Object.entries(contracts)) {
    console.log(`  ${name}: ${info.contractHash}`);
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
