# Casper Contracts

Casper Network smart contracts for Localchimera.

## Purpose

These contracts provide:

- **Escrow vault** for job payments and provider payouts
- **Provider registry** for account hashes and relay authorization
- **Job lifecycle** state machine (pending → assigned → done → settled)

## Key Files

- `EscrowVault.sol` / equivalent Casper contract — payment escrow
- `ComputeRegistry.sol` / equivalent — provider registry

## Integration

The SDK and QVAC talk to these contracts via a relay server (private keys live on the relay, not on the untrusted device).

See `../docs/RELAY_COMPATIBILITY.md` for the relay/worker split architecture.
