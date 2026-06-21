#!/usr/bin/env python3
"""
Register a new Chutes account using a derived Bittensor wallet.
Usage:
    python3 chutes-register.py --token <TOKEN> --username <USERNAME>
"""
import argparse
import json
import os
import time
import aiohttp
import asyncio
from substrateinterface import Keypair

WALLETS_PATH = os.path.expanduser("~/.bittensor/wallets")
HOTKEY_HEADER = "X-Chutes-Hotkey"
NONCE_HEADER = "X-Chutes-Nonce"
SIGNATURE_HEADER = "X-Chutes-Signature"


def get_signing_message(hotkey: str, nonce: str, payload: str) -> str:
    return f"{hotkey}:{nonce}:{payload}"


async def register(token: str, username: str, wallet: str = "chimera", hotkey: str = "default"):
    hotkey_path = os.path.join(WALLETS_PATH, wallet, "hotkeys", hotkey)
    coldkey_path = os.path.join(WALLETS_PATH, wallet, "coldkey", "coldkeypub.txt")

    if not os.path.isfile(hotkey_path):
        print(f"ERROR: Hotkey not found: {hotkey_path}")
        return 1

    with open(hotkey_path) as f:
        hotkey_data = json.load(f)

    with open(coldkey_path) as f:
        coldkey_data = json.load(f)

    ss58 = hotkey_data["ss58Address"]
    secret_seed = hotkey_data["secretSeed"].replace("0x", "")
    coldkey_ss58 = coldkey_data["ss58Address"]

    payload = json.dumps({"username": username, "coldkey": coldkey_ss58})
    keypair = Keypair.create_from_seed(seed_hex=secret_seed)

    headers = {
        "Content-Type": "application/json",
        HOTKEY_HEADER: ss58,
        NONCE_HEADER: str(int(time.time())),
    }
    sig_str = get_signing_message(ss58, headers[NONCE_HEADER], payload)
    headers[SIGNATURE_HEADER] = keypair.sign(sig_str.encode()).hex()

    registration_url = "https://rtok.chutes.ai/users/register"

    print(f"Registering username='{username}' with hotkey={ss58}")
    async with aiohttp.ClientSession() as session:
        async with session.post(
            f"{registration_url}?token={token}",
            data=payload,
            headers=headers,
        ) as response:
            data = await response.json()
            if response.status == 200:
                print(f"SUCCESS: user_id={data.get('user_id')}")
                print(f"Username: {data.get('username')}")
                print(f"Payment address: {data.get('payment_address')}")
                print(f"Fingerprint: {data.get('fingerprint')}")
                print("\nSave this fingerprint - it is your login credential!")
                return 0
            else:
                print(f"FAILED ({response.status}): {data}")
                return 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--token", required=True, help="Registration token from https://rtok.chutes.ai/users/registration_token")
    parser.add_argument("--username", required=True, help="Desired username")
    parser.add_argument("--wallet", default="chimera")
    parser.add_argument("--hotkey", default="default")
    args = parser.parse_args()
    exit(asyncio.run(register(args.token, args.username, args.wallet, args.hotkey)))
