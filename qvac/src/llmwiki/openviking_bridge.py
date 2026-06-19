#!/usr/bin/env python3
"""OpenViking Bridge

Integrates upstream/volcengine/OpenViking as the memory backend.
Uses the pure-Python HTTP client to talk to an OpenViking server.

Requires an OpenViking server to be running (e.g. via Docker or cargo).
Default server URL: http://localhost:1933

Upstream: https://github.com/volcengine/OpenViking
"""

import json
import os
import sys
import types
from pathlib import Path

# Add upstream openviking to path so we can import it directly
_UPSTREAM = Path(__file__).resolve().parents[3] / "upstream" / "openviking"
sys.path.insert(0, str(_UPSTREAM))

# OpenViking's __init__.py eagerly imports a compiled Rust extension (pyagfs).
# We create a stub so the rest of the pure-Python imports work.
_pygafs_stub = types.ModuleType("openviking.pyagfs")
_pygafs_stub.get_binding_client = lambda *a, **k: None
sys.modules["openviking.pyagfs"] = _pygafs_stub

# Now import the pure-Python HTTP client
from openviking_cli.client.sync_http import SyncHTTPClient

DEFAULT_URL = os.environ.get("OPENVIKING_URL", "http://localhost:1933")
DEFAULT_API_KEY = os.environ.get("OPENVIKING_API_KEY", "")

_client = None


def _get_client() -> SyncHTTPClient:
    global _client
    if _client is None:
        _client = SyncHTTPClient(url=DEFAULT_URL, api_key=DEFAULT_API_KEY)
        _client.initialize()
    return _client


def store_memory(content: str, session_id: str = "chimera-default", role: str = "assistant") -> dict:
    """Store a memory entry in OpenViking."""
    try:
        client = _get_client()
        result = client.add_message(session_id=session_id, role=role, content=content)
        return {"success": True, "result": result}
    except Exception as e:
        return {"success": False, "error": str(e)}


def search_memory(query: str, session_id: str = "chimera-default") -> dict:
    """Search memory in OpenViking."""
    try:
        client = _get_client()
        # Use the session context to retrieve relevant memories
        context = client.get_session_context(session_id, token_budget=128_000)
        return {"success": True, "context": context}
    except Exception as e:
        return {"success": False, "error": str(e)}


def create_session(session_id: str = "chimera-default") -> dict:
    """Create a new OpenViking session for memory storage."""
    try:
        client = _get_client()
        result = client.create_session(session_id=session_id)
        return {"success": True, "result": result}
    except Exception as e:
        return {"success": False, "error": str(e)}


def get_context_for_prompt(query: str, session_id: str = "chimera-default") -> dict:
    """Get assembled context from OpenViking to prepend to an AI prompt."""
    try:
        client = _get_client()
        result = client.get_session_context(session_id, token_budget=128_000)
        # Extract messages from context to feed into QVAC inference
        messages = result.get("messages", [])
        context_text = "\n\n".join(
            f"{m.get('role', 'system')}: {m.get('content', '')}"
            for m in messages
        )
        return {"success": True, "context": context_text, "raw": result}
    except Exception as e:
        return {"success": False, "error": str(e)}


# CLI entrypoint for Node.js server to call via subprocess
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["store", "search", "create_session", "get_context"])
    parser.add_argument("--content", default="")
    parser.add_argument("--query", default="")
    parser.add_argument("--session-id", default="chimera-default")
    parser.add_argument("--role", default="assistant")
    args = parser.parse_args()

    if args.action == "store":
        result = store_memory(args.content, args.session_id, args.role)
    elif args.action == "search":
        result = search_memory(args.query, args.session_id)
    elif args.action == "create_session":
        result = create_session(args.session_id)
    elif args.action == "get_context":
        result = get_context_for_prompt(args.query, args.session_id)
    else:
        result = {"success": False, "error": "Unknown action"}

    print(json.dumps(result))
