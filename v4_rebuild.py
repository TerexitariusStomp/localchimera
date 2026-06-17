#!/usr/bin/env python3
"""Rebuild v4 with natural narration and fixed CTA font."""
import subprocess, os, time
from pathlib import Path
from gtts import gTTS

CLIPS = Path("/home/user/CascadeProjects/qvac-chimera/v4_clips")
VIDEO = "/home/user/CascadeProjects/qvac-chimera/qvac_chimera_v4.mp4"
OUT_VIDEO = "/home/user/CascadeProjects/qvac-chimera/qvac_chimera_v4_narrated.mp4"
OUT_HTML = "/home/user/CascadeProjects/qvac-chimera/view_v4.html"

labels = [
    "hook","world","problem","meet_chimera","p2p_mesh","you_are_node",
    "earning","dual_mine","rust_tech","scale","future","cta"
]

subtitles = {
    "hook":          ("What if your laptop","could earn while you sleep?"),
    "world":         ("AI is reshaping","everything."),
    "problem":       ("But it's owned","by Big Tech."),
    "meet_chimera":  ("QVAC-Chimera","changes that."),
    "p2p_mesh":      ("A distributed mesh","of AI nodes."),
    "you_are_node":  ("Your device.","Your node. Your power."),
    "earning":       ("Earn crypto by running","real AI inference."),
    "dual_mine":     ("Mine + Infer.","Simultaneously."),
    "rust_tech":     ("Rust-powered.","Sub-millisecond latency."),
    "scale":         ("One node becomes","a global network."),
    "future":        ("The future of AI","is yours to own."),
    "cta":           ("Chimera","Join the mesh."),
}

