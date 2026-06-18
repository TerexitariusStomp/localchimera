# Basic React Example — Chimera SDK

A minimal example showing how to integrate the Chimera mining panel into a React app.

## Run

```bash
cd sdk/examples/basic-react
npm install
npm start
```

## Key files

- `MiningPanel.jsx` — drop-in component with consent, start/stop, and status
- `App.jsx` — wraps the panel in your app layout

## Before shipping

1. Replace `integratorWallet` with your real EVM payout address
2. Adjust `revenueSplit` if needed (default: 30% integrator, 70% machine owner)
3. Ensure the Chimera backend is running on `localhost:3002`
