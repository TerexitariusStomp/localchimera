#!/usr/bin/env python3
"""
QVAC-Chimera Viral Video v5 — Kling v2.6 Pro on Comfy Cloud
720×1280 vertical · ~50s · 3Blue1Brown-inspired dark teal aesthetic
Uses extra_data.api_key_comfy_org for Partner Node auth
"""
import requests, json, time, os, subprocess, sys
from pathlib import Path

API_KEY = "comfyui-192d9441cf1b54096559ec787f6b9278f462d8d37f77bd60db9ce675ed9219c1"
BASE_URL = "https://cloud.comfy.org"
H = {"X-API-Key": API_KEY, "Content-Type": "application/json"}
HJ = {"X-API-Key": API_KEY}

CLIPS_DIR = Path("/home/user/CascadeProjects/qvac-chimera/v5_clips")
CLIPS_DIR.mkdir(exist_ok=True)
FINAL_VIDEO = "/home/user/CascadeProjects/qvac-chimera/qvac_chimera_v5.mp4"

# ─── Scene definitions ────────────────────────────────────────────────────────
# Kling v2.6 Pro: 9:16 aspect ratio, 5s duration, generate_audio=True for ambient
SCENES = [
    (
        "hook",
        "A single glowing teal sphere pulsing with neon cyan energy floating in pure black void, dramatic cinematic lighting, dark atmosphere, 4K, no text",
        "What if your laptop",
        "could earn while you sleep?",
        100,
    ),
    (
        "world",
        "Earth at night from space with glowing teal neural network lines connecting continents, nodes of bright cyan light, cinematic, ultra-dark space background, 4K",
        "Artificial intelligence",
        "is reshaping everything.",
        200,
    ),
    (
        "problem",
        "Massive dark data center with cold blue server racks disappearing into infinite darkness, single small glowing teal node isolated in the corner, oppressive scale, cinematic",
        "But it is all owned",
        "by Big Tech.",
        300,
    ),
    (
        "meet_chimera",
        "Glowing teal network of interconnected nodes exploding outward from a central point on pure black background, peer-to-peer mesh topology, particles of cyan light, cinematic",
        "QVAC-Chimera",
        "changes that.",
        400,
    ),
    (
        "p2p_mesh",
        "Hundreds of glowing teal spheres connected by thin white light beams spreading across infinite black space, neural network topology visualization, particle system, cinematic 4K",
        "A distributed mesh",
        "of AI nodes.",
        500,
    ),
    (
        "you_are_node",
        "Single bright teal glowing sphere in dark space, camera slowly zooming in, concentric rings of light emanating outward, you are the network, cinematic dark",
        "Your device.",
        "Your node. Your power.",
        600,
    ),
    (
        "earning",
        "Golden coins materializing from streams of teal light data on black background, cryptocurrency symbols dissolving into network nodes, dark cinematic, neon glow",
        "Earn crypto by running",
        "real AI inference.",
        700,
    ),
    (
        "dual_mine",
        "Split dark scene: left side teal AI neural network brain, right side glowing golden blockchain, merging in center with streams of light, cinematic",
        "Mine + Infer.",
        "Simultaneously.",
        800,
    ),
    (
        "rust_tech",
        "Abstract dark visualization of Rust memory model: glowing teal data packets flowing at light speed through zero-copy pathways, circuit board geometry, cinematic",
        "Rust-powered.",
        "Sub-millisecond latency.",
        900,
    ),
    (
        "scale",
        "Zooming out from single teal node to reveal thousands of nodes forming a galactic constellation on black background, epic scale reveal, cinematic, 4K",
        "One node becomes",
        "a global network.",
        1000,
    ),
    (
        "future",
        "Glowing teal humanoid silhouette made of interconnected network nodes standing in pure darkness, arms outstretched, particles of light, cinematic, inspirational",
        "The future of AI",
        "is yours to own.",
        1100,
    ),
    (
        "cta",
        "Minimal pure black screen with single glowing teal terminal cursor blinking, cyan light spreading from center outward like a digital sunrise, clean dark cinematic",
        "Chimera",
        "Join the mesh.",
        1200,
    ),
]

NEG = "watermark, text, logo, people, faces, low quality, blurry, noise, grain, daylight, bright colors, washed out, nsfw"

