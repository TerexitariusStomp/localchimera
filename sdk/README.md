# Chimera SDK

Integrate local AI mining into your application. Your users earn revenue from idle inference tasks. You earn a percentage as the app integrator.

## What it does

The Chimera SDK exposes the mining node functionality of the QVAC stack without the LLM Wiki UI. It gives your app:

- **Local inference mining** — your users' devices complete AI tasks from networks like Cortensor, Chutes, Fortytwo, Earnidle, and Routstr.
- **Revenue split** — a configurable percentage of earnings goes to you (the app developer / integrator), the rest to the machine owner.
- **Consent-first** — users must explicitly opt in before mining starts.
- **Start / Stop controls** — users can pause mining at any time.

## Install

```bash
npm install @chimera/sdk
```

Or copy the `sdk/` folder into your project.

## Quick Start

### 1. Backend (Node.js)

```javascript
import { ChimeraSDK } from '@chimera/sdk';

const sdk = new ChimeraSDK({
  appName: 'MyApp',
  integratorWallet: '0xYourEvmWalletAddressHere', // your payout address
  revenueSplit: { integrator: 0.30, machineOwner: 0.70 }
});

await sdk.init();

// In your UI, ask the user for consent:
sdk.giveConsent();

// Start mining
await sdk.start();

// Check status
console.log(sdk.status());

// Stop mining
await sdk.stop();
```

### 2. Frontend (React)

```jsx
import { useChimera } from '@chimera/sdk/src/useChimera.js';

function MiningPanel() {
  const { status, consentGiven, giveConsent, start, stop } = useChimera({
    integratorWallet: '0xYourEvmWalletAddressHere',
    revenueSplit: { integrator: 0.30, machineOwner: 0.70 }
  });

  return (
    <div style={{ padding: 20, borderRadius: 12, border: '1px solid #333' }}>
      <h3>AI Mining</h3>

      {!consentGiven && (
        <div>
          <p>Enable AI mining to earn while idle. 30% goes to the app developer.</p>
          <button onClick={giveConsent}>I agree — enable mining</button>
        </div>
      )}

      {consentGiven && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={start} disabled={status.running}>▶ Start</button>
          <button onClick={stop} disabled={!status.running}>⏹ Stop</button>
        </div>
      )}

      <pre>{JSON.stringify(status, null, 2)}</pre>
    </div>
  );
}
```

## Configuration

### `ChimeraSDK` options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `appName` | string | `'unknown-app'` | Identifier for logs and analytics |
| `integratorWallet` | string | `null` | Your EVM payout address (required for revenue split) |
| `revenueSplit` | object | `{ integrator: 0.30, machineOwner: 0.70 }` | Percentage split |
| `configPath` | string | `./config.json` | Path to QVAC config |

### Revenue split

Funds are swept automatically on a weekly / monthly schedule defined in `config.json`:

- **Weekly sweep** — collects all network funds into a multisig
- **Monthly sweep** — distributes from the multisig using the configured split

The default split is **70% machine owner, 30% integrator**.

To change it:

```javascript
const sdk = new ChimeraSDK({
  integratorWallet: '0x...',
  revenueSplit: { integrator: 0.25, machineOwner: 0.75 }
});
```

## API Reference

### `sdk.init()`

Loads config, injects integrator wallet, initializes the node manager.

### `sdk.giveConsent()` / `sdk.revokeConsent()` / `sdk.hasConsent()`

Consent management. Mining will not start without consent.

### `sdk.start()`

Starts the mining node. Returns `{ success, running }`.

### `sdk.stop()`

Stops the mining node. Returns `{ success, running }`.

### `sdk.status()`

Returns current status:

```javascript
{
  initialized: true,
  appName: 'MyApp',
  consent: true,
  running: true,
  miners: { cortensor: { running: true }, chutes: { running: true } },
  integratorWallet: '0x...',
  revenueSplit: { integrator: 0.30, machineOwner: 0.70 }
}
```

### `sdk.testMiners()`

Runs a health check on all registered miners. Returns latency and success per miner.

### `sdk.shutdown()`

Graceful shutdown. Call this before your app exits.

## How it works

```
┌─────────────────┐
│  Your App UI    │  ← calls sdk.start() / sdk.stop()
│  (React, etc.)  │
└────────┬────────┘
         │
┌────────▼────────┐
│  Chimera SDK    │  ← manages consent, wallet config
│  (@chimera/sdk) │
└────────┬────────┘
         │
┌────────▼────────┐
│  NodeManager    │  ← QVAC inference, miner registry
│  (mining only)  │
└────────┬────────┘
         │
┌────────▼────────┐
│  Miner Networks │  ← Cortensor, Chutes, Fortytwo, etc.
│  (tasks → $$$)  │
└─────────────────┘
```

## Full example app

See `examples/basic-react/` for a complete working integration.

## License

MIT
