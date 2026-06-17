#!/usr/bin/env python3
"""Add narration to v5 Kling video."""
import subprocess, os
from pathlib import Path
from gtts import gTTS

VIDEO = "/home/user/CascadeProjects/qvac-chimera/qvac_chimera_v5.mp4"
OUT_VIDEO = "/home/user/CascadeProjects/qvac-chimera/qvac_chimera_v5_narrated.mp4"
CLIPS = Path("/home/user/CascadeProjects/qvac-chimera/v5_clips")
CLIPS.mkdir(exist_ok=True)

labels = ["hook","world","problem","meet_chimera","p2p_mesh","you_are_node",
          "earning","dual_mine","rust_tech","scale","future","cta"]

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

def run_ffmpeg(args):
    cmd = ["ffmpeg", "-y"] + args
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(f"FFMPEG ERR: {r.stderr[-250:]}")
    return r.returncode == 0

# ── Generate narration ───────────────────────────────────────────────────────
print("=== Generating narration ===")
audio_segments = []
for label in labels:
    wav = CLIPS / f"{label}_v5.wav"
    text = narration[label]
    if wav.exists() and wav.stat().st_size > 1000:
        print(f"  CACHED {label}")
    else:
        tts = gTTS(text=text, lang="en", slow=False)
        tts.save(str(wav))
        print(f"  DONE {label} ({wav.stat().st_size:,}B)")
    audio_segments.append(wav)

# Concatenate narration audio
concat_txt = CLIPS / "audio_v5_concat.txt"
with open(concat_txt, "w") as f:
    for wav in audio_segments:
        f.write(f"file '{wav}'\n")

full_wav = CLIPS / "full_narration_v5.wav"
run_ffmpeg(["-f", "concat", "-safe", "0", "-i", str(concat_txt), "-c", "copy", str(full_wav)])
print(f"  Full audio: {full_wav.stat().st_size:,}B")

# ── Pad narration to match video length ────────────────────────────────────────
print("\n=== Padding narration to match video ===")
video_dur = float(subprocess.run(
    ["ffprobe", "-v", "error", "-show_entries", "format=duration",
     "-of", "default=noprint_wrappers=1:nokey=1", VIDEO],
    capture_output=True, text=True).stdout.strip() or 0)
narr_dur = float(subprocess.run(
    ["ffprobe", "-v", "error", "-show_entries", "format=duration",
     "-of", "default=noprint_wrappers=1:nokey=1", str(full_wav)],
    capture_output=True, text=True).stdout.strip() or 0)
pad_sec = max(0, video_dur - narr_dur)
print(f"  Video: {video_dur:.1f}s | Narration: {narr_dur:.1f}s | Pad: {pad_sec:.1f}s")

padded_wav = CLIPS / "narration_padded.wav"
if pad_sec > 0.5:
    run_ffmpeg([
        "-i", str(full_wav),
        "-af", f"apad=pad_dur={pad_sec}",
        "-ar", "22050", "-ac", "2",
        str(padded_wav),
    ])
    audio_input = padded_wav
else:
    audio_input = full_wav

# ── Mix narration + video ──────────────────────────────────────────────────────
# Map only video from input 0 and only audio from input 1
# This strips Kling's generated ambient audio entirely
print("\n=== Mixing narration + video ===")
run_ffmpeg([
    "-i", VIDEO,
    "-i", str(audio_input),
    "-map", "0:v:0",
    "-map", "1:a:0",
    "-c:v", "copy",
    "-c:a", "aac", "-b:a", "128k",
    "-shortest",
    OUT_VIDEO,
])

# Verify
dur = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                      "-of", "default=noprint_wrappers=1:nokey=1", OUT_VIDEO],
                     capture_output=True, text=True).stdout.strip()
a_tracks = subprocess.run(
    ["ffprobe", "-v", "error", "-select_streams", "a",
     "-show_entries", "stream=codec_name,channels,duration",
     "-of", "default=noprint_wrappers=1", OUT_VIDEO],
    capture_output=True, text=True).stdout.strip()
sz = os.path.getsize(OUT_VIDEO)
print(f"\n✓ {OUT_VIDEO}")
print(f"  Duration: {float(dur or 0):.1f}s  Size: {sz/1024/1024:.1f}MB")
print(f"  Audio tracks:\n{a_tracks}")
