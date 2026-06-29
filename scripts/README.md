# Scripts

Automation and utility scripts for Localchimera.

## Subdirectories

- `deploy/` — Foundry and TS/JS deployment scripts for EVM and Casper contracts, plus `deploy-inference.sh`
- `register/` — Node registration scripts
- `testing/` — Smoke tests for BrowserStack, LambdaTest, TestingBot (mobile/desktop QA)
- `debug/` — One-off debugging and inspection scripts
- `utils/` — Utility scripts: key cleanup, balance checks, wallet generation, WASM patching, device verification

## Top-Level Scripts

- `fork-upstream.sh` — Fork tasking/mining network repos into your GitHub org and repoint `.gitmodules`
- `update-tasking-forks.sh` — Pull latest upstream commits into forked tasking submodules
- `update-upstream.sh` — Check/update npm dependencies across packages

## Deployment Quick Start

```bash
# Fork upstream tasking networks
./scripts/fork-upstream.sh <your-github-username>

# Update forked tasking submodules
./scripts/update-tasking-forks.sh

# Check npm dependencies
./scripts/update-upstream.sh check

# Deploy contracts
forge script scripts/deploy/DeployChimera.s.sol:DeployChimera --rpc-url $RPC_URL --broadcast

# Deploy inference infrastructure
./scripts/deploy/deploy-inference.sh
```
