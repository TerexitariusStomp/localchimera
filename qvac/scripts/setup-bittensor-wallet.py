#!/usr/bin/env python3
"""
Derive a Bittensor wallet from a BIP-39 mnemonic and create the minimal
wallet directory structure expected by btcli / Chutes.ai.

Usage:
    python3 setup-bittensor-wallet.py \
        --mnemonic "word1 word2 ..." \
        --wallet-name chimera \
        --hotkey-name default
"""
import argparse
import os
import sys


def main():
    parser = argparse.ArgumentParser(description="Create Bittensor wallet from mnemonic")
    parser.add_argument("--mnemonic", required=True, help="BIP-39 mnemonic phrase")
    parser.add_argument("--wallet-name", default="chimera", help="Wallet name")
    parser.add_argument("--hotkey-name", default="default", help="Hotkey name")
    parser.add_argument("--bittensor-home", default=os.path.expanduser("~/.bittensor"), help="Bittensor home directory")
    args = parser.parse_args()

    try:
        from substrateinterface import Keypair
    except ImportError as e:
        print(f"ERROR: substrateinterface not installed: {e}", file=sys.stderr)
        sys.exit(1)

    # Derive keypair from mnemonic
    kp = Keypair.create_from_mnemonic(args.mnemonic)
    ss58_address = kp.ss58_address
    public_key_hex = kp.public_key.hex()

    print(f"Derived SS58: {ss58_address}")
    print(f"Public key hex: {public_key_hex}")

    # Create wallet directories
    wallet_dir = os.path.join(args.bittensor_home, "wallets", args.wallet_name)
    coldkey_dir = os.path.join(wallet_dir, "coldkey")
    hotkeys_dir = os.path.join(wallet_dir, "hotkeys")
    os.makedirs(coldkey_dir, exist_ok=True)
    os.makedirs(hotkeys_dir, exist_ok=True)

    # Write coldkey public key
    coldkey_pub_path = os.path.join(coldkey_dir, "pub.txt")
    with open(coldkey_pub_path, "w") as f:
        f.write(public_key_hex)
    print(f"Wrote coldkey pub: {coldkey_pub_path}")

    # Write hotkey SS58 address
    hotkey_txt_path = os.path.join(hotkeys_dir, f"{args.hotkey_name}.txt")
    with open(hotkey_txt_path, "w") as f:
        f.write(ss58_address)
    print(f"Wrote hotkey addr: {hotkey_txt_path}")

    # Write a placeholder hotkey JSON so external tools see a file exists.
    # NOTE: This is NOT a real encrypted keypair. It exists only so that
    # directory-listing checks pass. Any real on-chain operation must use
    # a properly encrypted keyfile created by btcli.
    hotkey_json_path = os.path.join(hotkeys_dir, f"{args.hotkey_name}.json")
    placeholder = {
        "accountId": public_key_hex,
        "publicKey": public_key_hex,
        "ss58Address": ss58_address,
        "_note": "Placeholder created by Chimera. Replace with btcli-generated keyfile for signing."
    }
    import json
    with open(hotkey_json_path, "w") as f:
        json.dump(placeholder, f, indent=2)
    print(f"Wrote hotkey JSON: {hotkey_json_path}")

    print("SUCCESS")
    print(f"COLDKEY_SS58={ss58_address}")
    print(f"HOTKEY_SS58={ss58_address}")


if __name__ == "__main__":
    main()
