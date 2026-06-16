# QVAC-Pear Miner Node — Explain-video narrative plan

## What the viewer should take away
1. The repo is not a single miner service; it is one node with separate inference, storage, P2P, and payment logic.
2. Local AI inference and external mining run as independent subsystems under `NodeManager`.
3. Fund handling is real: protocol multisigs, weekly collection, then 70/30 monthly distribution.
4. The frontend API and MinerManager test suite are real current entry points.

## Reminder for future skill patches
- Update this plan if scenes drift from the actual code paths.
- Never replace the 30/70 split, scheduler windows, or miner names in the scenes.

## Scene list

| Scene | File class | Goal | Dominant color |
| --- | --- | --- | --- |
| 1 | `Scene1_Hook` | Chimera terminal boot with symbol reveal | Blue / Green |
| 2 | `Scene2_BigIdea` | Dual-mode split: inference vs mining, 5 protocols | Blue / Orange |
| 3 | `Scene3_Architecture` | Chimera hub-and-spoke architecture diagram | Cyan |
| 4 | `Scene4_Runtime` | Day/night timeline, parallel miners, task interruption | Orange |
| 5 | `Scene5_FundFlow` | Protocol multisigs, animated sweep, 48h denial | Magenta |
| 6 | `Scene6_DeployCTA` | Docker, one-line embed, cross-platform, GitHub CTA | Green |

## Palette
- Background: `#0A0A0A`
- Primary, secondary, accent: `#00F5FF`, `#FF00FF`, `#39FF14`

## Output expectation
- One `script.py`.
- Draft preview with `manim -ql script.py ...`; stitch with `ffmpeg` to `final.mp4`.
