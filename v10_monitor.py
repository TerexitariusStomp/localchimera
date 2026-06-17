#!/usr/bin/env python3
"""
QVAC-Chimera v10 — Realistic Presenter with Monitor, 16:9 Horizontal
Large monitor on desk beside presenter. Images play ON the monitor.
Natural mouth movement from Kling. Lip sync not available via API.
"""
import requests, json, time, os, subprocess, sys
from pathlib import Path
from gtts import gTTS

API_KEY = "comfyui-192d9441cf1b54096559ec787f6b9278f462d8d37f77bd60db9ce675ed9219c1"
BASE_URL = "https://cloud.comfy.org"
H = {"X-API-Key": API_KEY, "Content-Type": "application/json"}
HJ = {"X-API-Key": API_KEY}

CLIPS_DIR = Path("/home/user/CascadeProjects/qvac-chimera/v10_clips")
CLIPS_DIR.mkdir(exist_ok=True)
FINAL_VIDEO = "/home/user/CascadeProjects/qvac-chimera/qvac_chimera_v10.mp4"
NARRATED_VIDEO = "/home/user/CascadeProjects/qvac-chimera/qvac_chimera_v10_narrated.mp4"

BASE_IMAGE = "caf1afb5a2937da52cab2e19cff2e0261151aa186dac71473618ebd3ecba3ad8.jpg"

SCENES = [
    ("hook",          "a glowing teal sphere pulsing with neon cyan energy in pure black void"),
    ("world",         "planet Earth at night from space with glowing teal neural network lines connecting major cities"),
    ("problem",       "a massive dark data center with cold blue servers, one single teal node isolated and glowing"),
    ("meet_chimera",  "glowing teal network nodes exploding outward from center forming peer-to-peer mesh topology"),
    ("p2p_mesh",      "hundreds of teal spheres connected by bright light beams spreading across dark space"),
    ("you_are_node",  "a single bright teal glowing sphere with concentric light rings in dark space"),
    ("earning",       "golden cryptocurrency coins materializing from teal light streams on black background"),
    ("dual_mine",     "split screen: teal AI neural brain and golden blockchain chain merging with light streams"),
    ("rust_tech",     "teal data packets flowing at light speed through glowing circuit pathways on dark background"),
    ("scale",         "zoom out from single teal node to thousands forming a galactic constellation on black"),
    ("future",        "a glowing teal humanoid silhouette made of network nodes in darkness, arms outstretched"),
    ("cta",           "pure black screen with single blinking teal terminal cursor, cyan light slowly spreading"),
]

SUBTITLES = {
    "hook":          ("What if your laptop", "could earn while you sleep?"),
    "world":         ("Artificial intelligence", "is reshaping everything."),
    "problem":       ("But it is all owned", "by Big Tech."),
    "meet_chimera":  ("QVAC-Chimera", "changes that."),
    "p2p_mesh":      ("A distributed mesh", "of AI nodes."),
    "you_are_node":  ("Your device.", "Your node. Your power."),
    "earning":       ("Earn crypto by running", "real AI inference."),
    "dual_mine":     ("Mine + Infer.", "Simultaneously."),
    "rust_tech":     ("Rust-powered.", "Sub-millisecond latency."),
    "scale":         ("One node becomes", "a global network."),
    "future":        ("The future of AI", "is yours to own."),
    "cta":           ("Chimera", "Join the mesh."),
}

NARRATION = {
    "hook":          "What if your laptop could earn crypto while you sleep?",
    "world":         "Artificial intelligence is reshaping everything.",
    "problem":       "But right now, it is all owned by Big Tech.",
    "meet_chimera":  "QVAC Chimera changes that.",
    "p2p_mesh":      "A distributed mesh of artificial intelligence nodes.",
    "you_are_node":  "Your device. Your node. Your power.",
    "earning":       "Earn crypto by running real AI inference.",
    "dual_mine":     "Mine and infer. Simultaneously.",
    "rust_tech":     "Rust powered. Sub millisecond latency.",
    "scale":         "One node becomes a global network.",
    "future":        "The future of artificial intelligence is yours to own.",
    "cta":           "Join the Chimera mesh today.",
}

