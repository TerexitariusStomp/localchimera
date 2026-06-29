# Inference Backend

Backend services for Localchimera's encrypted inference experiments.

## Subdirectories

- `api/` — HTTP API server for inference stats and referrals (`package.json`)
- `consensus/` — Consensus logic for distributed inference
- `contracts/` — Solidity contracts used by the inference backend
- `coordinator/` — Coordinator client for orchestrating inference nodes
- `node/` — Node-specific backend package (`package.json`)
- `types/` — Shared TypeScript types
- `utils/` — Shared utilities

## Configuration Files

- `foundry.toml` — Foundry configuration for the inference contracts
- `tsconfig.json` — TypeScript configuration
- `vitest.config.ts` — Vitest test configuration
- `../inference-package.json` — Top-level package manifest for the inference workspace
- `../inference-README.md` — High-level inference documentation
- `../inference-config/` — Deployment configs per network

## Related Code

- `../contracts/FHEInferenceMarket.sol` — on-chain FHE market contract
- `../website/inference-frontend/` and `../website-new/inference-frontend/` — frontend UIs

## Status

This area is under active development. The FHE runtime currently uses Microsoft SEAL via `node-seal` for portability; the `upstream/fhevm` and `upstream/concrete` submodules are tracked for future migration.
