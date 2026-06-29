# Deploy Scripts

Deployment scripts for Localchimera contracts and infrastructure.

## Foundry Scripts

- `DeployChimera.s.sol` — Main Chimera deployment
- `DeployFHEInferenceMarket.s.sol` — FHE inference market deployment

## TypeScript / JavaScript Scripts

- `deploy-casper*.mjs|ts` — Casper contract deployments
- `deploy-compute-registry.*` — Compute registry deployment
- `deploy-escrow*.mjs|ts` — Escrow and vault deployments
- `deploy-order-book.ts` / `deploy-orderbook.mjs` — Order book deployment
- `deploy-reputation.mjs` — Reputation contract deployment
- `deploy-v1.mjs` / `deploy-v15.mjs` / `deploy-all.mjs` — Historical deployment orchestrators
- `deploy-single.mjs` — Single-contract deployment helper
- `deploy-updated-contracts.mjs` — Batch update deployments
- `deploy-high-gas.mjs` — High-gas deployment helper
- `deploy-inference.sh` — Deploy the inference backend infrastructure
- `redeploy-escrow-vault.mjs` / `redeploy-registry.ts` — Redeployment / upgrade helpers
- `register-node.ts` — Node registration (kept in `../register/`)

## Usage

```bash
# Deploy main Chimera contracts (set env vars first)
forge script scripts/deploy/DeployChimera.s.sol:DeployChimera --rpc-url $CHIMERA_RPC_URL --private-key $PRIVATE_KEY --broadcast

# Deploy inference infrastructure
./scripts/deploy/deploy-inference.sh
```

## Security

Never commit private keys or `.env` files. Required environment variables:

- `CHIMERA_RPC_URL` or `RPC_URL`
- `PRIVATE_KEY` or `PAYOUT_SIGNING_KEY`
- `CASPER_RPC_URL`, `CASPER_PROVIDER_KEY_PEM` for Casper deployments
