import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { Logger } from '../core/Logger.js';

const sdk = await import('casper-js-sdk').catch(() => null);

const CHAIN_NAME = process.env.CASPER_CHAIN_NAME || 'casper-test';
const RPC_URL = process.env.CASPER_RPC_URL || 'https://node.testnet.casper.network/rpc';
const PAYMENT = process.env.CASPER_PAYMENT || '3000000000'; // 3 CSPR — contract pays gas via DirectInvocationOnly

const CONTRACT_HASHES = {
  inferenceMarket: process.env.CASPER_INFERENCE_MARKET || '663812cfe4103b9d1584e3caccf7be9188e4c6c5f77851dacb64b8f308947f82',
  storageMarket: process.env.CASPER_STORAGE_MARKET || '1e884efc1a97e698149b91e5ffb7d1e8cda85598a4db75ac5b3be379418a2dca',
  computeMarket: process.env.CASPER_COMPUTE_MARKET || 'c1e96f072f632d681106d367cd34b4ec9d86258f10106c2cb9dcf23306c53af8',
  bandwidthMarket: process.env.CASPER_BANDWIDTH_MARKET || '4361a385408288194b54c7297e7f1754833f31a2ae88f3d1c5eabee4798897a1',
};

const DEFAULT_STAKE_MOTES = '1000000000'; // 1 CSPR
const THROWAWAY_KEY_DIR = join(process.env.HOME || '/tmp', '.chimera');
const THROWAWAY_KEY_PATH = join(THROWAWAY_KEY_DIR, 'casper-throwaway.pem');

function buildStringList(items) {
  const strType = sdk.CLValue.newCLString('x').type;
  const clTypeList = new sdk.CLTypeList();
  clTypeList.elementsType = strType;
  const list = new sdk.CLValueList();
  list.type = clTypeList;
  for (const item of items) {
    list.append(sdk.CLValue.newCLString(item));
  }
  const clVal = new sdk.CLValue();
  clVal.list = list;
  clVal.type = clTypeList;
  return clVal;
}

export class CasperAutoRegistrar {
  constructor(config) {
    this.config = config;
    this.logger = new Logger('CasperAutoRegistrar');
    this.client = null;
    this.privateKey = null;
    this.evmAddress = null;
    this.registered = new Set();
  }

  async initialize() {
    if (!sdk) {
      this.logger.warn('casper-js-sdk not installed — Casper auto-registration disabled');
      return false;
    }

    const casperConfig = this.config?.miners?.casper?.config || {};
    this.evmAddress = casperConfig.evmAddress || process.env.EVM_ADDRESS || '';
    if (!this.evmAddress) {
      this.logger.warn('No EVM address configured — auto-registration disabled. Set miners.casper.config.evmAddress in config.json or EVM_ADDRESS env var.');
      return false;
    }

    const pemPath = casperConfig.providerKeyPem || process.env.CSPR_PEM_PATH || THROWAWAY_KEY_PATH;
    try {
      if (existsSync(pemPath)) {
        const pem = readFileSync(pemPath, 'utf-8');
        this.privateKey = sdk.PrivateKey.fromPem(pem, sdk.KeyAlgorithm.SECP256K1);
      } else {
        this.logger.info('No Casper key found — generating throwaway key for registration');
        this.privateKey = sdk.PrivateKey.generate(sdk.KeyAlgorithm.SECP256K1);
        try {
          mkdirSync(THROWAWAY_KEY_DIR, { recursive: true });
          writeFileSync(THROWAWAY_KEY_PATH, this.privateKey.toPem(), { mode: 0o600 });
          this.logger.info(`Throwaway Casper key saved to ${THROWAWAY_KEY_PATH}`);
        } catch (e) {
          this.logger.warn(`Could not persist throwaway key: ${e.message}`);
        }
      }
      this.client = new sdk.RpcClient(new sdk.HttpHandler(RPC_URL));
      this.logger.info(`Casper auto-registrar initialized — EVM: ${this.evmAddress}, account: ${this.privateKey.publicKey.accountHash().toPrefixedString()}`);
      return true;
    } catch (e) {
      this.logger.error(`Failed to initialize Casper auto-registrar: ${e.message}`);
      return false;
    }
  }

