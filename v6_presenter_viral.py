#!/usr/bin/env python3
"""
QVAC-Chimera Viral Video v6 — Presenter + Screen format
Kling v2.6 Pro on Comfy Cloud
Each scene: AI avatar presenter on left, monitor showing content on right
1080×1920 vertical · ~60s · Narrated
"""
import requests, json, time, os, subprocess, sys
from pathlib import Path

API_KEY = "comfyui-192d9441cf1b54096559ec787f6b9278f462d8d37f77bd60db9ce675ed9219c1"
BASE_URL = "https://cloud.comfy.org"
H = {"X-API-Key": API_KEY, "Content-Type": "application/json"}
HJ = {"X-API-Key": API_KEY}

CLIPS_DIR = Path("/home/user/CascadeProjects/qvac-chimera/v6_clips")
CLIPS_DIR.mkdir(exist_ok=True)
FINAL_VIDEO = "/home/user/CascadeProjects/qvac-chimera/qvac_chimera_v6.mp4"
NARRATED_VIDEO = "/home/user/CascadeProjects/qvac-chimera/qvac_chimera_v6_narrated.mp4"

# Presenter persona: holographic digital AI woman, tech aesthetic, dark studio
PRESENTER_PREFIX = (
    "A sleek holographic digital AI woman avatar standing on the left third of frame, "
    "facing slightly toward the camera with confident expression, "
    "next to a large vertical monitor screen on the right displaying: "
)

SCENES = [
    (
        "hook",
        "a glowing teal sphere pulsing with energy in pure black void, cinematic 4K",
        "What if your laptop",
        "could earn while you sleep?",
        100,
    ),
    (
        "world",
        "Earth at night with glowing teal neural network lines connecting cities, cinematic",
        "Artificial intelligence",
        "is reshaping everything.",
        200,
    ),
    (
        "problem",
        "massive dark data center with cold blue servers, single teal node isolated, cinematic",
        "But it is all owned",
        "by Big Tech.",
        300,
    ),
    (
        "meet_chimera",
        "glowing teal network nodes exploding outward from center on black, peer-to-peer mesh, cinematic",
        "QVAC-Chimera",
        "changes that.",
        400,
    ),
    (
        "p2p_mesh",
        "hundreds of teal spheres connected by light beams spreading across black space, neural network, cinematic 4K",
        "A distributed mesh",
        "of AI nodes.",
        500,
    ),
    (
        "you_are_node",
        "single bright teal glowing sphere in dark space, concentric light rings, cinematic",
        "Your device.",
        "Your node. Your power.",
        600,
    ),
    (
        "earning",
        "golden coins materializing from teal light streams on black background, cryptocurrency symbols, cinematic",
        "Earn crypto by running",
        "real AI inference.",
        700,
    ),
    (
        "dual_mine",
        "split scene: left teal AI brain, right golden blockchain, merging with light streams, cinematic",
        "Mine + Infer.",
        "Simultaneously.",
        800,
    ),
    (
        "rust_tech",
        "abstract teal data packets flowing at light speed through circuit pathways, dark background, cinematic",
        "Rust-powered.",
        "Sub-millisecond latency.",
        900,
    ),
    (
        "scale",
        "zoom out from single teal node to thousands forming galactic constellation on black, epic, cinematic",
        "One node becomes",
        "a global network.",
        1000,
    ),
    (
        "future",
        "glowing teal humanoid silhouette made of network nodes in darkness, arms outstretched, inspirational, cinematic",
        "The future of AI",
        "is yours to own.",
        1100,
    ),
    (
        "cta",
        "pure black screen with single teal terminal cursor blinking, cyan light spreading like digital sunrise, minimal",
        "Chimera",
        "Join the mesh.",
        1200,
    ),
]

NEG = "watermark, text, logo, low quality, blurry, noise, grain, daylight, bright colors, washed out, nsfw"

