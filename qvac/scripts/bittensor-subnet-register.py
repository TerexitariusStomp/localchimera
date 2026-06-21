#!/usr/bin/env python3
"""
Register a Bittensor hotkey on a specific subnet using substrate-interface.

Usage:
    python3 bittensor-subnet-register.py --wallet chimera --hotkey default --netuid 64
"""
import argparse
import json
import os
import sys
import time

WALLETS_PATH = os.path.expanduser("~/.bittensor/wallets")
SUBTENSOR_URL = "wss://entrypoint-finney.opentensor.ai:443"


def load_wallet(wallet_name, hotkey_name):
    hotkey_path = os.path.join(WALLETS_PATH, wallet_name, "hotkeys", hotkey_name)
    coldkey_path = os.path.join(WALLETS_PATH, wallet_name, "coldkey", "coldkeypub.txt")

    with open(hotkey_path) as f:
        hotkey_data = json.load(f)
    with open(coldkey_path) as f:
        coldkey_data = json.load(f)

    return {
        "coldkey_ss58": coldkey_data["ss58Address"],
        "hotkey_ss58": hotkey_data["ss58Address"],
        "hotkey_seed": hotkey_data["secretSeed"].replace("0x", ""),
    }


def get_balance(substrate, address):
    """Get TAO balance for an address."""
    result = substrate.query("System", "Account", [address])
    if result.value:
        return result.value["data"]["free"] / 1e9
    return 0.0


def register_on_subnet(substrate, wallet, netuid):
    """Register hotkey on subnet."""
    from substrateinterface import Keypair

    coldkey = Keypair.create_from_seed(seed_hex=wallet["hotkey_seed"])
    # Note: In Bittensor, the coldkey pays for registration, but the hotkey is what gets registered.
    # However, we only have one keypair here (derived from same mnemonic).
    # The coldkeypub might be different from the hotkey.

    # Load actual coldkey if available
    coldkey_seed = wallet.get("coldkey_seed")
    if coldkey_seed:
        coldkey = Keypair.create_from_seed(seed_hex=coldkey_seed)
    else:
        # Fallback: use same keypair (they're derived from same mnemonic in our case)
        print("[warn] No separate coldkey seed found, using hotkey as coldkey signer")

    hotkey_ss58 = wallet["hotkey_ss58"]
    coldkey_ss58 = wallet["coldkey_ss58"]

    print(f"[register] Coldkey: {coldkey_ss58}")
    print(f"[register] Hotkey:  {hotkey_ss58}")
    print(f"[register] Netuid:   {netuid}")

    # Check if already registered
    registered = substrate.query("SubtensorModule", "Uids", [netuid, hotkey_ss58])
    if registered.value is not None:
        print(f"[register] Already registered on subnet {netuid} with uid {registered.value}")
        return True

    # Check subnet hyperparameters for registration requirements
    print(f"[register] Checking subnet {netuid} parameters...")
    network_registration_allowed = substrate.query("SubtensorModule", "NetworkRegistrationAllowed", [netuid])
    print(f"[register] Registration allowed: {network_registration_allowed.value}")

    if not network_registration_allowed.value:
        print("[register] Registration is NOT allowed on this subnet currently")
        return False

    # Get registration parameters
    burn = substrate.query("SubtensorModule", "Burn", [netuid])
    print(f"[register] Burn cost: {burn.value / 1e9} TAO")

    # Check balance
    balance = get_balance(substrate, coldkey_ss58)
    print(f"[register] Coldkey balance: {balance} TAO")

    if balance < (burn.value / 1e9):
        print(f"[register] ERROR: Insufficient balance. Need at least {burn.value / 1e9} TAO")
        print(f"[register] Please fund: {coldkey_ss58}")
        return False

    # Submit registration extrinsic
    print(f"[register] Submitting registration extrinsic...")
    call = substrate.compose_call(
        call_module="SubtensorModule",
        call_function="burned_register",
        call_params={
            "netuid": netuid,
            "hotkey": hotkey_ss58,
        }
    )

    extrinsic = substrate.create_signed_extrinsic(call, coldkey)
    receipt = substrate.submit_extrinsic(extrinsic, wait_for_inclusion=True)

    if receipt.is_success:
        print(f"[register] SUCCESS! Transaction included in block {receipt.block_hash}")
        # Verify registration
        uid = substrate.query("SubtensorModule", "Uids", [netuid, hotkey_ss58])
        print(f"[register] Assigned UID: {uid.value}")
        return True
    else:
        print(f"[register] FAILED: {receipt.error_message}")
        return False


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--wallet", default="chimera")
    parser.add_argument("--hotkey", default="default")
    parser.add_argument("--netuid", type=int, default=64)
    parser.add_argument("--endpoint", default=SUBTENSOR_URL)
    args = parser.parse_args()

    try:
        from substrateinterface import SubstrateInterface
    except ImportError:
        print("ERROR: substrateinterface not installed")
        sys.exit(1)

    print(f"[connect] Connecting to {args.endpoint}...")
    substrate = SubstrateInterface(url=args.endpoint)
    print(f"[connect] Chain: {substrate.chain}, Version: {substrate.version}")

    wallet = load_wallet(args.wallet, args.hotkey)
    success = register_on_subnet(substrate, wallet, args.netuid)

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
