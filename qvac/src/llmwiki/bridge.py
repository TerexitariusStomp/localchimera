#!/usr/bin/env python3
"""QVAC → LLM Wiki bridge.

Generates wiki pages via the local QVAC AI node and writes them into an
llmwiki workspace with proper frontmatter, citations, and cross-references.

Usage:
    python bridge.py <workspace_path> <topic> [--category concepts|entities]
"""

import argparse
import json
import sqlite3
import subprocess
import sys
from datetime import date
from pathlib import Path
import uuid
from uuid import uuid4, uuid5

QVAC_API_URL = "http://localhost:3000/api/ai-write"
NAMESPACE_DNS = uuid5(uuid5(uuid5(uuid.NAMESPACE_DNS, "qvac"), "llmwiki"), "local")

GUIDE_OVERVIEW = """# Overview

This wiki is maintained by QVAC — a local AI node that generates and updates
pages from prompts. Sources and generated content compound over time.

## Key Findings

- QVAC local inference (SmolLM2 360M) powers all wiki generation
- Content is markdown with YAML frontmatter, stored on disk + indexed in SQLite
- Cross-references link concepts ↔ entities and back to sources

## Recent Updates

"""


def _slugify(title: str) -> str:
    return "-".join(
        w.lower()
        for w in title.replace("_", " ").replace("-", " ").split()
        if w
    )


def _sanitize_filename(title: str) -> str:
    slug = _slugify(title)
    return slug if slug else "page"


def _ensure_db(db_path: Path) -> sqlite3.Connection:
    """Open or create the llmwiki index.db."""
    db_path.parent.mkdir(parents=True, exist_ok=True)
    return sqlite3.connect(str(db_path))


def _get_workspace_info(conn: sqlite3.Connection) -> dict:
    """Fetch workspace id, name, user_id from index.db."""
    row = conn.execute(
        "SELECT id, name, user_id FROM workspace LIMIT 1"
    ).fetchone()
    if not row:
        raise RuntimeError("Workspace not initialized — run 'llmwiki init' first")
    return {"id": row[0], "name": row[1], "user_id": row[2]}


def _get_user_id(conn: sqlite3.Connection) -> str:
    row = conn.execute("SELECT user_id FROM workspace LIMIT 1").fetchone()
    return row[0] if row else str(uuid5(NAMESPACE_DNS, "local"))


def _build_frontmatter(title: str, description: str, tags: list[str]) -> str:
    return f"""---
title: {title}
description: {description}
date: {date.today().isoformat()}
tags: {json.dumps(tags)}
---

"""


def _generate_via_qvac(prompt: str, title: str, timeout: int = 420) -> str:
    """Call QVAC node /api/ai-write via curl and return the generated body."""
    payload = json.dumps({"prompt": prompt, "title": title})
    cmd = [
        "curl", "-s", "-X", "POST", QVAC_API_URL,
        "-H", "Content-Type: application/json",
        "-d", payload,
        "--max-time", str(timeout),
    ]
    print(f"[bridge] Calling QVAC via curl (max-time={timeout}s)...")
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout + 30)
    except subprocess.TimeoutExpired:
        raise RuntimeError(f"QVAC curl timed out after {timeout + 30}s")
    except Exception as e:
        raise RuntimeError(f"QVAC curl failed: {e}")

    if result.returncode != 0:
        raise RuntimeError(f"QVAC curl error (rc={result.returncode}): {result.stderr}")

    try:
        data = json.loads(result.stdout)
    except json.JSONDecodeError as e:
        raise RuntimeError(f"QVAC returned invalid JSON: {e}\n{result.stdout[:500]}")

    if not data.get("success"):
        raise RuntimeError(f"QVAC generation failed: {data.get('error', 'unknown')}")
    return data["data"]["body"]


