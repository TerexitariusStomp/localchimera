# Contracts

Smart contracts for the Localchimera ecosystem.

## EVM Contracts

Located in this directory and deployed primarily on Arbitrum / EVM-compatible chains.

- Compute registry and order book contracts
- Reputation and escrow contracts
- FHE inference market experiments (see `FHEInferenceMarket.sol`)

## Casper Contracts

See `../contracts-casper/` for Casper Network smart contracts (vault, escrow, provider registry).

## Deployment

Use the Foundry deployment scripts in `../scripts/deploy/`.

```bash
# Example: deploy a single contract (review the script for required env vars)
forge script scripts/deploy/DeployChimera.s.sol --rpc-url $RPC_URL --broadcast
```

## Security

- Never commit private keys or `.env` files.
- Use `PAYOUT_SIGNING_KEY` and similar env vars only at runtime.