# ─── Workflow builder ─────────────────────────────────────────────────────────
def make_workflow(prompt: str, seed: int) -> dict:
    full_prompt = f"{PRESENTER_PREFIX}{prompt}. Dark futuristic studio, teal ambient lighting, holographic glow on presenter, cinematic, 9:16 vertical, 4K, no text. {NEG}"
    return {
        "1": {
            "inputs": {
                "model_name": "kling-v2-6",
                "prompt": full_prompt,
                "mode": "pro",
                "aspect_ratio": "9:16",
                "duration": 5,
                "generate_audio": False,  # We'll add our own narration
            },
            "class_type": "KlingTextToVideoWithAudio",
        },
        "2": {
            "inputs": {
                "video": ["1", 0],
                "filename_prefix": "v6_scene",
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
    return False

# ─── FFmpeg helpers ───────────────────────────────────────────────────────────
def run_ffmpeg(args):
    cmd = ["ffmpeg", "-y"] + args
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(f"  FFMPEG ERR: {r.stderr[-200:]}")
    return r.returncode == 0

def process_clip(raw: Path, out: Path, sub1: str, sub2: str) -> bool:
    tmp = out.with_suffix(".tmp.mp4")
    FONT_B = "/usr/share/fonts/google-droid-sans-fonts/DroidSans-Bold.ttf"
    FONT_R = "/usr/share/fonts/google-droid-sans-fonts/DroidSans.ttf"

    ok = run_ffmpeg([
        "-i", str(raw),
        "-vf", "colorchannelmixer=ba=0.08,fade=t=in:st=0:d=0.4,fade=t=out:st=4.6:d=0.4",
        "-c:v", "libopenh264", "-b:v", "5M",
        "-pix_fmt", "yuv420p",
        str(tmp),
    ])
    if not ok:
        return False

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

# ─── Narration ────────────────────────────────────────────────────────────────
def generate_narration():
    from gtts import gTTS
    labels = [s[0] for s in SCENES]
    narration = {
        "hook":          "What if your laptop could earn crypto while you sleep?",
        "world":         "Artificial intelligence is reshaping everything.",
        "problem":       "But right now, it is all owned by Big Tech.",
        "meet_chimera":  "QVAC Chimera changes that.",
        "p2p_mesh":      "A distributed mesh of artificial intelligence nodes.",
        "you_are_node":  "Your device. Your node. Your power.",
        "earning":       "Earn crypto by running real artificial intelligence inference.",
        "dual_mine":     "Mine and infer. Simultaneously.",
        "rust_tech":     "Rust powered. Sub millisecond latency.",
        "scale":         "One node becomes a global network.",
        "future":        "The future of artificial intelligence is yours to own.",
        "cta":           "Join the Chimera mesh today.",
    }

    print("\n=== Generating narration ===")
    segs = []
    for label in labels:
        wav = CLIPS_DIR / f"{label}_v6.wav"
        if wav.exists() and wav.stat().st_size > 1000:
            print(f"  CACHED {label}")
        else:
            tts = gTTS(text=narration[label], lang="en", slow=False)
            tts.save(str(wav))
            print(f"  DONE {label} ({wav.stat().st_size:,}B)")
        segs.append(wav)

    concat = CLIPS_DIR / "audio_v6_concat.txt"
    with open(concat, "w") as f:
        for wav in segs:
            f.write(f"file '{wav}'\n")

    full_wav = CLIPS_DIR / "full_narration_v6.wav"
    run_ffmpeg(["-f", "concat", "-safe", "0", "-i", str(concat), "-c", "copy", str(full_wav)])
    print(f"  Full audio: {full_wav.stat().st_size:,}B")
    return full_wav

def mix_audio(video: str, audio_wav: Path, out: str):
    print("\n=== Mixing narration + video ===")
    video_dur = float(subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", video],
        capture_output=True, text=True).stdout.strip() or 0)
    narr_dur = float(subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(audio_wav)],
        capture_output=True, text=True).stdout.strip() or 0)
    pad = max(0, video_dur - narr_dur)
    print(f"  Video: {video_dur:.1f}s | Narration: {narr_dur:.1f}s | Pad: {pad:.1f}s")

    padded = CLIPS_DIR / "narration_padded_v6.wav"
    if pad > 0.5:
        run_ffmpeg(["-i", str(audio_wav), "-af", f"apad=pad_dur={pad}",
                    "-ar", "22050", "-ac", "2", str(padded)])
        audio_in = padded
    else:
        audio_in = audio_wav

    run_ffmpeg([
        "-i", video, "-i", str(audio_in),
        "-map", "0:v:0", "-map", "1:a:0",
        "-c:v", "copy", "-c:a", "aac", "-b:a", "128k",
        "-shortest", out,
    ])
    dur = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", out],
        capture_output=True, text=True).stdout.strip()
    sz = os.path.getsize(out)
    print(f"\n✓ {out}")
    print(f"  Duration: {float(dur or 0):.1f}s  Size: {sz/1024/1024:.1f}MB")