# ─── Workflow builder ─────────────────────────────────────────────────────────
def make_workflow(prompt: str, seed: int) -> dict:
    return {
        "1": {
            "inputs": {
                "model_name": "kling-v2-6",
                "prompt": f"{prompt}. {NEG}",
                "mode": "pro",
                "aspect_ratio": "9:16",
                "duration": 5,
                "generate_audio": True,
            },
            "class_type": "KlingTextToVideoWithAudio",
        },
        "2": {
            "inputs": {
                "video": ["1", 0],
                "filename_prefix": "v5_scene",
                "format": "mp4",
                "codec": "h264",
            },
            "class_type": "SaveVideo",
        },
    }

# ─── API helpers ──────────────────────────────────────────────────────────────
def submit(wf: dict) -> str | None:
    body = {"prompt": wf, "extra_data": {"api_key_comfy_org": API_KEY}}
    try:
        r = requests.post(f"{BASE_URL}/api/prompt", headers=H, json=body, timeout=30)
    except Exception as e:
        print(f"  NETWORK ERR: {e}")
        return None
    d = r.json()
    if d.get("node_errors"):
        print(f"  NODE ERRORS: {json.dumps(d['node_errors'])[:200]}")
        return None
    return d.get("prompt_id")

def poll(pid: str, timeout: int = 900) -> dict | None:
    start = time.time()
    while time.time() - start < timeout:
        time.sleep(12)
        try:
            s = requests.get(f"{BASE_URL}/api/job/{pid}/status", headers=HJ, timeout=20).json()
        except Exception:
            continue
        status = s.get("status", "")
        if status in ("completed", "success"):
            return requests.get(f"{BASE_URL}/api/jobs/{pid}", headers=HJ, timeout=30).json()
        if status in ("error", "failed"):
            print(f"  FAILED: {(s.get('error_message') or '')[:200]}")
            return None
    print(f"  TIMEOUT after {timeout}s")
    return None

def download(job: dict, dest: Path) -> bool:
    outputs = job.get("outputs", {})
    for node_id, files in outputs.items():
        # Kling wraps outputs: {"animated":[true], "images": [{"filename":"..."}]}
        if isinstance(files, dict) and "images" in files:
            for img in files["images"]:
                if isinstance(img, dict) and "filename" in img:
                    fname = img["filename"]
                    url = f"{BASE_URL}/api/view?filename={fname}&subfolder=&type=output"
                    resp = requests.get(url, headers=HJ, timeout=120, stream=True)
                    with open(dest, "wb") as fh:
                        for chunk in resp.iter_content(65536):
                            fh.write(chunk)
                    return os.path.getsize(dest) > 1000
        # Fallback for flat output format
        for f in (files if isinstance(files, list) else [files]):
            if isinstance(f, dict) and "filename" in f:
                fname = f["filename"]
                url = f"{BASE_URL}/api/view?filename={fname}&subfolder=&type=output"
                resp = requests.get(url, headers=HJ, timeout=120, stream=True)
                with open(dest, "wb") as fh:
                    for chunk in resp.iter_content(65536):
                        fh.write(chunk)
                return os.path.getsize(dest) > 1000
    return False

# ─── FFmpeg helpers ───────────────────────────────────────────────────────────
def run_ffmpeg(args):
    cmd = ["ffmpeg", "-y"] + args
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(f"FFMPEG ERR: {r.stderr[-250:]}")
    return r.returncode == 0

def process_clip(raw: Path, out: Path, sub1: str, sub2: str) -> bool:
    """Slow to 8fps, add teal grade, burn subtitles."""
    tmp = out.with_suffix(".tmp.mp4")
    FONT_B = "/usr/share/fonts/google-droid-sans-fonts/DroidSans-Bold.ttf"
    FONT_R = "/usr/share/fonts/google-droid-sans-fonts/DroidSans.ttf"

    # Pass 1: teal grade + fades (Kling clips are already 5s, no slowdown needed)
    ok = run_ffmpeg([
        "-i", str(raw),
        "-vf", "colorchannelmixer=ba=0.08,fade=t=in:st=0:d=0.4,fade=t=out:st=4.6:d=0.4",
        "-c:v", "libopenh264", "-b:v", "5M",
        "-pix_fmt", "yuv420p",
        str(tmp),
    ])
    if not ok:
        return False

    # Font sizing
    def fs(text):
        n = len(text)
        if n <= 18:   return 52
        if n <= 24:   return 44
        if n <= 30:   return 36
        if n <= 38:   return 30
        return 26

    def esc(s):
        return s.replace("\\", "\\\\").replace("'", "\u2019")

    s1, s2 = esc(sub1), esc(sub2)
    fs1, fs2 = fs(sub1), fs(sub2)
    y1 = "h*0.76" if fs1 <= 36 else "h*0.74"
    y2 = f"{y1}+58" if fs1 <= 36 else f"{y1}+68"

    vf = (
        f"drawtext=fontfile='{FONT_B}':fontsize={fs1}:fontcolor=0x00e5ff@0.95"
        f":text='{s1}':x=(w-text_w)/2:y={y1}:box=1:boxcolor=black@0.4:boxborderw=8,"
        f"drawtext=fontfile='{FONT_R}':fontsize={fs2}:fontcolor=white@0.90"
        f":text='{s2}':x=(w-text_w)/2:y={y2}:box=1:boxcolor=black@0.4:boxborderw=6"
    )
    ok2 = run_ffmpeg([
        "-i", str(tmp),
        "-vf", vf,
        "-c:v", "libopenh264", "-b:v", "6M",
        "-pix_fmt", "yuv420p",
        str(out),
    ])
    tmp.unlink(missing_ok=True)
    return ok2

