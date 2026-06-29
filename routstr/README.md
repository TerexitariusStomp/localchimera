# Routstr

Nostr/Cashu-based inference routing for Localchimera.

## Files

- `docker-compose.yml` — Docker Compose setup for the Routstr relay/router

## Purpose

Routstr provides a decentralized, no-local-key marketplace for AI inference jobs. It routes requests over Nostr and settles via Cashu ecash.

## Integration

The QVAC miner at `../qvac/src/miners/RoutstrMiner.js` integrates with this layer.
