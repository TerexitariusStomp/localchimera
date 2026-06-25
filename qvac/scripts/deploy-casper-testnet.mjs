import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import sdk from 'casper-js-sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CHAIN_NAME = 'casper-test';
const RPC_URL = 'https://node.testnet.casper.network/rpc';
const PAYMENT = '100000000000'; // 100 CSPR for contract install
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
      const info = await client.getDeploy(deployHash);
      if (info.deploy?.executionResults?.length > 0) {
        const er = info.deploy.executionResults[0];
        const result = er.result?.ExecutionResult;
        if (result?.Failure) {
          throw new Error(`Deploy failed: ${result.Failure.error_message}`);
        }
        console.log(`  Executed. Cost: ${result?.Success?.cost || 'unknown'}`);
        return info;
      }
    } catch (e) {
      if (e.message?.includes('Deploy failed')) throw e;
    }
    await new Promise(r => setTimeout(r, 5000));
  }
  throw new Error(`Deploy ${deployHash} did not finalize in time`);
}

async function getContractHash(client, accountHash, namedKey) {
  const entity = await client.getLatestEntity(accountHash);
  const nk = entity.entity?.namedKeys?.find(n => n.name === namedKey);
  if (!nk) throw new Error(`Named key "${namedKey}" not found`);
  return nk.key.toString();
}

async function deployContract(name, client, key, args) {
  const wasmPath = join(WASM_DIR, `${name}.wasm`);
  if (!existsSync(wasmPath)) throw new Error(`WASM not found: ${wasmPath}`);
  const wasmBytes = readFileSync(wasmPath);
  const session = sdk.ExecutableDeployItem.newModuleBytes(wasmBytes, args);
  const hash = await sendDeploy(client, key, session);
  console.log(`  Deploy hash: ${hash}`);
  await waitForDeploy(client, hash);
  const accountHash = key.publicKey.accountHash().toPrefixedString();
  const contractHash = await getContractHash(client, accountHash, `${name}_hash`);
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
  console.log('Deployer:', accountHash);

  const feeBps = 250; // 2.5%
  const owner = sdk.CLValue.newCLByteArray(key.publicKey.accountHash().hashBytes);

  const contracts = {};

  // Deploy inference_market
  console.log('\nDeploying inference_market...');
  contracts.inferenceMarket = await deployContract('inference_market', client, key, sdk.Args.fromMap({
    owner, fee_recipient: owner, fee_bps: sdk.CLValue.newCLUint64(feeBps),
  }));

  // Deploy storage_market
  console.log('\nDeploying storage_market...');
  contracts.storageMarket = await deployContract('storage_market', client, key, sdk.Args.fromMap({
    owner, fee_recipient: owner, fee_bps: sdk.CLValue.newCLUint64(feeBps),
  }));

  // Deploy compute_market
  console.log('\nDeploying compute_market...');
  contracts.computeMarket = await deployContract('compute_market', client, key, sdk.Args.fromMap({
    owner, fee_recipient: owner, fee_bps: sdk.CLValue.newCLUint64(feeBps),
  }));

  // Deploy bandwidth_market
  console.log('\nDeploying bandwidth_market...');
  contracts.bandwidthMarket = await deployContract('bandwidth_market', client, key, sdk.Args.fromMap({
    owner, fee_recipient: owner, fee_bps: sdk.CLValue.newCLUint64(feeBps),
  }));

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
