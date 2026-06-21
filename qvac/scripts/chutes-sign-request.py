#!/usr/bin/env python3
"""
Python bridge to sign Chutes API requests using the hotkey from ~/.chutes/config.ini.

Usage:
    python3 chutes-sign-request.py <method> <path> [payload_json]

Output:
    JSON with headers dict and optionally payload_string
"""
import hashlib
import json
import os
import sys
import time

# Load chutes config to get hotkey seed
CONFIG_PATH = os.path.expanduser("~/.chutes/config.ini")


def parse_ini(path):
    config = {}
    current = None
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith(";") or line.startswith("#"):
                continue
            if line.startswith("[") and line.endswith("]"):
                current = line[1:-1]
                config[current] = {}
                continue
            if "=" in line and current:
                key, val = line.split("=", 1)
                config[current][key.strip()] = val.strip()
    return config


def main():
    if len(sys.argv) < 3:
        print('Usage: python3 chutes-sign-request.py <method> <path> [payload_json]', file=sys.stderr)
        sys.exit(1)

    method = sys.argv[1].upper()
    path = sys.argv[2]
    payload = None
    if len(sys.argv) > 3:
        payload = json.loads(sys.argv[3])

    cfg = parse_ini(CONFIG_PATH)
    auth = cfg.get("auth", {})
    hotkey_ss58 = auth.get("hotkey_ss58address", "")
    hotkey_seed = auth.get("hotkey_seed", "").replace("0x", "")

    if not hotkey_ss58 or not hotkey_seed:
        print(json.dumps({"error": "hotkey not configured"}))
        sys.exit(1)

    try:
        from substrateinterface import Keypair
    except ImportError:
        print(json.dumps({"error": "substrateinterface not installed"}))
        sys.exit(1)

    keypair = Keypair.create_from_seed(seed_hex=hotkey_seed)
    assert keypair.ss58_address == hotkey_ss58, f"ss58 mismatch: {keypair.ss58_address} != {hotkey_ss58}"

    nonce = str(int(time.time()))
    headers = {
        "Content-Type": "application/json",
        "X-Chutes-Hotkey": hotkey_ss58,
        "X-Chutes-Nonce": nonce,
    }

    payload_str = None
    if payload is not None:
        payload_str = json.dumps(payload)
        sig_msg = f"{hotkey_ss58}:{nonce}:{hashlib.sha256(payload_str.encode()).hexdigest()}"
    else:
        sig_msg = f"{hotkey_ss58}:{nonce}:api_keys"  # fallback purpose

    headers["X-Chutes-Signature"] = keypair.sign(sig_msg.encode()).hex()

    result = {
        "headers": headers,
        "payload": payload_str,
        "hotkey": hotkey_ss58,
    }
    print(json.dumps(result))


if __name__ == "__main__":
    main()
