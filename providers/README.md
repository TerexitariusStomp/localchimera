# Providers

Setup and lifecycle scripts for untrusted-hardware-safe mining/tasking providers.

## Files

- `start-all.sh` — launcher that prints startup instructions for all kept providers
- `status.sh` — quick status dashboard for running Docker containers and QVAC miners
- `setup-btfs.sh` — walletless BTFS storage node setup (no BTT wallet on device)
- `setup-zcn-blobber.sh` — 0Chain blobber setup (archived / kept for reference only)

## Supported Networks

All providers listed here are safe to run on untrusted hardware:

- BTT AI (GPU inference, proxy mode)
- Golem (decentralized compute, Docker)
- Anyone Protocol (onion relay, Docker)
- Mysterium (VPN node, Docker)
- BTFS (walletless storage)
- Casper (relay-mode escrow bridge)

## Usage

```bash
./providers/start-all.sh
./providers/status.sh
```

For individual setup, see the `setup-*.sh` scripts.