def _write_to_disk(path: Path, content: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def _index_document(
    conn: sqlite3.Connection,
    user_id: str,
    kb_id: str,
    doc_id: str,
    filename: str,
    title: str,
    dir_path: str,
    rel_path: str,
    file_type: str,
    content: str,
    tags: list[str],
):
    """Insert or update a document row in the llmwiki SQLite index."""
    tags_json = json.dumps(tags)
    content_hash = str(uuid.uuid4())[:16]
    conn.execute(
        """
        INSERT INTO documents (
            id, user_id, filename, title, path, relative_path,
            source_kind, file_type, status, content, tags, version, document_number,
            file_size, content_hash, mtime_ns, page_count, parser
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(relative_path) DO UPDATE SET
            id=excluded.id,
            content=excluded.content,
            title=excluded.title,
            tags=excluded.tags,
            version=version+1,
            updated_at=datetime('now')
        """,
        (
            doc_id,
            user_id,
            filename,
            title,
            dir_path,
            rel_path,
            "wiki",
            file_type,
            "ready",
            content,
            tags_json,
            0,
            1,
            len(content.encode("utf-8")),
            content_hash,
            0,
            0,
            "markdown",
        ),
    )
    conn.commit()


def _update_overview(workspace: Path, entry: str):
    """Append a recent-update entry to overview.md."""
    overview_path = workspace / "wiki" / "overview.md"
    text = overview_path.read_text(encoding="utf-8") if overview_path.exists() else GUIDE_OVERVIEW
    today = date.today().isoformat()
    new_entry = f"- [{today}] {entry}\n"
    if "## Recent Updates" not in text:
        text += "\n## Recent Updates\n\n"
    # Append after the heading
    parts = text.split("## Recent Updates")
    if len(parts) == 2:
        body_after = parts[1]
        lines = body_after.splitlines()
        # Insert after first blank line or at start
        insert_idx = 1
        while insert_idx < len(lines) and lines[insert_idx].strip() == "":
            insert_idx += 1
        new_lines = lines[:insert_idx] + [new_entry.rstrip()] + lines[insert_idx:]
        text = parts[0] + "## Recent Updates\n" + "\n".join(new_lines)
    else:
        text += f"\n{new_entry}"
    overview_path.write_text(text, encoding="utf-8")


def _append_log(workspace: Path, entry_type: str, summary: str):
    """Append an entry to wiki/log.md."""
    log_path = workspace / "wiki" / "log.md"
    today = date.today().isoformat()
    entry = f"\n## [{today}] {entry_type} | {summary}\n\n"
    if log_path.exists():
        log_path.write_text(log_path.read_text(encoding="utf-8") + entry, encoding="utf-8")
    else:
        log_path.write_text(f"# Log\n\n{entry}", encoding="utf-8")


def create_wiki_page(
    workspace: Path,
    topic: str = "",
    category: str = "concepts",
    tags: list[str] | None = None,
    description: str | None = None,
    custom_prompt: str = "",
    links: list[str] | None = None,
    file_source: str = "",
):
    """Generate a wiki page via QVAC and write it into the llmwiki workspace."""
    db_path = workspace / ".llmwiki" / "index.db"
    conn = _ensure_db(db_path)
    info = _get_workspace_info(conn)
    kb_id = info["id"]
    user_id = info["user_id"]

    title = (custom_prompt.strip() if custom_prompt else topic).replace("_", " ").title()
    slug = _sanitize_filename(title)
    filename = f"{slug}.md"
    dir_path = f"/wiki/{category}/"
    rel_path = f"wiki/{category}/{filename}"
    file_type = "md"
    doc_id = str(uuid4())

    # Build the generation prompt
    if custom_prompt:
        gen_prompt = custom_prompt
    else:
        gen_prompt = f"Write a comprehensive wiki page about: {topic}"

    if links:
        gen_prompt += "\n\nReference these links:\n" + "\n".join(f"- {l}" for l in links)

    if file_source:
        try:
            src_path = Path(file_source)
            if src_path.exists():
                src_text = src_path.read_text(encoding="utf-8", errors="ignore")
                # Truncate very large files
                if len(src_text) > 15000:
                    src_text = src_text[:15000] + "\n\n[truncated]"
                gen_prompt += f"\n\nUse the following source material:\n\n{src_text}"
        except Exception as e:
            print(f"[bridge] Warning: could not read source file: {e}")

    print(f"[bridge] Generating '{title}' via QVAC...")
    body = _generate_via_qvac(gen_prompt, title)

    default_tags = tags or [category, "qvac-generated"]
    desc = description or f"QVAC-generated wiki page about {title}"
    full_content = _build_frontmatter(title, desc, default_tags) + body

    # Write to disk
    disk_path = workspace / rel_path
    _write_to_disk(disk_path, full_content)
    print(f"[bridge] Written to {disk_path}")

    # Update SQLite index
    _index_document(
        conn, user_id, kb_id, doc_id, filename, title,
        dir_path, rel_path, file_type, full_content, default_tags,
    )
    conn.close()

    # Update overview and log
    _update_overview(workspace, f"Created {category}/{filename} — {title}")
    _append_log(workspace, "generate", f"QVAC created {category}/{filename}")
    print(f"[bridge] Indexed in llmwiki. Doc ID: {doc_id}")
    return doc_id


def main():
    parser = argparse.ArgumentParser(description="QVAC → LLM Wiki bridge")
    parser.add_argument("workspace", help="Path to llmwiki workspace")
    parser.add_argument("topic", help="Topic to generate a wiki page about")
    parser.add_argument(
        "--category", choices=["concepts", "entities", "comparisons"],
        default="concepts", help="Wiki category folder"
    )
    parser.add_argument(
        "--tags", nargs="+", default=None, help="Frontmatter tags"
    )
    parser.add_argument(
        "--description", default=None, help="Short page description"
    )
    parser.add_argument(
        "--prompt", default="", help="Custom generation prompt (overrides topic)"
    )
    parser.add_argument(
        "--links", nargs="+", default=None, help="Reference URLs"
    )
    parser.add_argument(
        "--file-source", default="", help="Path to a source file to include in the prompt"
    )
    parser.add_argument(
        "--timeout", type=int, default=420, help="QVAC API timeout in seconds"
    )
    args = parser.parse_args()

    workspace = Path(args.workspace).resolve()
    if not (workspace / ".llmwiki" / "index.db").exists():
        print(f"Error: not an llmwiki workspace: {workspace}")
        print("Run: python llmwiki init <workspace>")
        sys.exit(1)

    try:
        doc_id = create_wiki_page(
            workspace,
            topic=args.topic,
            category=args.category,
            tags=args.tags,
            description=args.description,
            custom_prompt=args.prompt,
            links=args.links,
            file_source=args.file_source,
        )
        print(f"\n✓ Created wiki page: {doc_id}")
        target = args.prompt if args.prompt else args.topic
        print(f"  View: {workspace}/wiki/{args.category}/{_sanitize_filename(target)}.md")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
