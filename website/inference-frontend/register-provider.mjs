import { readFileSync } from 'fs';
import sdk from 'casper-js-sdk';

const RPC_URL = 'https://node.testnet.casper.network/rpc';
const CHAIN_NAME = 'casper-test';
const COMPUTE_REGISTRY_HASH = 'bed17bda7a3597725a5d19531faae67bd2f68f08be17d02ea36a6830be2fc152';
const PAYMENT = '50000000000'; // 50 CSPR for session
const PEM_PATH = '/tmp/casper-wallet-new/Account 8_secret_key.pem';

function loadKey() {
  const pem = readFileSync(PEM_PATH, 'utf-8');
  return sdk.PrivateKey.fromPem(pem, sdk.KeyAlgorithm.SECP256K1);
}

async function waitForDeploy(client, deployHash) {
  console.log(`Waiting for deploy ${deployHash}...`);
  for (let i = 0; i < 120; i++) {
    try {
      const res = await client.getDeploy(deployHash);
      const info = res.executionInfo;
      if (info) {
        const er = info.executionResult;
        if (er && er.errorMessage) {
          throw new Error(`Deploy failed: ${er.errorMessage}`);
        }
        if (er && er.cost) {
          console.log(`Deploy executed successfully (cost: ${er.cost})`);
          return true;
        }
      }
    } catch (e) {
      if (e.message?.includes('failed') || e.message?.includes('Deploy failed')) throw e;
    }
    await new Promise(r => setTimeout(r, 5000));
  }
  throw new Error(`Deploy ${deployHash} timed out`);
}

async function main() {
  const key = loadKey();
  const client = new sdk.RpcClient(new sdk.HttpHandler(RPC_URL));
  const pubKey = key.publicKey;
  const pubKeyHex = pubKey.toHex();
  console.log('Public key:', pubKeyHex);
  console.log('Account hash:', pubKey.accountHash().toPrefixedString());

  // Register as provider for all resources
  // task_types bitmask: 1=inference, 2=storage, 4=compute, 8=bandwidth
  // 1|2|4|8 = 15 (all resources)
  const args = sdk.Args.fromMap({
    qvac_peer_id: sdk.CLValue.newCLString('chimera-provider-all-resources'),
    name: sdk.CLValue.newCLString('Chimera Production Provider'),
    task_types: sdk.CLValue.newCLUInt32(15), // all resources
    stake_amount: sdk.CLValue.newCLUInt512('1000000000'), // 1 CSPR minimum stake
  });

  const contractHashObj = sdk.ContractHash.newContract(COMPUTE_REGISTRY_HASH);
  const storedContract = new sdk.StoredContractByHash(contractHashObj, 'register_provider', args);
  const session = new sdk.ExecutableDeployItem();
  session.storedContractByHash = storedContract;
  const paymentItem = sdk.ExecutableDeployItem.standardPayment(PAYMENT);
  const header = sdk.DeployHeader.default();
  header.account = pubKey;
  header.chainName = CHAIN_NAME;
  const deploy = sdk.Deploy.makeDeploy(header, paymentItem, session);
  deploy.sign(key);

  const result = await client.putDeploy(deploy);
  const deployHash = result.deployHash.toHex();
  console.log('Register provider deploy hash:', deployHash);
  await waitForDeploy(client, deployHash);
  console.log('\nProvider registered successfully!');
  console.log('ComputeRegistry contract:', COMPUTE_REGISTRY_HASH);
}

main().catch(e => { console.error(e.message); process.exit(1); });
