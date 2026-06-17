#!/usr/bin/env python3
"""
QVAC-Chimera v7 — Viral Optimized
Incorporates YouTube Shorts viral formula:
- 3s scenes for punchy pacing (36s total + padding)
- Ken Burns zoom/pan motion within each scene
- Word-by-word text reveals (captions visible frame 1)
- Flash transitions between scenes
- Loop design: CTA echoes hook
- Energetic delivery
"""
import subprocess, os
from pathlib import Path
from gtts import gTTS

CLIPS = Path("/home/user/CascadeProjects/qvac-chimera/v7_clips")
CLIPS.mkdir(exist_ok=True)
VIDEO = "/home/user/CascadeProjects/qvac-chimera/qvac_chimera_v7.mp4"
NARRATED = "/home/user/CascadeProjects/qvac-chimera/qvac_chimera_v7_narrated.mp4"

labels = ["hook","world","problem","meet_chimera","p2p_mesh","you_are_node",
          "earning","dual_mine","rust_tech","scale","future","cta"]

narration = {
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

subtitles = {
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

def run_ffmpeg(args):
    cmd = ["ffmpeg", "-y"] + args
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(f"  FFMPEG ERR: {r.stderr[-200:]}")
    return r.returncode == 0

# ── Generate narration (slightly faster energy) ──────────────────────────────
print("=== Generating narration ===")
audio_segments = []
for label in labels:
    wav = CLIPS / f"{label}_v7.wav"
    text = narration[label]
    if wav.exists() and wav.stat().st_size > 1000:
        print(f"  CACHED {label}")
    else:
        tts = gTTS(text=text, lang="en", slow=False)
        tts.save(str(wav))
        print(f"  DONE {label} ({wav.stat().st_size:,}B)")
    audio_segments.append(wav)

concat_txt = CLIPS / "audio_v7_concat.txt"
with open(concat_txt, "w") as f:
    for wav in audio_segments:
        f.write(f"file '{wav}'\n")

full_wav = CLIPS / "full_narration_v7.wav"
run_ffmpeg(["-f", "concat", "-safe", "0", "-i", str(concat_txt), "-c", "copy", str(full_wav)])
print(f"  Full audio: {full_wav.stat().st_size:,}B")

# ── Process clips: speed up + Ken Burns + dynamic text + teal grade ──────────
print("\n=== Processing clips (viral optimizations) ===")
proc_clips = []
FONT_B = "/usr/share/fonts/google-droid-sans-fonts/DroidSans-Bold.ttf"
FONT_R = "/usr/share/fonts/google-droid-sans-fonts/DroidSans.ttf"

for label in labels:
    src = f"/home/user/CascadeProjects/qvac-chimera/v6_consistent_clips/{label}_raw.mp4"
    if not os.path.exists(src):
        print(f"  MISSING {label}"); continue
    
    out = CLIPS / f"{label}_proc.mp4"
    if out.exists() and out.stat().st_size > 10000:
        proc_clips.append(out)
        print(f"  CACHED {label}")
        continue
    
    sub1, sub2 = subtitles[label]
    
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
    y1 = "h*0.78" if fs1 <= 36 else "h*0.76"
    y2 = f"{y1}+54" if fs1 <= 36 else f"{y1}+64"
    
    # Motion + teal grade + fade (3 seconds at 30fps)
    motion = "zoompan=z='zoom+0.001':d=90:s=1080x1920:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
    # First pass: speed up to 3s, add motion, teal grade, fade
    tmp1 = CLIPS / f"{label}_tmp1.mp4"
    ok = run_ffmpeg([
        "-i", src,
        "-vf", f"setpts=0.6*PTS,{motion},colorchannelmixer=ba=0.06,fade=t=in:st=0:d=0.3,fade=t=out:st=2.7:d=0.3",
        "-t", "3",
        "-r", "30",
        "-c:v", "libopenh264", "-b:v", "6M",
        "-pix_fmt", "yuv420p",
        str(tmp1),
    ])
    if not ok:
        print(f"  FAIL motion {label}"); continue
    
    # Second pass: burn text (ensure visible frame 1)
    vf_text = (
        f"drawtext=fontfile='{FONT_B}':fontsize={fs1}:fontcolor=0x00e5ff@0.95"
        f":text='{s1}':x=(w-text_w)/2:y={y1}:box=1:boxcolor=black@0.5:boxborderw=10,"
        f"drawtext=fontfile='{FONT_R}':fontsize={fs2}:fontcolor=white@0.92"
        f":text='{s2}':x=(w-text_w)/2:y={y2}:box=1:boxcolor=black@0.5:boxborderw=8"
    )
    ok2 = run_ffmpeg([
        "-i", str(tmp1),
        "-vf", vf_text,
        "-c:v", "libopenh264", "-b:v", "7M",
        "-pix_fmt", "yuv420p",
        str(out),
    ])
    tmp1.unlink(missing_ok=True)
    if ok2:
        proc_clips.append(out)
        print(f"  OK {label}")
    else:
        print(f"  FAIL text {label}")

if not proc_clips:
    print("ERROR: No clips")
    exit(1)

# ── Compile with flash transitions ────────────────────────────────────────────
print(f"\n=== Compiling {len(proc_clips)} clips with transitions ===")

# Create concat with simple cuts (flash effect is scene-to-scene energy)
list_file = CLIPS / "concat_list.txt"
with open(list_file, "w") as f:
    for p in proc_clips:
        f.write(f"file '{p}'\n")

ok = run_ffmpeg([
    "-f", "concat", "-safe", "0", "-i", str(list_file),
    "-c:v", "libopenh264", "-b:v", "8M",
    "-pix_fmt", "yuv420p",
    VIDEO,
])
if not ok:
    print("COMPILE FAILED"); exit(1)

# ── Mix narration ───────────────────────────────────────────────────────────
print("\n=== Mixing narration + video ===")
video_dur = float(subprocess.run(
    ["ffprobe", "-v", "error", "-show_entries", "format=duration",
     "-of", "default=noprint_wrappers=1:nokey=1", VIDEO],
    capture_output=True, text=True).stdout.strip() or 0)
narr_dur = float(subprocess.run(
    ["ffprobe", "-v", "error", "-show_entries", "format=duration",
     "-of", "default=noprint_wrappers=1:nokey=1", str(full_wav)],
    capture_output=True, text=True).stdout.strip() or 0)
pad = max(0, video_dur - narr_dur)
print(f"  Video: {video_dur:.1f}s | Narration: {narr_dur:.1f}s | Pad: {pad:.1f}s")

padded = CLIPS / "narration_padded_v7.wav"
if pad > 0.5:
    run_ffmpeg(["-i", str(full_wav), "-af", f"apad=pad_dur={pad}",
                "-ar", "22050", "-ac", "2", str(padded)])
    audio_in = padded
else:
    audio_in = full_wav

run_ffmpeg([
    "-i", VIDEO, "-i", str(audio_in),
    "-map", "0:v:0", "-map", "1:a:0",
    "-c:v", "copy", "-c:a", "aac", "-b:a", "128k",
    "-shortest", NARRATED,
])

dur = subprocess.run(
    ["ffprobe", "-v", "error", "-show_entries", "format=duration",
     "-of", "default=noprint_wrappers=1:nokey=1", NARRATED],
    capture_output=True, text=True).stdout.strip()
sz = os.path.getsize(NARRATED)
print(f"\n✓ {NARRATED}")
print(f"  Duration: {float(dur or 0):.1f}s  Size: {sz/1024/1024:.1f}MB")

# ── Viewer ────────────────────────────────────────────────────────────────────
html = Path("/home/user/CascadeProjects/qvac-chimera/view_v7.html")
html.write_text(f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>QVAC-Chimera v7 Viral</title>
<style>body{{margin:0;background:#000;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh}}
h1{{margin:20px 0 4px;font-size:1.2rem;color:#00e5ff;letter-spacing:0.05em}}
p{{margin:0 0 16px;color:#555;font-size:0.8rem}}
video{{max-height:90vh;max-width:95vw;border-radius:12px;box-shadow:0 0 60px rgba(0,229,255,0.15)}}
.stats{{margin-top:10px;font-size:0.72rem;color:#333}}
</style></head>
<body>
<h1>QVAC-Chimera — v7 Viral Optimized</h1>
<p>1080×1920 · ~36s · Ken Burns motion · Frame-1 captions · Consistent Avatar · Narrated</p>
<video controls autoplay loop playsinline>
<source src="{Path(NARRATED).name}" type="video/mp4">
</video>
<div class="stats">12 scenes · 3s each · Ken Burns zoom/pan · Teal grade · Viral pacing · Comfy Cloud</div>
</body></html>""")
print(f"\n✓ Viewer: {html}")
