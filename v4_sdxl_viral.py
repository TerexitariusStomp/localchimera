#!/usr/bin/env python3
"""
QVAC-Chimera Viral Video v4 — SDXL AnimateDiff on Comfy Cloud
720×1280 · ~60s · 3Blue1Brown-inspired dark teal aesthetic
"""

import requests, json, time, os, subprocess, sys, hashlib
from pathlib import Path

API_KEY = "comfyui-192d9441cf1b54096559ec787f6b9278f462d8d37f77bd60db9ce675ed9219c1"
BASE_URL = "https://cloud.comfy.org"
H   = {"X-API-Key": API_KEY}
HJ  = {"Content-Type": "application/json", "X-API-Key": API_KEY}

CLIPS_DIR = Path("/home/user/CascadeProjects/qvac-chimera/v4_clips")
CLIPS_DIR.mkdir(exist_ok=True)
FINAL_VIDEO = "/home/user/CascadeProjects/qvac-chimera/qvac_chimera_v4.mp4"

# ─── Scene definitions ────────────────────────────────────────────────────────
# Each scene: (label, prompt, subtitle_line1, subtitle_line2, seed)
# Generated as 32 frames @ 16fps = 2s raw → slowed to 8fps = 4s each
# 12 scenes × 4s = 48s + transitions/cards ≈ 60s
SCENES = [
    (
        "hook",
        "single glowing teal sphere floating on pure black background, pulsing with neon cyan energy, dramatic cinematic lighting, dark atmosphere, 4K, HDR, no text",
        "What if your laptop",
        "could earn while you sleep?",
        100,
    ),
    (
        "world",
        "earth at night from space with glowing teal neural network overlay connecting continents, nodes of light, cinematic, ultra-dark space background, 4K",
        "AI is reshaping",
        "everything.",
        200,
    ),
    (
        "problem",
        "massive dark data center with cold blue server racks disappearing into infinite darkness, single small glowing node isolated in the corner, oppressive scale, cinematic",
        "But it's owned",
        "by Big Tech.",
        300,
    ),
    (
        "meet_chimera",
        "glowing teal network of interconnected nodes exploding outward from a central point on black background, peer-to-peer mesh topology, particles of cyan light, cinematic",
        "QVAC-Chimera",
        "changes that.",
        400,
    ),
    (
        "p2p_mesh",
        "hundreds of glowing teal spheres connected by white light beams spreading across infinite black space, neural network topology visualization, particle system, cinematic 4K",
        "A distributed mesh",
        "of AI nodes.",
        500,
    ),
    (
        "you_are_node",
        "single bright teal glowing node in dark space, camera slowly zooming in, concentric rings of light emanating outward, you are the network, cinematic dark",
        "Your device.",
        "Your node. Your power.",
        600,
    ),
    (
        "earning",
        "golden coins materializing from streams of teal light data on black background, cryptocurrency symbols dissolving into network nodes, dark cinematic, neon glow",
        "Earn crypto by running",
        "real AI inference.",
        700,
    ),
    (
        "dual_mine",
        "split dark scene: left side teal AI neural network brain, right side glowing golden blockchain, merging in the center with streams of light, cinematic",
        "Mine + Infer.",
        "Simultaneously.",
        800,
    ),
    (
        "rust_tech",
        "abstract dark visualization of Rust memory model: glowing teal data packets flowing at light speed through zero-copy pathways, circuit board geometry, cinematic",
        "Rust-powered.",
        "Sub-millisecond latency.",
        900,
    ),
    (
        "scale",
        "zooming out from single teal node to reveal thousands of nodes forming a galactic constellation on black background, epic scale reveal, cinematic, 4K",
        "One node becomes",
        "a global network.",
        1000,
    ),
    (
        "future",
        "glowing teal humanoid silhouette made of interconnected network nodes standing in pure darkness, arms outstretched, particles of light, cinematic, inspirational",
        "The future of AI",
        "is yours to own.",
        1100,
    ),
    (
        "cta",
        "minimal pure black screen with single glowing teal terminal cursor blinking, cyan light spreading from center outward like a digital sunrise, clean dark cinematic",
        "github.com/TerexitariusStomp/qvac-chimera",
        "Join the mesh.",
        1200,
    ),
]

NEG = "watermark, text, logo, people, faces, low quality, blurry, noise, grain, daylight, bright colors, washed out, nsfw"

# ─── Workflow builder ─────────────────────────────────────────────────────────
def make_workflow(prompt: str, seed: int, frames: int = 32) -> dict:
    return {
        "1": {"inputs": {"ckpt_name": "Juggernaut-XL_v9_RunDiffusionPhoto_v2.safetensors"}, "class_type": "CheckpointLoaderSimple"},
        "2": {"inputs": {"context_length": 16, "context_stride": 1, "context_overlap": 4, "closed_loop": False}, "class_type": "ADE_StandardUniformContextOptions"},
        "3": {"inputs": {"model": ["1", 0], "model_name": "mm_sdxl_v10_beta.ckpt", "beta_schedule": "linear (AnimateDiff-SDXL)", "context_options": ["2", 0], "apply_v2_models_properly": True}, "class_type": "ADE_AnimateDiffLoaderWithContext"},
        "4": {"inputs": {"text": prompt, "clip": ["1", 1]}, "class_type": "CLIPTextEncode"},
        "5": {"inputs": {"text": NEG, "clip": ["1", 1]}, "class_type": "CLIPTextEncode"},
        "6": {"inputs": {"width": 720, "height": 1280, "batch_size": frames}, "class_type": "EmptyLatentImage"},
        "7": {"inputs": {"seed": seed, "steps": 25, "cfg": 7.5, "sampler_name": "euler_ancestral", "scheduler": "karras", "denoise": 1.0, "model": ["3", 0], "positive": ["4", 0], "negative": ["5", 0], "latent_image": ["6", 0]}, "class_type": "KSampler"},
        "8": {"inputs": {"samples": ["7", 0], "vae": ["1", 2]}, "class_type": "VAEDecode"},
        "9": {"inputs": {"images": ["8", 0], "frame_rate": 16, "loop_count": 0, "filename_prefix": "v4_scene", "format": "video/h264-mp4", "pix_fmt": "yuv420p", "crf": 18, "save_metadata": False, "trim_to_audio": False, "pingpong": False, "save_output": True}, "class_type": "VHS_VideoCombine"},
    }