def make_workflow(content: str) -> dict:
    prompt = (
        f"The large flatscreen monitor on the desk to the left of the woman now glows brightly displaying {content}. "
        f"The woman remains exactly the same person, talking naturally with realistic mouth and head movement. "
        f"Dark studio background with warm key light and rim light unchanged. "
        f"Subtle teal glow from monitor reflects realistically on the woman's face. "
        f"Photorealistic, cinematic, 4K."
    )
    return {
        "1": {"inputs": {"image": BASE_IMAGE, "upload": "image"}, "class_type": "LoadImage"},
        "2": {
            "inputs": {
                "model_name": "kling-v2-6",
                "start_frame": ["1", 0],
                "prompt": prompt,
                "mode": "pro",
                "duration": 5,
                "generate_audio": False,
            },
            "class_type": "KlingImageToVideoWithAudio",
        },
        "3": {
            "inputs": {"video": ["2", 0], "filename_prefix": "v10", "format": "mp4", "codec": "h264"},
            "class_type": "SaveVideo",
        },
    }

def submit(wf: dict) -> str | None:
    body = {"prompt": wf, "extra_data": {"api_key_comfy_org": API_KEY}}
    try:
        r = requests.post(f"{BASE_URL}/api/prompt", headers=H, json=body, timeout=30)
    except Exception as e:
        print(f"  NET ERR: {e}"); return None
    d = r.json()
    if d.get("node_errors"):
        print(f"  NODE ERR: {json.dumps(d['node_errors'])[:200]}")
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
            print(f"  FAIL: {(s.get('error_message') or '')[:200]}")
            return None
    print("  TIMEOUT"); return None

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

def run_ffmpeg(args):
    cmd = ["ffmpeg", "-y"] + args
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(f"  FFMPEG ERR: {r.stderr[-200:]}")
    return r.returncode == 0

def process_clip(raw: Path, out: Path, sub1: str, sub2: str) -> bool:
    FONT_B = "/usr/share/fonts/google-droid-sans-fonts/DroidSans-Bold.ttf"
    FONT_R = "/usr/share/fonts/google-droid-sans-fonts/DroidSans.ttf"

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
    y1 = "h*0.82" if fs1 <= 36 else "h*0.80"
    y2 = f"{y1}+54" if fs1 <= 36 else f"{y1}+64"

    vf = (
        f"colorchannelmixer=ba=0.06,"
        f"drawtext=fontfile='{FONT_B}':fontsize={fs1}:fontcolor=0x00e5ff@0.95"
        f":text='{s1}':x=(w-text_w)/2:y={y1}:box=1:boxcolor=black@0.5:boxborderw=10,"
        f"drawtext=fontfile='{FONT_R}':fontsize={fs2}:fontcolor=white@0.92"
        f":text='{s2}':x=(w-text_w)/2:y={y2}:box=1:boxcolor=black@0.5:boxborderw=8"
    )
    return run_ffmpeg(["-i", str(raw), "-vf", vf, "-c:v", "libopenh264", "-b:v", "6M",
                       "-pix_fmt", "yuv420p", str(out)])

def generate_narration():
    print("\n=== Generating narration ===")
    segs = []
    for label, _ in SCENES:
        wav = CLIPS_DIR / f"{label}_v10.wav"
        text = NARRATION[label]
        if wav.exists() and wav.stat().st_size > 1000:
            print(f"  CACHED {label}")
        else:
            tts = gTTS(text=text, lang="en", slow=False)
            tts.save(str(wav))
            print(f"  DONE {label} ({wav.stat().st_size:,}B)")
        segs.append(wav)

    concat = CLIPS_DIR / "audio_v10_concat.txt"
    with open(concat, "w") as f:
        for wav in segs:
            f.write(f"file '{wav}'\n")

    full_wav = CLIPS_DIR / "full_narration_v10.wav"
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

    padded = CLIPS_DIR / "narration_padded_v10.wav"
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