# ─── Main ─────────────────────────────────────────────────────────────────────
def main():
    print("=== QVAC-Chimera Viral Video v5 (Kling Pro) ===")
    print(f"Scenes: {len(SCENES)} | Resolution: 720×1280 | Target: ~60s\n")

    # ── Step 1: Submit all jobs ──────────────────────────────────────────────
    jobs = {}
    for label, prompt, sub1, sub2, seed in SCENES:
        raw_path = CLIPS_DIR / f"{label}_raw.mp4"
        proc_path = CLIPS_DIR / f"{label}_proc.mp4"
        if proc_path.exists() and os.path.getsize(proc_path) > 10000:
            print(f"  CACHED  {label}")
            continue
        if raw_path.exists() and os.path.getsize(raw_path) > 10000:
            print(f"  RAW OK  {label} — skipping generation")
            jobs[label] = "local"
            continue
        wf = make_workflow(prompt, seed)
        pid = submit(wf)
        if pid:
            jobs[label] = pid
            print(f"  SUBMIT  {label} → {pid}")
        else:
            print(f"  FAILED  {label}")
        time.sleep(1)

    # ── Step 2: Poll + download ──────────────────────────────────────────────
    print(f"\nPolling {len([p for p in jobs.values() if p != 'local'])} jobs...")
    for label, pid in jobs.items():
        if pid == "local":
            continue
        raw_path = CLIPS_DIR / f"{label}_raw.mp4"
        print(f"  Waiting {label}...", end=" ", flush=True)
        job = poll(pid)
        if not job:
            print("FAILED")
            continue
        ok = download(job, raw_path)
        sz = os.path.getsize(raw_path) if ok else 0
        print(f"{'OK' if ok else 'DL FAIL'} ({sz:,}B)")

    # ── Step 3: Process clips ───────────────────────────────────────────────
    print("\nProcessing clips (grade + subtitles + timing)...")
    proc_clips = []
    for label, prompt, sub1, sub2, seed in SCENES:
        raw_path = CLIPS_DIR / f"{label}_raw.mp4"
        proc_path = CLIPS_DIR / f"{label}_proc.mp4"
        if proc_path.exists() and os.path.getsize(proc_path) > 10000:
            proc_clips.append(proc_path)
            print(f"  CACHED  {label}")
            continue
        if not raw_path.exists() or os.path.getsize(raw_path) < 1000:
            print(f"  MISSING {label} — skipping")
            continue
        ok = process_clip(raw_path, proc_path, sub1, sub2)
        print(f"  {'OK' if ok else 'FAIL'} {label}")
        if ok:
            proc_clips.append(proc_path)

    if not proc_clips:
        print("ERROR: No processed clips available")
        sys.exit(1)

    # ── Step 4: Compile final video ──────────────────────────────────────────
    print(f"\nCompiling {len(proc_clips)} clips → {FINAL_VIDEO}")
    list_file = CLIPS_DIR / "concat_list.txt"
    with open(list_file, "w") as f:
        for p in proc_clips:
            f.write(f"file '{p}'\n")

    ok = run_ffmpeg([
        "-f", "concat", "-safe", "0", "-i", str(list_file),
        "-c:v", "libopenh264", "-b:v", "8M",
        "-pix_fmt", "yuv420p",
        FINAL_VIDEO,
    ])
    if ok:
        dur = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", FINAL_VIDEO],
            capture_output=True, text=True
        ).stdout.strip()
        sz = os.path.getsize(FINAL_VIDEO)
        print(f"\n✓ Final video: {FINAL_VIDEO}")
        print(f"  Duration: {float(dur or 0):.1f}s  Size: {sz/1024/1024:.1f}MB")
    else:
        print("COMPILE FAILED")
        sys.exit(1)

if __name__ == "__main__":
    main()