# ─── API helpers ──────────────────────────────────────────────────────────────
def submit(workflow: dict) -> str | None:
    r = requests.post(f"{BASE_URL}/api/prompt", headers=HJ, json={"prompt": workflow}, timeout=30)
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
            s = requests.get(f"{BASE_URL}/api/job/{pid}/status", headers=H, timeout=20).json()
        except Exception:
            continue
        status = s.get("status", "")
        if status in ("completed", "success"):
            return requests.get(f"{BASE_URL}/api/jobs/{pid}", headers=H, timeout=30).json()
        if status in ("error", "failed"):
            print(f"  FAILED: {(s.get('error_message') or '')[:200]}")
            return None
    print(f"  TIMEOUT after {timeout}s")
    return None

def download(job: dict, dest: Path) -> bool:
    outputs = job.get("outputs", {})
    for node_id, files in outputs.items():
        for f in (files if isinstance(files, list) else [files]):
            gifs = f if isinstance(f, dict) else {}
            if "gifs" in gifs:
                for g in gifs["gifs"]:
                    fname = g.get("filename", "")
                    if fname:
                        url = f"{BASE_URL}/api/view?filename={fname}&subfolder=&type=output"
                        resp = requests.get(url, headers=H, timeout=120, stream=True)
                        with open(dest, "wb") as fh:
                            for chunk in resp.iter_content(65536):
                                fh.write(chunk)
                        return os.path.getsize(dest) > 1000
            fname = (f.get("filename") or "") if isinstance(f, dict) else ""
            if fname and (fname.endswith(".mp4") or "mp4" in (f.get("format","") if isinstance(f,dict) else "")):
                url = f"{BASE_URL}/api/view?filename={fname}&subfolder=&type=output"
                resp = requests.get(url, headers=H, timeout=120, stream=True)
                with open(dest, "wb") as fh:
                    for chunk in resp.iter_content(65536):
                        fh.write(chunk)
                return os.path.getsize(dest) > 1000
    return False

# ─── FFmpeg helpers ───────────────────────────────────────────────────────────
def run_ffmpeg(args: list, check: bool = True):
    cmd = ["ffmpeg", "-y"] + args
    result = subprocess.run(cmd, capture_output=True, text=True)
    if check and result.returncode != 0:
        print(f"FFMPEG ERROR: {result.stderr[-300:]}")
    return result.returncode == 0

def process_clip(raw: Path, out: Path, sub1: str, sub2: str) -> bool:
    """Slow to 8fps, add teal grade, burn subtitles via two-pass."""
    tmp = out.with_suffix(".tmp.mp4")
    FONT_B = "/usr/share/fonts/google-droid-sans-fonts/DroidSans-Bold.ttf"
    FONT_R = "/usr/share/fonts/google-droid-sans-fonts/DroidSans.ttf"

    # Pass 1: slow + teal grade + fades
    ok = run_ffmpeg([
        "-i", str(raw),
        "-vf", "setpts=2.0*PTS,colorchannelmixer=ba=0.08,fade=t=in:st=0:d=0.4,fade=t=out:st=3.6:d=0.4",
        "-r", "8",
        "-c:v", "libopenh264", "-b:v", "5M",
        "-pix_fmt", "yuv420p",
        str(tmp),
    ])
    if not ok:
        return False

    # Escape for ffmpeg drawtext (avoid single-quote issues)
    def esc(s):
        return s.replace("\\", "\\\\").replace("'", "\u2019").replace(":", "\\:")

    s1, s2 = esc(sub1), esc(sub2)
    # Auto-shrink font for long text so it fits 720px width
    fs1 = 36 if len(sub1) > 28 else 52
    fs2 = 30 if len(sub2) > 28 else 40
    y1 = "h*0.76" if fs1 < 40 else "h*0.74"
    y2 = "h*0.76+58" if fs1 < 40 else "h*0.74+68"
    # Pass 2: burn two subtitle lines separately using filter_complex
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
    print("=== QVAC-Chimera Viral Video v4 ===")
    print(f"Scenes: {len(SCENES)} | Resolution: 720×1280 | Target: ~60s\n")

    # ── Step 1: Submit all jobs ──────────────────────────────────────────────
    jobs = {}  # label → pid
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
        wf = make_workflow(prompt, seed, frames=32)
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

    # ── Step 3: Process clips ────────────────────────────────────────────────
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
        print("ERROR: No processed clips available"); sys.exit(1)

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
