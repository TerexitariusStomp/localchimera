#!/usr/bin/env python3
"""OtterWiki Bridge

Integrates upstream/redimp/otterwiki as the wiki backend storage.
Uses OtterWiki's GitStorage class for git-backed wiki pages.

Upstream: https://github.com/redimp/otterwiki
"""

import json
import os
import sys
from pathlib import Path

# Add upstream otterwiki to path so we can import it directly
_UPSTREAM = Path(__file__).resolve().parents[3] / "upstream" / "otterwiki"
sys.path.insert(0, str(_UPSTREAM))

from otterwiki.gitstorage import GitStorage

# Directory where OtterWiki keeps its git repository
WIKI_ROOT = Path(__file__).resolve().parents[2] / "llmwiki-data" / "otterwiki"


def _storage() -> GitStorage:
    if not WIKI_ROOT.exists():
        WIKI_ROOT.mkdir(parents=True, exist_ok=True)
        return GitStorage(str(WIKI_ROOT), initialize=True)
    return GitStorage(str(WIKI_ROOT))


def save_page(title: str, content: str, message: str = "", author: tuple = ("", "")) -> dict:
    """Save a wiki page into OtterWiki's git storage."""
    storage = _storage()
    # OtterWiki uses page names with underscores instead of spaces
    filename = title.replace(" ", "_") + ".md"
    changed = storage.store(filename, content, message=message or f"Update {title}", author=author)
    return {"success": True, "changed": changed, "filename": filename}


def get_page(title: str) -> dict:
    """Load a wiki page from OtterWiki's git storage."""
    storage = _storage()
    filename = title.replace(" ", "_") + ".md"
    if not storage.exists(filename):
        return {"success": False, "error": "Page not found"}
    content = storage.load(filename)
    return {"success": True, "content": content, "filename": filename}


def list_pages() -> dict:
    """List all wiki pages in OtterWiki's git storage."""
    storage = _storage()
    try:
        files = storage.list(depth=1)
        pages = [f for f in files if f.endswith(".md")]
        return {"success": True, "pages": pages}
    except Exception as e:
        return {"success": False, "error": str(e)}


def search_pages(query: str) -> dict:
    """Simple text search across all pages."""
    storage = _storage()
    results = []
    try:
        files = storage.list(depth=1)
        for filename in files:
            if not filename.endswith(".md"):
                continue
            try:
                content = storage.load(filename)
                if query.lower() in content.lower():
                    results.append({"filename": filename, "snippet": content[:200]})
            except Exception:
                continue
        return {"success": True, "results": results}
    except Exception as e:
        return {"success": False, "error": str(e)}


def get_history(title: str, max_count: int = 10) -> dict:
    """Get revision history for a page."""
    storage = _storage()
    filename = title.replace(" ", "_") + ".md"
    if not storage.exists(filename):
        return {"success": False, "error": "Page not found"}
    try:
        log = storage.log(filename, max_count=max_count)
        return {"success": True, "history": log}
    except Exception as e:
        return {"success": False, "error": str(e)}


def delete_page(title: str, message: str = "", author: tuple = ("", "")) -> dict:
    """Delete a wiki page from OtterWiki's git storage."""
    storage = _storage()
    filename = title.replace(" ", "_") + ".md"
    if not storage.exists(filename):
        return {"success": False, "error": "Page not found"}
    try:
        storage.delete(filename, message=message or f"Delete {title}", author=author)
        return {"success": True, "filename": filename}
    except Exception as e:
        return {"success": False, "error": str(e)}


# CLI entrypoint for Node.js server to call via subprocess
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["save", "get", "list", "search", "history", "delete"])
    parser.add_argument("--title", default="")
    parser.add_argument("--content", default="")
    parser.add_argument("--message", default="")
    parser.add_argument("--query", default="")
    parser.add_argument("--max-count", type=int, default=10)
    args = parser.parse_args()

    if args.action == "save":
        result = save_page(args.title, args.content, args.message)
    elif args.action == "get":
        result = get_page(args.title)
    elif args.action == "list":
        result = list_pages()
    elif args.action == "search":
        result = search_pages(args.query)
    elif args.action == "history":
        result = get_history(args.title, args.max_count)
    elif args.action == "delete":
        result = delete_page(args.title, args.message)
    else:
        result = {"success": False, "error": "Unknown action"}

    print(json.dumps(result))