def main():
    print("=== QVAC-Chimera v10 — Realistic Presenter + Monitor 16:9 ===")
    print(f"Base image: {BASE_IMAGE}")
    print(f"Scenes: {len(SCENES)} | Target: ~60s\n")

    jobs = {}
    for label, content in SCENES:
        raw = CLIPS_DIR / f"{label}_raw.mp4"
        proc = CLIPS_DIR / f"{label}_proc.mp4"
        if proc.exists() and proc.stat().st_size > 10000:
            print(f"  CACHED  {label}")
            continue
        if raw.exists() and raw.stat().st_size > 10000:
            print(f"  RAW OK  {label}")
            jobs[label] = "local"
            continue
        wf = make_workflow(content)
        pid = submit(wf)
        if pid:
            jobs[label] = pid
            print(f"  SUBMIT  {label} → {pid}")
        else:
            print(f"  FAILED  {label}")
        time.sleep(1)

    pending = [p for p in jobs.values() if p != "local"]
    print(f"\nPolling {len(pending)} jobs...")
    for label, pid in jobs.items():
        if pid == "local":
            continue
        raw = CLIPS_DIR / f"{label}_raw.mp4"
        print(f"  Waiting {label}...", end=" ", flush=True)
        job = poll(pid)
        if not job:
            print("FAILED"); continue
        ok = download(job, raw)
        sz = raw.stat().st_size if ok else 0
        print(f"{'OK' if ok else 'DL FAIL'} ({sz:,}B)")

    print("\nProcessing clips...")
    proc_clips = []
    for label, content in SCENES:
        raw = CLIPS_DIR / f"{label}_raw.mp4"
        proc = CLIPS_DIR / f"{label}_proc.mp4"
        sub1, sub2 = SUBTITLES[label]
        if proc.exists() and proc.stat().st_size > 10000:
            proc_clips.append(proc)
            print(f"  CACHED {label}")
            continue
        if not raw.exists() or raw.stat().st_size < 1000:
            print(f"  MISSING {label}"); continue
        ok = process_clip(raw, proc, sub1, sub2)
        print(f"  {'OK' if ok else 'FAIL'} {label}")
        if ok:
            proc_clips.append(proc)

    if not proc_clips:
        print("ERROR: No clips"); sys.exit(1)

    print(f"\nCompiling {len(proc_clips)} clips → {FINAL_VIDEO}")
    lst = CLIPS_DIR / "concat_list.txt"
    with open(lst, "w") as f:
        for p in proc_clips:
            f.write(f"file '{p}'\n")
    run_ffmpeg(["-f", "concat", "-safe", "0", "-i", str(lst),
                "-c:v", "libopenh264", "-b:v", "8M",
                "-pix_fmt", "yuv420p", FINAL_VIDEO])

    full_wav = generate_narration()
    mix_audio(FINAL_VIDEO, full_wav, NARRATED_VIDEO)

    html = Path("/home/user/CascadeProjects/qvac-chimera/view_v10.html")
    html.write_text(f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>QVAC-Chimera v10</title>
<style>body{{margin:0;background:#000;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh}}
h1{{margin:20px 0 4px;font-size:1.2rem;color:#00e5ff;letter-spacing:0.05em}}
p{{margin:0 0 16px;color:#555;font-size:0.8rem}}
video{{max-height:80vh;max-width:95vw;border-radius:12px;box-shadow:0 0 60px rgba(0,229,255,0.15)}}
.stats{{margin-top:10px;font-size:0.72rem;color:#333}}
</style></head>
<body>
<h1>QVAC-Chimera — v10 Realistic Presenter + Monitor</h1>
<p>1920×1080 · ~60s · 16:9 Horizontal · Realistic · Static · Hard cuts · Narrated</p>
<video controls autoplay loop playsinline>
<source src="{Path(NARRATED_VIDEO).name}" type="video/mp4">
</video>
<div class="stats">12 scenes · Realistic presenter · Monitor displays content · Dark studio · Natural mouth movement · Comfy Cloud</div>
</body></html>""")
    print(f"\n✓ Viewer: {html}")

if __name__ == "__main__":
    main()
