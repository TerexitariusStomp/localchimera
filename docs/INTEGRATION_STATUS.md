# SDK Integration Status

## 1. Git History Scrubbed

✅ All mnemonics and private key material removed from git history using `git-filter-repo`:

| Original | Replaced With |
|----------|--------------|
| Akash mnemonic | `AKASH_MNEMONIC_REDACTED` |
| Targon mnemonic | `TARGON_MNEMONIC_REDACTED` |
| Nosana address | `NOSANA_ADDRESS_REDACTED` |
| Bittensor address | `BITTENSOR_ADDRESS_REDACTED` |
| Akash address | `AKASH_ADDRESS_REDACTED` |

**Backup**: `/tmp/qvac-chimera-git-backup` (kept for safety)

---

## 2. Akash + Targon Integrated into SDK

### New SDK Files

| File | Purpose |
|------|---------|
| `sdk/src/miners/AkashProvider.js` | Auto-starts Akash provider node |
| `sdk/src/miners/TargonProvider.js` | Auto-starts Targon CPU/GPU provider |
| `sdk/src/miners/KeyringManager.js` | Secure key references (zero secrets in code) |
| `sdk/src/miners/WalletSetup.js` | New machine onboarding with wallet recovery |
| `sdk/src/miners/index.js` | Module exports |

### Auto-Detection: CPU vs GPU

Both providers now auto-detect NVIDIA GPUs and adapt:

```javascript
// AkashProvider
const akash = new AkashProvider(); // gpuMode auto-detected
// GPU present → resources: 'CPU + GPU'
// No GPU      → resources: 'CPU only'

// TargonProvider
const targon = new TargonProvider(); // nodeType auto-detected
// H100/H200   → nodeType: 'HOPPER'
// B100/B200   → nodeType: 'BLACKWELL'
// Other GPU   → nodeType: 'GPU'
// No GPU      → nodeType: 'CPU'
```

### Manual Override

```javascript
// Force CPU-only mode
const akash = new AkashProvider({ gpuMode: false });

// Force specific GPU architecture
const targon = new TargonProvider({ gpuMode: true, nodeType: 'HOPPER' });
```

---

## 3. New Machine Registration

Call `sdk.onboard()` before `init()` on a brand-new machine:

```javascript
const sdk = new ChimeraSDK({ appName: 'MyApp', appDeveloperEVM: '0x...' });

const onboard = await sdk.onboard();
if (!onboard.ready) {
  // Show user recovery instructions
  console.log(onboard.missing);
  // Example output:
  // [{ network: 'akash', instruction: 'Run: provider-services keys add mykey --recover' }]
}

await sdk.init();
await sdk.giveConsent();
await sdk.start(); // Now earns with YOUR wallet
```

**Key principle**: New machines import YOUR wallet (same mnemonic). All earnings flow to the same address.

---

## 4. Security: Private Keys Never in SDK

| Network | Key Storage | SDK Access | App Can Steal? |
|---------|-------------|------------|----------------|
| **Akash** | `provider-services` OS keyring | Key **name** only | ❌ No |
| **Targon** | `~/.config/.targon.json` (0600) | Config **path** only | ❌ No |

- Apps using the SDK never see mnemonics
- SDK only passes key **names** and file **paths** to CLI binaries
- Wallet recovery is interactive (user types mnemonic into terminal, not into app code)

---

## 5. Status Output

```javascript
sdk.status()
// Returns:
{
  initialized: true,
  running: true,
  miners: { /* QVAC miners */ },
  externalProviders: [
    { provider: 'akash', running: true, pid: 12345, gpuMode: false, resources: 'CPU only' },
    { provider: 'targon', running: true, pid: 12346, gpuMode: false, nodeType: 'CPU', resources: 'CPU only' }
  ],
  machineOwnerEVM: '0x...',
  appDeveloperEVM: '0x...'
}
```

---

## 6. Remaining Active Providers

| Provider | Status | Earnings |
|----------|--------|----------|
| **Akash** | ✅ Wallet created, k3s running | CPU + GPU bids |
| **Targon** | ✅ Hotkey configured | CPU (reduced) / GPU (full) |
| **Salad** | ✅ Binary built | Needs real gRPC backend |

---

## 7. What You Need to Fund

1. **Akash**: Send AKT to your wallet address (in `provider-services` keyring)
2. **Targon**: Register on-chain with 1000 TAO minimum stake

---

## 8. Files Changed

- `sdk/src/ChimeraSDK.js` — Added `onboard()`, GPU/CPU provider integration
- `sdk/src/miners/AkashProvider.js` — GPU auto-detection
- `sdk/src/miners/TargonProvider.js` — GPU arch detection, CPU/GPU mode
- `sdk/src/miners/KeyringManager.js` — Secure key references
- `sdk/src/miners/WalletSetup.js` — New machine onboarding
- `sdk/src/miners/index.js` — Added WalletSetup export
- `sdk/README.md` — Security documentation
- `docs/WALLETS_CREATED.md` — Redacted (mnemonics removed)
- `docs/WALLET_AND_EARNINGS_STATUS.md` — Updated status
