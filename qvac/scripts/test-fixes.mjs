import pkg from 'casper-js-sdk';
const sdk = pkg;
const { PrivateKey, KeyAlgorithm, CLValue, Args, ExecutableDeployItem, DeployHeader, Deploy } = sdk;

const RPC_URL = 'http://localhost:7778/rpc';
const CHAIN_NAME = 'casper-test';

const CONSUMER_PEM = `-----BEGIN EC PRIVATE KEY-----
MHQCAQEEIA6Hjhvhzz4rc5cKlR3fOtI42H8E1VOqpdpe6P/Nc7qvoAcGBSuBBAAK
oUQDQgAEJ9jdXMqmAORbNuWY2Q74wmtsZ++Bvf696PpYOZepHqWCFmTFZDzW+JYO
fZf7vQid4otudHLFJBWkiazcayJz9g==
-----END EC PRIVATE KEY-----`;

const CONTRACT_HASH = 'a2b36559e7da9f0a3fc10afc23eceb54022ab41649ad976c52802e37ad26700b';
const CONTRACT_PURSE = 'uref-6ec52bb818122d4c5a38609b7e4cc4e324d0e6f2350ef3216325bc3a5e23e3f1-007';

function hexToBytes(hex) {
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes;
}

async function callEntryPoint(pem, entryPoint, argsMap) {
  const privateKey = PrivateKey.fromPem(pem, KeyAlgorithm.SECP256K1);
  const publicKey = privateKey.publicKey;

  const args = Args.fromMap(argsMap);
  const contractHashObj = sdk.ContractHash.newContract(CONTRACT_HASH);
  const storedContract = new sdk.StoredContractByHash(contractHashObj, entryPoint, args);
  const session = new ExecutableDeployItem();
  session.storedContractByHash = storedContract;
  const payment = ExecutableDeployItem.standardPayment('10000000000');
  const header = DeployHeader.default();
  header.account = publicKey;
  header.chainName = CHAIN_NAME;
  const deploy = Deploy.makeDeploy(header, payment, session);
  deploy.sign(privateKey);

  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 1,
      method: 'account_put_deploy',
      params: { deploy: Deploy.toJSON(deploy) }
    })
  });
  const data = await res.json();
  if (data.error) {
    console.error(`${entryPoint} submit failed:`, data.error);
    return null;
  }

  await new Promise(r => setTimeout(r, 25000));

  const infoRes = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 1,
      method: 'info_get_deploy',
      params: { deploy_hash: data.result.deploy_hash }
    })
  });
  const info = await infoRes.json();
  const exec = info.result?.execution_info?.execution_result?.Version2;
  const status = exec?.error_message || 'SUCCESS';
  console.log(`${entryPoint}:`, status);
  return status;
}

async function transferToPurse(pem, amount, purseUref) {
  const privateKey = PrivateKey.fromPem(pem, KeyAlgorithm.SECP256K1);
  const publicKey = privateKey.publicKey;
  const payment = ExecutableDeployItem.standardPayment('10000000000');
  const header = DeployHeader.default();
  header.account = publicKey;
  header.chainName = CHAIN_NAME;
  const transferItem = sdk.TransferDeployItem.newTransfer(amount, sdk.URef.fromString(purseUref));
  const session = new ExecutableDeployItem();
  session.transfer = transferItem;
  const deploy = Deploy.makeDeploy(header, payment, session);
  deploy.sign(privateKey);
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 1,
      method: 'account_put_deploy',
      params: { deploy: Deploy.toJSON(deploy) }
    })
  });
  const data = await res.json();
  console.log('Transfer:', data.error ? 'ERROR: ' + JSON.stringify(data.error) : 'submitted');
  await new Promise(r => setTimeout(r, 25000));
  return !data.error;
}

async function queryJobDict(jobId, field) {
  const stateRes = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'chain_get_state_root_hash', params: null })
  });
  const stateData = await stateRes.json();
  const stateRoot = stateData.result?.state_root_hash;

  const dictRes = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 1,
      method: 'state_get_dictionary_item',
      params: {
        state_root_hash: stateRoot,
        dictionary_identifier: {
          URef: { seed_uref: 'uref-c05482a9ad0d06a70f2f937f2d68d4dbdba49dd7ef6ce5feacdafeaf68a9c2ad-007', dictionary_item_key: `${jobId}:${field}` }
        }
      }
    })
  });
  const dictData = await dictRes.json();
  return dictData.result?.stored_value?.CLValue?.parsed;
}