  getAccountHash() {
    return this.privateKey?.publicKey?.accountHash()?.toPrefixedString() || '';
  }

  async _sendDeploy(session) {
    const payment = sdk.ExecutableDeployItem.standardPayment(PAYMENT);
    const header = sdk.DeployHeader.default();
    header.account = this.privateKey.publicKey;
    header.chainName = CHAIN_NAME;
    const deploy = sdk.Deploy.makeDeploy(header, payment, session);
    deploy.sign(this.privateKey);
    const result = await this.client.putDeploy(deploy);
    return result.deployHash;
  }

  async _callContract(contractHash, entryPoint, args) {
    const hashHex = contractHash.replace('contract-', '').replace('hash-', '');
    const ch = sdk.ContractHash.newContract(hashHex);
    const storedContract = new sdk.StoredContractByHash(ch, entryPoint, args);
    const session = new sdk.ExecutableDeployItem();
    session.storedContractByHash = storedContract;
    return this._sendDeploy(session);
  }

  async _checkAlreadyRegistered(contractHash, dictKeyPrefix) {
    try {
      const result = await this.client.queryLatestGlobalState(contractHash, [`${dictKeyPrefix}.status`]);
      return result?.storedValue?.clValue?.parsed !== undefined;
    } catch {
      return false;
    }
  }

