# Upstream Projects

This repo integrates and extends several open-source projects. This document tracks where each comes from, how it is consumed, and how to update it.

## Core Infrastructure

| Project | Upstream Repo | How We Consume | Current Version | Last Checked |
|---|---|---|---|---|
| **QVAC SDK** | `npm:@qvac/sdk` | npm dependency | `^0.13.2` | 2026-06-18 |
| **Pear Runtime** | `npm:pear-runtime` | npm dependency | `^1.0.0` | 2026-06-18 |
| **Hyperswarm** | `npm:hyperswarm` | npm dependency | `^4.0.0` | 2026-06-18 |
| **Hypercore** | `npm:hypercore` | npm dependency | `^10.0.0` | 2026-06-18 |
| **Tauri** | `github:tauri-apps/tauri` | npm + GitHub Actions | `^2.0.0` | 2026-06-18 |
| **Capacitor** | `github:ionic-team/capacitor` | npm + mobile projects | `^7.0.0` | 2026-06-18 |

## Mining Networks

| Project | Upstream Repo | How We Consume | Our Code | Update Method |
|---|---|---|---|---|
| **Cortensor** | `github.com/cortensor/installer` | Protocol integration | `qvac/src/miners/CortensorMiner.js` | Check upstream installer for protocol changes |
| **Chutes** | `github.com/chutesai/chutes-miner` | Protocol integration | `qvac/src/miners/ChutesMiner.js` | Check upstream miner for API changes |
| **Routstr** | `github.com/routstr` | Protocol integration | `qvac/src/miners/RoutstrMiner.js` | Check upstream for NIP-60 / Cashu changes |
| **Fortytwo** | `github.com/Fortytwo-Network` | Protocol integration | `qvac/src/miners/FortytwoMiner.js` | Check upstream for console app changes |
| **Earnidle** | `earnidle.com` | Protocol integration | `qvac/src/miners/EarnidleMiner.js` | Monitor website + protocol docs |

## Wiki / Knowledge Base

| Project | Upstream Repo | How We Consume | Our Code | Update Method |
|---|---|---|---|---|
| **LLMwiki** | `github.com/lucasastorian/llmwiki` | **Git submodule** — vendored in `upstream/llmwiki/` | `qvac/src/llmwiki/bridge.py` | `git submodule update --remote upstream/llmwiki` |
| **Openviking** | `github.com/volcengine/OpenViking` | Concept reference (not integrated) | N/A | Review upstream for indexing ideas |
| **OtterWiki** | `github.com/redimp/otterwiki` | Concept reference | N/A (influence only) | Review upstream for UX ideas |
| **OKF Spec** | `github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md` | Specification reference | `docs/UPSTREAM.md` | Review spec for format changes |

## Tools / File Conversion

| Project | Upstream Repo | How We Consume | Our Code | Update Method |
|---|---|---|---|---|
| **repo-to-markdown** | `github.com/puter-apps/repo-to-markdown` | **Git submodule** — vendored in `upstream/repo-to-markdown/` | `qvac/src/web/repoDigest.js` | `git submodule update --remote upstream/repo-to-markdown` |
| **markitdown** | `github.com/microsoft/markitdown` | **Git submodule** — installed via `requirements.txt` (`-e ../upstream/markitdown/packages/markitdown`) | `qvac/src/web/server.js` (`handleConvertToMd`) | `git submodule update --remote upstream/markitdown` |

## Git Submodules (Upstream Code We Use Directly)

We vendor upstream repos as git submodules so their code is always available and we can import from them directly. This avoids maintaining parallel implementations.

### Initial clone with submodules

```bash
git clone --recurse-submodules https://github.com/TerexitariusStomp/qvac-chimera.git
```

### Update all submodules to latest upstream

```bash
git submodule update --remote --merge
# Commit the updated submodule refs
git add upstream/ && git commit -m "chore: bump upstream submodules"
```

### Individual submodule updates

```bash
git submodule update --remote upstream/markitdown
git submodule update --remote upstream/llmwiki
git submodule update --remote upstream/repo-to-markdown
```

### Current submodules

| Submodule | Path | Installed Via |
|---|---|---|
| `microsoft/markitdown` | `upstream/markitdown/` | `pip install -e upstream/markitdown/packages/markitdown` |
| `lucasastorian/llmwiki` | `upstream/llmwiki/` | Referenced directly; thin wrapper in `qvac/src/llmwiki/` |
| `puter-apps/repo-to-markdown` | `upstream/repo-to-markdown/` | Referenced directly; custom adapter in `qvac/src/web/repoDigest.js` |

## Updating npm Dependencies

```bash
# Check all packages for outdated dependencies
./scripts/update-upstream.sh check

# Update all packages to latest compatible versions
./scripts/update-upstream.sh update

# Update lockfiles after manual edits
./scripts/update-upstream.sh install
```

## Updating QVAC SDK

The QVAC SDK (`@qvac/sdk`) powers all inference. To update:

```bash
cd qvac
npm update @qvac/sdk
# Test inference layer
cd ../sdk
npm test
```

Breaking changes in the SDK may require updates to `qvac/src/inference/QVACSDKWrapper.js` and `qvac/src/inference/LocalLLM.js`.

## Updating Pear / P2P Stack

The Pear P2P stack (`pear-runtime`, `hyperswarm`, `hypercore`) is managed as npm dependencies:

```bash
cd qvac
npm update pear-runtime hyperswarm hypercore @hyperswarm/secret-stream
# Restart the node and verify P2P connections
npm start
```

Breaking changes in Pear may require updates to `qvac/src/p2p/PearP2P.js`.

## Updating Tauri

Tauri is consumed in two places:
1. `apps/desktop/package.json` (npm deps)
2. `apps/desktop/src-tauri/Cargo.toml` (Rust deps)

```bash
cd apps/desktop
npm update @tauri-apps/api @tauri-apps/cli
# Also update Rust deps
cd src-tauri
cargo update
```

## Updating Capacitor (Mobile)

```bash
cd qvac/frontend
npm update @capacitor/core @capacitor/ios @capacitor/android
npx cap sync
```

## Updating Mining Networks

Each mining network integration is custom code that speaks the network's protocol. To keep up to date:

```bash
# Check upstream repos for protocol changes
curl -s https://api.github.com/repos/cortensor/installer/releases/latest | jq -r '.tag_name'
curl -s https://api.github.com/repos/chutesai/chutes-miner/releases/latest | jq -r '.tag_name'
curl -s https://api.github.com/repos/routstr/releases/latest | jq -r '.tag_name'
curl -s https://api.github.com/repos/Fortytwo-Network/releases/latest | jq -r '.tag_name'
```

When upstream changes their protocol or API:
1. Review the upstream release notes
2. Update the corresponding miner in `qvac/src/miners/`
3. Test the miner in isolation
4. Commit with reference to the upstream change

## Updating Wiki / Knowledge Base

These are **conceptual influences**, not vendored code. The implementations in `qvac/src/llmwiki/` and `qvac/src/web/` are custom:

- **LLMwiki** — Our `bridge.py` generates wiki pages via QVAC AI and writes them with YAML frontmatter
- **Openviking** — Our `MarkdownIndexer.js` builds an in-memory index for search and graph queries
- **OtterWiki** — UX influence only; no direct code dependency

To incorporate upstream improvements, compare the upstream repos against our custom implementations and port changes manually.

## Automated Upstream Checks

A GitHub Action runs weekly to check for new upstream releases and opens an issue if any are found. See `.github/workflows/check-upstream.yml`.

It checks:
- All npm packages (`npm outdated`)
- Does NOT yet check GitHub releases for miner protocols (future enhancement)