narration = {
    "hook":          "What if your laptop could earn crypto while you sleep?",
    "world":         "Artificial intelligence is reshaping everything.",
    "problem":       "But right now, it's all owned by Big Tech.",
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

def run_ffmpeg(args):
    cmd = ["ffmpeg", "-y"] + args
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(f"FFMPEG ERR: {r.stderr[-250:]}")
    return r.returncode == 0

def font_size(text):
    """Tiered font sizes to fit text within 720px."""
    n = len(text)
    if n <= 18:   return 52
    if n <= 24:   return 44
    if n <= 30:   return 36
    if n <= 38:   return 30
    if n <= 46:   return 26
    return 22

# ── Step 1: Re-process CTA clip with corrected font ──────────────────────────
print("=== Re-processing CTA subtitle ===")
cta_raw = CLIPS / "cta_raw.mp4"
cta_proc = CLIPS / "cta_proc.mp4"
if cta_raw.exists():
    s1, s2 = subtitles["cta"]
    tmp = CLIPS / "cta_tmp.mp4"
    run_ffmpeg([
        "-i", str(cta_raw),
        "-vf", "setpts=2.0*PTS,colorchannelmixer=ba=0.08,fade=t=in:st=0:d=0.4,fade=t=out:st=3.6:d=0.4",
        "-r", "8", "-c:v", "libopenh264", "-b:v", "5M", "-pix_fmt", "yuv420p", str(tmp),
    ])
    fs1, fs2 = font_size(s1), font_size(s2)
    y1 = "h*0.76" if fs1 <= 36 else "h*0.74"
    y2 = f"{y1}+58" if fs1 <= 36 else f"{y1}+68"
    # Use unicode right single quote to avoid ffmpeg escaping issues
    def esc(s): return s.replace("\\", "\\\\").replace("'", "\u2019")
    e1, e2 = esc(s1), esc(s2)
    vf = (
        f"drawtext=fontfile=/usr/share/fonts/google-droid-sans-fonts/DroidSans-Bold.ttf"
        f":fontsize={fs1}:fontcolor=0x00e5ff@0.95:text='{e1}':x=(w-text_w)/2:y={y1}"
        f":box=1:boxcolor=black@0.4:boxborderw=8,"
        f"drawtext=fontfile=/usr/share/fonts/google-droid-sans-fonts/DroidSans.ttf"
        f":fontsize={fs2}:fontcolor=white@0.90:text='{e2}':x=(w-text_w)/2:y={y2}"
        f":box=1:boxcolor=black@0.4:boxborderw=6"
    )
    run_ffmpeg(["-i", str(tmp), "-vf", vf, "-c:v", "libopenh264", "-b:v", "6M", "-pix_fmt", "yuv420p", str(cta_proc)])
    tmp.unlink(missing_ok=True)
    print(f"  CTA re-processed: fs1={fs1} fs2={fs2}")
else:
    print("  CTA raw missing!")

# ── Step 2: Generate natural narration (no stretching) ───────────────────────
print("\n=== Generating natural narration ===")
audio_segments = []
for label in labels:
    text = narration[label]
    mp3 = CLIPS / f"{label}_v2.mp3"
    wav = CLIPS / f"{label}_v2_4s.wav"
    audio_segments.append(wav)

    if wav.exists() and wav.stat().st_size > 1000:
        print(f"  CACHED {label}"); continue

    # Generate with gTTS at natural speed (not slow)
    try:
        gTTS(text=text, lang='en', slow=False).save(str(mp3))
    except Exception as e:
        print(f"  FAIL {label}: {e}"); continue

    # Convert to mono 22050Hz wav and pad to exactly 4s with silence
    run_ffmpeg([
        "-i", str(mp3), "-ar", "22050", "-ac", "1",
        "-af", "apad=pad_dur=4", "-t", "4.0",
        "-c:a", "pcm_s16le", str(wav),
    ])
    print(f"  DONE {label} ({wav.stat().st_size:,}B)")
    time.sleep(0.3)

# ── Step 3: Concatenate audio ────────────────────────────────────────────────
print("\n=== Concatenating audio ===")
concat_txt = CLIPS / "audio_v2_concat.txt"
with open(concat_txt, "w") as f:
    for wav in audio_segments:
        if wav.exists():
            f.write(f"file '{wav}'\n")

full_wav = CLIPS / "full_narration_v2.wav"
run_ffmpeg(["-f", "concat", "-safe", "0", "-i", str(concat_txt), "-c", "copy", str(full_wav)])
print(f"  Full audio: {full_wav.stat().st_size:,}B")

# ── Step 4: Recompile full video from updated proc clips ───────────────────
print("\n=== Recompiling full video ===")
proc_clips = [CLIPS / f"{label}_proc.mp4" for label in labels]
concat_vid = CLIPS / "vid_concat.txt"
with open(concat_vid, "w") as f:
    for p in proc_clips:
        if p.exists():
            f.write(f"file '{p}'\n")
run_ffmpeg([
    "-f", "concat", "-safe", "0", "-i", str(concat_vid),
    "-c:v", "libopenh264", "-b:v", "8M", "-pix_fmt", "yuv420p",
    VIDEO,
])

# ── Step 5: Mix with video ───────────────────────────────────────────────────
print("\n=== Mixing narration + video ===")
run_ffmpeg([
    "-i", VIDEO,
    "-i", str(full_wav),
    "-c:v", "copy",
    "-c:a", "aac", "-b:a", "128k",
    "-shortest",
    OUT_VIDEO,
])

# Verify
if os.path.exists(OUT_VIDEO):
    dur = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", OUT_VIDEO],
        capture_output=True, text=True,
    ).stdout.strip()
    sz = os.path.getsize(OUT_VIDEO)
    has_audio = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "a:0",
         "-show_entries", "stream=codec_name", "-of", "default=noprint_wrappers=1:nokey=1", OUT_VIDEO],
        capture_output=True, text=True,
    ).stdout.strip()
    print(f"\n✓ {OUT_VIDEO}")
    print(f"  Duration: {float(dur or 0):.1f}s  Size: {sz/1024/1024:.1f}MB  Audio: {has_audio}")
else:
    print("BUILD FAILED")

# ── Step 5: Update HTML viewer ───────────────────────────────────────────────
with open(OUT_HTML, "w") as f:
    f.write("""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>QVAC-Chimera Viral v4</title>
<style>
body{margin:0;background:#000;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh}
h1{margin:20px 0 4px;font-size:1.2rem;color:#00e5ff;letter-spacing:0.05em}
p{margin:0 0 16px;color:#555;font-size:0.8rem}
video{max-height:90vh;max-width:95vw;border-radius:12px;box-shadow:0 0 60px rgba(0,229,255,0.15)}
.stats{margin-top:10px;font-size:0.72rem;color:#333}
</style>
</head>
<body>
<h1>QVAC-Chimera — Viral v4</h1>
<p>720×1280 · ~60s · SDXL AnimateDiff · 3B1B style · Narrated</p>
<video controls autoplay loop playsinline>
<source src="qvac_chimera_v4_narrated.mp4" type="video/mp4">
</video>
<div class="stats">12 scenes · Juggernaut-XL + mm_sdxl_v10_beta · Teal grade · Comfy Cloud</div>
</body>
</html>
""")
print("\n✓ Viewer updated.")