  async registerAll({ peerId, nodeName, deviceProfile } = {}) {
    if (!this.client || !this.privateKey) {
      this.logger.warn('Casper auto-registrar not initialized — skipping registration');
      return { registered: [], errors: ['Not initialized'] };
    }

    const pid = peerId || this.config?.node?.id || 'chimera-node';
    const name = nodeName || this.config?.node?.name || 'Chimera Node';
    const profile = deviceProfile || {};

    const results = [];
    const errors = [];

    // ─── Inference Market ───
    try {
      const already = await this._checkAlreadyRegistered(CONTRACT_HASHES.inferenceMarket, `im_providers`);
      if (already) {
        this.logger.info('[inference] Already registered, skipping');
        results.push({ contract: 'inferenceMarket', status: 'already_registered' });
      } else {
        const args = sdk.Args.fromMap({
          evm_address: sdk.CLValue.newCLString(this.evmAddress),
          peer_id: sdk.CLValue.newCLString(pid),
          name: sdk.CLValue.newCLString(name),
          has_gpu: sdk.CLValue.newCLValueBool(!!profile.hasGpu),
          vram_mb: sdk.CLValue.newCLUint64(String(profile.vramMb || 0)),
          supported_models: buildStringList(profile.models || ['llama-3.2-1b-instruct']),
          stake_amount: sdk.CLValue.newCLUInt512(DEFAULT_STAKE_MOTES),
        });
        const hash = await this._callContract(CONTRACT_HASHES.inferenceMarket, 'register_provider', args);
        this.logger.info(`[inference] Registered provider — deploy: ${hash}`);
        results.push({ contract: 'inferenceMarket', deployHash: hash, status: 'registered' });
      }
    } catch (e) {
      this.logger.error(`[inference] Registration failed: ${e.message}`);
      errors.push({ contract: 'inferenceMarket', error: e.message });
    }

    // ─── Storage Market ───
    try {
      const already = await this._checkAlreadyRegistered(CONTRACT_HASHES.storageMarket, `sm_providers`);
      if (already) {
        this.logger.info('[storage] Already registered, skipping');
        results.push({ contract: 'storageMarket', status: 'already_registered' });
      } else {
        const args = sdk.Args.fromMap({
          evm_address: sdk.CLValue.newCLString(this.evmAddress),
          peer_id: sdk.CLValue.newCLString(pid),
          name: sdk.CLValue.newCLString(name),
          total_capacity_mb: sdk.CLValue.newCLUint64(String(profile.storageMb || 10240)),
          price_per_mb_month: sdk.CLValue.newCLUInt512('1000000'),
          min_storage_mb: sdk.CLValue.newCLUint64('1'),
          max_storage_mb: sdk.CLValue.newCLUint64(String(profile.storageMb || 10240)),
          stake_amount: sdk.CLValue.newCLUInt512(DEFAULT_STAKE_MOTES),
        });
        const hash = await this._callContract(CONTRACT_HASHES.storageMarket, 'register_provider', args);
        this.logger.info(`[storage] Registered provider — deploy: ${hash}`);
        results.push({ contract: 'storageMarket', deployHash: hash, status: 'registered' });
      }
    } catch (e) {
      this.logger.error(`[storage] Registration failed: ${e.message}`);
      errors.push({ contract: 'storageMarket', error: e.message });
    }

    // ─── Compute Market ───
    try {
      const already = await this._checkAlreadyRegistered(CONTRACT_HASHES.computeMarket, `cm_providers`);
      if (already) {
        this.logger.info('[compute] Already registered, skipping');
        results.push({ contract: 'computeMarket', status: 'already_registered' });
      } else {
        const args = sdk.Args.fromMap({
          evm_address: sdk.CLValue.newCLString(this.evmAddress),
          peer_id: sdk.CLValue.newCLString(pid),
          name: sdk.CLValue.newCLString(name),
          runtime_types: buildStringList(['wasm', 'docker']),
          cpu_cores: sdk.CLValue.newCLUint64(String(profile.cpuCores || 4)),
          ram_mb: sdk.CLValue.newCLUint64(String(profile.ramMb || 4096)),
          has_gpu: sdk.CLValue.newCLValueBool(!!profile.hasGpu),
          vram_mb: sdk.CLValue.newCLUint64(String(profile.vramMb || 0)),
          price_per_cpu_sec: sdk.CLValue.newCLUInt512('100000'),
          price_per_gpu_sec: sdk.CLValue.newCLUInt512('500000'),
          stake_amount: sdk.CLValue.newCLUInt512(DEFAULT_STAKE_MOTES),
        });
        const hash = await this._callContract(CONTRACT_HASHES.computeMarket, 'register_provider', args);
        this.logger.info(`[compute] Registered provider — deploy: ${hash}`);
        results.push({ contract: 'computeMarket', deployHash: hash, status: 'registered' });
      }
    } catch (e) {
      this.logger.error(`[compute] Registration failed: ${e.message}`);
      errors.push({ contract: 'computeMarket', error: e.message });
    }

    // ─── Bandwidth Market ───
    try {
      const already = await this._checkAlreadyRegistered(CONTRACT_HASHES.bandwidthMarket, `bm_providers`);
      if (already) {
        this.logger.info('[bandwidth] Already registered, skipping');
        results.push({ contract: 'bandwidthMarket', status: 'already_registered' });
      } else {
        const args = sdk.Args.fromMap({
          evm_address: sdk.CLValue.newCLString(this.evmAddress),
          peer_id: sdk.CLValue.newCLString(pid),
          name: sdk.CLValue.newCLString(name),
          service_type: sdk.CLValue.newCLString('proxy'),
          bandwidth_mbps: sdk.CLValue.newCLUint64(String(profile.bandwidthMbps || 100)),
          is_relay: sdk.CLValue.newCLValueBool(false),
          or_port: sdk.CLValue.newCLUint64('9001'),
          dir_port: sdk.CLValue.newCLUint64('9030'),
          price_per_hour: sdk.CLValue.newCLUInt512('100000000'),
          price_per_gib: sdk.CLValue.newCLUInt512('50000000'),
          stake_amount: sdk.CLValue.newCLUInt512(DEFAULT_STAKE_MOTES),
        });
        const hash = await this._callContract(CONTRACT_HASHES.bandwidthMarket, 'register_provider', args);
        this.logger.info(`[bandwidth] Registered provider — deploy: ${hash}`);
        results.push({ contract: 'bandwidthMarket', deployHash: hash, status: 'registered' });
      }
    } catch (e) {
      this.logger.error(`[bandwidth] Registration failed: ${e.message}`);
      errors.push({ contract: 'bandwidthMarket', error: e.message });
    }

    this.logger.info(`Auto-registration complete — ${results.length} succeeded, ${errors.length} failed`);
    return { registered: results, errors };
  }
}