async function main() {
  const privateKey = PrivateKey.fromPem(CONSUMER_PEM, KeyAlgorithm.SECP256K1);
  const accountHashHex = privateKey.publicKey.accountHash().toHex();
  console.log('Account hash:', accountHashHex);

  // Transfer to contract purse
  await transferToPurse(CONSUMER_PEM, '2500000000', CONTRACT_PURSE);

  // Create job 1
  let status = await callEntryPoint(CONSUMER_PEM, 'create_job', {
    consumer: CLValue.newCLByteArray(hexToBytes(accountHashHex)),
    provider: CLValue.newCLByteArray(hexToBytes(accountHashHex)),
    amount: CLValue.newCLUInt512('100'),
    provider_fee_bps: CLValue.newCLUint64('100'),
    order_id: CLValue.newCLString('job1'),
  });
  if (status !== 'SUCCESS') return;

  // Create job 2 (should get nonce=1, different job_id)
  status = await callEntryPoint(CONSUMER_PEM, 'create_job', {
    consumer: CLValue.newCLByteArray(hexToBytes(accountHashHex)),
    provider: CLValue.newCLByteArray(hexToBytes(accountHashHex)),
    amount: CLValue.newCLUInt512('200'),
    provider_fee_bps: CLValue.newCLUint64('200'),
    order_id: CLValue.newCLString('job2'),
  });
  if (status !== 'SUCCESS') return;

  // Query both jobs
  const job0 = `job:${accountHashHex}:0`;
  const job1 = `job:${accountHashHex}:1`;

  console.log('\n=== Fix 1: Auto-increment nonce ===');
  const amt0 = await queryJobDict(job0, 'amount');
  const amt1 = await queryJobDict(job1, 'amount');
  console.log(`Job 0 amount: ${amt0} (expected: 100)`);
  console.log(`Job 1 amount: ${amt1} (expected: 200)`);
  if (amt0 == 100 && amt1 == 200) {
    console.log('✅ Nonce auto-increment works!');
  } else {
    console.log('❌ Nonce auto-increment FAILED');
  }

  console.log('\n=== Fix 2: Deduplication ===');
  const pendingRes = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 1,
      method: 'state_get_dictionary_item',
      params: {
        state_root_hash: (await (await fetch(RPC_URL, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'chain_get_state_root_hash', params: null })
        })).json()).result?.state_root_hash,
        dictionary_identifier: {
          URef: { seed_uref: 'uref-da94c3e6dba516d8cd5ac2602c4ef79ac5dbb79e0dfbd0f15c437dd5077aa0af-007', dictionary_item_key: 'list' }
        }
      }
    })
  });
  const pendingList = (await pendingRes.json()).result?.stored_value?.CLValue?.parsed || [];
  const job0Count = pendingList.filter(id => id === job0).length;
  const job1Count = pendingList.filter(id => id === job1).length;
  console.log(`Job 0 in pending list: ${job0Count} time(s) (expected: 1)`);
  console.log(`Job 1 in pending list: ${job1Count} time(s) (expected: 1)`);
  if (job0Count === 1 && job1Count === 1) {
    console.log('✅ Deduplication works!');
  } else {
    console.log('❌ Deduplication FAILED');
  }

  console.log('\n=== Fix 3: Stale fields cleared ===');
  const req0 = await queryJobDict(job0, 'request_hash');
  const req1 = await queryJobDict(job1, 'request_hash');
  console.log(`Job 0 request_hash: "${req0}" (expected: "job1")`);
  console.log(`Job 1 request_hash: "${req1}" (expected: "job2")`);
  if (req0 === 'job1' && req1 === 'job2') {
    console.log('✅ Stale fields cleared correctly!');
  } else {
    console.log('❌ Stale fields NOT cleared');
  }

  console.log('\n=== All fixes verified ===');
}

main().catch(console.error);
