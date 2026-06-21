#!/usr/bin/env python3
"""
Complete Chutes re-registration script for Chimera.

Prerequisites:
    1. Visit https://rtok.chutes.ai/users/registration_token
       (from the same machine/IP where this script runs)
    2. Paste the token below when prompted

Usage:
    python3 chutes-full-register.py
"""
import argparse
import asyncio
import json
import os
import sys
import time

import aiohttp
from substrateinterface import Keypair

WALLETS_PATH = os.path.expanduser("~/.bittensor/wallets")
HOTKEY_HEADER = "X-Chutes-Hotkey"
NONCE_HEADER = "X-Chutes-Nonce"
SIGNATURE_HEADER = "X-Chutes-Signature"
CONFIG_PATH = os.path.expanduser("~/.chutes/config.ini")
CHIMERA_CONFIG = os.path.join(os.path.dirname(__file__), "..", "config.json")


def get_signing_message(hotkey: str, nonce: str, payload_str: str) -> str:
    import hashlib
    return f"{hotkey}:{nonce}:{hashlib.sha256(payload_str.encode()).hexdigest()}"


async def register_account(token: str, username: str):
    wallet = "chimera"
    hotkey = "default"
    hotkey_path = os.path.join(WALLETS_PATH, wallet, "hotkeys", hotkey)
    coldkey_path = os.path.join(WALLETS_PATH, wallet, "coldkey", "coldkeypub.txt")

    with open(hotkey_path) as f:
        hotkey_data = json.load(f)
    with open(coldkey_path) as f:
        coldkey_data = json.load(f)

    ss58 = hotkey_data["ss58Address"]
    secret_seed = hotkey_data["secretSeed"].replace("0x", "")
    coldkey_ss58 = coldkey_data["ss58Address"]

    payload = json.dumps({"username": username, "coldkey": coldkey_ss58})
    keypair = Keypair.create_from_seed(seed_hex=secret_seed)

    nonce = str(int(time.time()))
    headers = {
        "Content-Type": "application/json",
        HOTKEY_HEADER: ss58,
        NONCE_HEADER: nonce,
    }
    sig_str = get_signing_message(ss58, nonce, payload)
    headers[SIGNATURE_HEADER] = keypair.sign(sig_str.encode()).hex()

    registration_url = "https://rtok.chutes.ai/users/register"
    print(f"[register] POST {registration_url}?token={token[:10]}...")
    async with aiohttp.ClientSession() as session:
        async with session.post(
            f"{registration_url}?token={token}",
            data=payload,
            headers=headers,
        ) as response:
            data = await response.json()
            if response.status == 200:
                print(f"[register] SUCCESS user_id={data.get('user_id')}")
                return data
            else:
                print(f"[register] FAILED {response.status}: {data}")
                return None


async def create_api_key(user_id: str, fingerprint: str, ss58: str, secret_seed: str):
    """Create a new API key after registration."""
    api_url = "https://api.chutes.ai/api_keys"
    payload = json.dumps({"name": "chimera-key"})
    nonce = str(int(time.time()))
    headers = {
        "Content-Type": "application/json",
        HOTKEY_HEADER: ss58,
        NONCE_HEADER: nonce,
    }
    sig_str = get_signing_message(ss58, nonce, payload)
    keypair = Keypair.create_from_seed(seed_hex=secret_seed)
    headers[SIGNATURE_HEADER] = keypair.sign(sig_str.encode()).hex()

    print(f"[api_key] Creating API key...")
    async with aiohttp.ClientSession() as session:
        async with session.post(api_url, data=payload, headers=headers) as response:
            data = await response.json()
            if response.status == 200:
                print(f"[api_key] SUCCESS")
                return data
            else:
                print(f"[api_key] FAILED {response.status}: {data}")
                return None


def update_chutes_config(username: str, user_id: str, ss58: str, seed: str, api_key: str = ""):
    config = f"""[api]
base_url = https://api.chutes.ai

[auth]
username = {username}
user_id = {user_id}
hotkey_seed = {seed}
hotkey_name = default
hotkey_ss58address = {ss58}

[payment]
address = {ss58}
"""
    with open(CONFIG_PATH, "w") as f:
        f.write(config)
    print(f"[config] Wrote {CONFIG_PATH}")


def update_chimera_config(api_key: str = None):
    if not os.path.isfile(CHIMERA_CONFIG):
        print(f"[warn] Chimera config not found: {CHIMERA_CONFIG}")
        return
    with open(CHIMERA_CONFIG) as f:
        config = json.load(f)
    if api_key:
        config["miners"]["chutes"]["config"]["apiKey"] = api_key
    config["miners"]["chutes"]["config"]["walletAddress"] = "5HVRSwRNAoNaghJ4BigmH8ECSLnLA3G55GiDQcZskmdK7vTu"
    config["miners"]["chutes"]["config"]["hotkeyAddress"] = "5HVRSwRNAoNaghJ4BigmH8ECSLnLA3G55GiDQcZskmdK7vTu"
    with open(CHIMERA_CONFIG, "w") as f:
        json.dump(config, f, indent=2)
    print(f"[config] Updated {CHIMERA_CONFIG}")


async def main():
    print("=" * 60)
    print("Chimera Chutes Re-Registration")
    print("=" * 60)
    print()
    print("Step 1: Get a registration token")
    print("Visit: https://rtok.chutes.ai/users/registration_token")
    print("(Must be from this machine/IP)")
    print()
    token = input("Paste your registration token: ").strip()
    if not token:
        print("ERROR: Token is required.")
        return 1

    username = input("Choose a username [chimera-node]: ").strip() or "chimera-node"

    result = await register_account(token, username)
    if not result:
        return 1

    ss58 = result.get("payment_address") or "5HVRSwRNAoNaghJ4BigmH8ECSLnLA3G55GiDQcZskmdK7vTu"
    user_id = result.get("user_id")
    fingerprint = result.get("fingerprint")

    # Read seed from wallet file
    hotkey_path = os.path.join(WALLETS_PATH, "chimera", "hotkeys", "default")
    with open(hotkey_path) as f:
        hk = json.load(f)
    secret_seed = hk["secretSeed"].replace("0x", "")

    update_chutes_config(username, user_id, ss58, secret_seed)
    update_chimera_config()

    print()
    print("=" * 60)
    print("Registration complete!")
    print(f"Username: {username}")
    print(f"User ID:  {user_id}")
    print(f"Fingerprint: {fingerprint}")
    print(f"Payment address: {ss58}")
    print()
    print("NOTE: You must fund this Bittensor address with TAO")
    print("      and create an API key via 'chutes keys create --name chimera-key'")
    print("      then update config.json with the new API key.")
    print("=" * 60)
    return 0


if __name__ == "__main__":
    exit(asyncio.run(main()))