# ─── Main ─────────────────────────────────────────────────────────────────────
def main():
    print("=== QVAC-Chimera v6 — Presenter + Screen (Kling Pro) ===")
    print(f"Scenes: {len(SCENES)} | Resolution: 1080×1920 | Target: ~60s\n")

    # Step 1: Submit
    jobs = {}
    for label, content, s1, s2, seed in SCENES:
        raw = CLIPS_DIR / f"{label}_raw.mp4"
        proc = CLIPS_DIR / f"{label}_proc.mp4"
        if proc.exists() and proc.stat().st_size > 10000:
            print(f"  CACHED  {label}")
            continue
        if raw.exists() and raw.stat().st_size > 10000:
            print(f"  RAW OK  {label}")
            jobs[label] = "local"
            continue
        wf = make_workflow(content, seed)
        pid = submit(wf)
        if pid:
            jobs[label] = pid
            print(f"  SUBMIT  {label} → {pid}")
        else:
            print(f"  FAILED  {label}")
        time.sleep(1)

    # Step 2: Poll
    print(f"\nPolling {len([p for p in jobs.values() if p != 'local'])} jobs...")
    for label, pid in jobs.items():
        if pid == "local":
            continue
        raw = CLIPS_DIR / f"{label}_raw.mp4"
        print(f"  Waiting {label}...", end=" ", flush=True)
        job = poll(pid)
        if not job:
            print("FAILED")
            continue
        ok = download(job, raw)
        sz = raw.stat().st_size if ok else 0
        print(f"{'OK' if ok else 'DL FAIL'} ({sz:,}B)")

    # Step 3: Process
    print("\nProcessing clips...")
    proc_clips = []
    for label, content, s1, s2, seed in SCENES:
        raw = CLIPS_DIR / f"{label}_raw.mp4"
        proc = CLIPS_DIR / f"{label}_proc.mp4"
        if proc.exists() and proc.stat().st_size > 10000:
            proc_clips.append(proc)
            print(f"  CACHED {label}")
            continue
        if not raw.exists() or raw.stat().st_size < 1000:
            print(f"  MISSING {label}")
            continue
        ok = process_clip(raw, proc, s1, s2)
        print(f"  {'OK' if ok else 'FAIL'} {label}")
        if ok:
            proc_clips.append(proc)

    if not proc_clips:
        print("ERROR: No clips")
        sys.exit(1)

    # Step 4: Compile
    print(f"\nCompiling {len(proc_clips)} clips → {FINAL_VIDEO}")
    lst = CLIPS_DIR / "concat_list.txt"
    with open(lst, "w") as f:
        for p in proc_clips:
            f.write(f"file '{p}'\n")
    run_ffmpeg([
        "-f", "concat", "-safe", "0", "-i", str(lst),
        "-c:v", "libopenh264", "-b:v", "8M",
        "-pix_fmt", "yuv420p", FINAL_VIDEO,
    ])

    # Step 5: Narration
    full_wav = generate_narration()
    mix_audio(FINAL_VIDEO, full_wav, NARRATED_VIDEO)

    # Step 6: Viewer
    html = Path("/home/user/CascadeProjects/qvac-chimera/view_v6.html")
    html.write_text(f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>QVAC-Chimera v6</title>
<style>body{{margin:0;background:#000;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh}}
h1{{margin:20px 0 4px;font-size:1.2rem;color:#00e5ff;letter-spacing:0.05em}}
p{{margin:0 0 16px;color:#555;font-size:0.8rem}}
video{{max-height:90vh;max-width:95vw;border-radius:12px;box-shadow:0 0 60px rgba(0,229,255,0.15)}}
.stats{{margin-top:10px;font-size:0.72rem;color:#333}}
</style></head>
<body>
<h1>QVAC-Chimera — v6 Presenter</h1>
<p>1080×1920 · ~60s · Kling v2.6 Pro · AI Avatar + Screen · Narrated</p>
<video controls autoplay loop playsinline>
<source src="{Path(NARRATED_VIDEO).name}" type="video/mp4">
</video>
<div class="stats">12 scenes · Holographic AI Avatar · Screen content · Teal grade · Comfy Cloud</div>
</body></html>""")
    print(f"\n✓ Viewer: {html}")

if __name__ == "__main__":
    main()
