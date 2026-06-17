#!/usr/bin/env python3
"""
QVAC-Chimera Viral Video v3
- Inspired by: 3Blue1Brown (visual discipline), top runcomfy workflows (LongCat talking avatar style)
- Consistent presenter character across all scenes
- Relatable real-world visuals (not abstract cyberpunk)
- Progressive narrative structure: Hook → Problem → Solution → Benefits → CTA
- 12 scenes × 5s = ~60 seconds total
- All generation on Comfy Cloud (AnimateDiff)
- No local motion generation
"""

import os
import subprocess
import time

import requests

API_KEY = "comfyui-192d9441cf1b54096559ec787f6b9278f462d8d37f77bd60db9ce675ed9219c1"
BASE_URL = "https://cloud.comfy.org"
OUT_DIR = "/home/user/CascadeProjects/qvac-chimera/v3_clips"
VIDEO_PATH = "/home/user/CascadeProjects/qvac-chimera/qvac_chimera_v3.mp4"
W, H = 512, 512

# Consistent character in EVERY scene for relatable viral feel
CHARACTER = "young tech developer with dark hair, wearing a black hoodie"

# Shared cinematic style applied to all scenes
STYLE = "cinematic, sharp focus, high quality, realistic, 30fps, subtle motion, natural lighting"
NEGATIVE = "low quality, blurry, watermark, text, logo, signature, still image, frozen, cartoon, anime"


def api_post(endpoint, payload):
    r = requests.post(f"{BASE_URL}{endpoint}",
                      headers={"Content-Type": "application/json", "X-API-Key": API_KEY},
                      json=payload, timeout=60)
    r.raise_for_status()
    return r.json()


def api_get(endpoint):
    r = requests.get(f"{BASE_URL}{endpoint}",
                     headers={"X-API-Key": API_KEY}, timeout=60)
    r.raise_for_status()
    return r.json()


def submit_workflow(workflow):
    payload = {"prompt": workflow, "client_id": f"v3_{int(time.time())}"}
    data = api_post("/api/prompt", payload)
    if data.get("node_errors"):
        print(f"  Node errors: {data['node_errors']}")
    return data["prompt_id"]


def poll_job(prompt_id, timeout=360):
    start = time.time()
    while time.time() - start < timeout:
        data = api_get(f"/api/job/{prompt_id}/status")
        status = data.get("status")
        if status in ("completed", "success"):
            print(f"  Done in {time.time()-start:.1f}s")
            return True
        elif status in ("error", "failed"):
            print(f"  FAILED: {(data.get('error_message') or '')[:200]}")
            return False
        time.sleep(8)
    print("  TIMEOUT")
    return False


def get_outputs(prompt_id):
    data = api_get(f"/api/jobs/{prompt_id}")
    files = []
    for node_out in data.get("outputs", {}).values():
        for key in ["gifs", "images", "files"]:
            files.extend(node_out.get(key, []))
    return files


def download_file(filename, out_path):
    url = f"{BASE_URL}/api/view?filename={filename}&type=output&subfolder="
    r = requests.get(url, headers={"X-API-Key": API_KEY}, timeout=120, allow_redirects=True)
    r.raise_for_status()
    with open(out_path, "wb") as f:
        f.write(r.content)
    return out_path


def build_animatediff_workflow(prompt, seed, num_frames, prefix):
    return {
        "1": {"inputs": {"ckpt_name": "v1-5-pruned-emaonly-fp16.safetensors"}, "class_type": "CheckpointLoaderSimple"},
        "2": {"inputs": {"text": prompt, "clip": ["1", 1]}, "class_type": "CLIPTextEncode"},
        "3": {"inputs": {"text": NEGATIVE, "clip": ["1", 1]}, "class_type": "CLIPTextEncode"},
        "4": {"inputs": {"width": W, "height": H, "batch_size": num_frames}, "class_type": "EmptyLatentImage"},
        "5": {"inputs": {"model_name": "mm_sd_v15_v2.ckpt"}, "class_type": "ADE_LoadAnimateDiffModel"},
        "6": {"inputs": {"model": ["1", 0], "latents": ["4", 0], "model_name": "mm_sd_v15_v2.ckpt",
                         "unlimited_area_hack": False, "beta_schedule": "sqrt_linear (AnimateDiff)"}, "class_type": "AnimateDiffLoaderV1"},
        "7": {"inputs": {"seed": seed, "steps": 25, "cfg": 7.5, "sampler_name": "euler",
                         "scheduler": "normal", "denoise": 1, "model": ["6", 0],
                         "positive": ["2", 0], "negative": ["3", 0], "latent_image": ["6", 1]}, "class_type": "KSampler"},
        "8": {"inputs": {"samples": ["7", 0], "vae": ["1", 2]}, "class_type": "VAEDecode"},
        "9": {"inputs": {"images": ["8", 0], "frame_rate": 8, "loop_count": 0,
                         "filename_prefix": prefix, "format": "video/h264-mp4",
                         "pix_fmt": "yuv420p", "crf": 19, "save_metadata": True,
                         "trim_to_audio": False, "pingpong": False, "save_output": True}, "class_type": "VHS_VideoCombine"}
    }


def generate_clip(idx, label, prompt, seed, duration=5.0):
    prefix = f"v3_{idx:02d}"
    out = os.path.join(OUT_DIR, f"{prefix}.mp4")
    if os.path.exists(out) and os.path.getsize(out) > 10000:
        print(f"[{idx}] Already exists: {prefix}")
        return out
    print(f"\n[{idx}] {label}")
    frames = min(32, max(16, int(duration * 8)))
    wf = build_animatediff_workflow(f"{prompt}, {STYLE}", seed, frames, prefix)
    pid = submit_workflow(wf)
    if poll_job(pid):
        files = get_outputs(pid)
        if files:
            fn = files[0]["filename"]
            download_file(fn, out)
            sz = os.path.getsize(out)
            print(f"  Saved {out} ({sz:,} bytes)")
            return out if sz > 1000 else None
    return None


def process_clip(clip, label, overlay_text, idx, is_hook=False, is_gold=False):
    """Crop to 9:16, teal color grade, minimal text label."""
    out = os.path.join(OUT_DIR, f"final_{idx:02d}.mp4")
    if os.path.exists(out) and os.path.getsize(out) > 1000:
        return out

    esc = overlay_text.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n")
    color = "#ff4444" if is_hook else ("#ffd700" if is_gold else "#e8e8e8")
    fsize = 46 if is_hook else 38

    vf = (
        f"crop=ih*9/16:ih:(iw-ih*9/16)/2:0,"
        # Subtle teal grade (push shadows blue-green)
        f"curves=r='0/0.04 0.5/0.44 1/0.98':g='0/0.07 0.5/0.52 1/0.95':b='0/0.12 0.5/0.58 1/0.92',"
        f"eq=saturation=0.9:contrast=1.08,"
        f"drawtext=fontfile=/usr/share/fonts/dejavu-sans-mono-fonts/DejaVuSansMono-Bold.ttf:"
        f"text='{esc}':fontcolor={color}@0.92:fontsize={fsize}:"
        f"x=(w-text_w)/2:y=h*0.82:box=0:borderw=3:bordercolor=black@0.9,"
        f"format=yuv420p"
    )

    cmd = ["ffmpeg", "-y", "-i", clip, "-vf", vf, "-r", "30",
           "-c:v", "libopenh264", "-b:v", "2M", "-pix_fmt", "yuv420p", "-an", out]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode == 0 and os.path.exists(out) and os.path.getsize(out) > 1000:
        return out
    return clip


def compile_video(clips, durations):
    concat = os.path.join(OUT_DIR, "v3_concat.txt")
    with open(concat, "w") as f:
        for c in clips:
            f.write(f"file '{c}'\n")
    cmd = [
        "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", concat,
        "-vf", "scale=576:1024:force_original_aspect_ratio=decrease,pad=576:1024:(ow-iw)/2:(oh-ih)/2:black,format=yuv420p",
        "-r", "30", "-c:v", "libopenh264", "-b:v", "2M",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart", VIDEO_PATH
    ]
    subprocess.run(cmd, check=True)
    dur = sum(durations)
    print(f"\nFinal video: {VIDEO_PATH}")
    print(f"Duration: {dur:.1f}s | Format: 576x1024 9:16")


# ─── VIRAL SCRIPT ────────────────────────────────────────────────────────────
# Structure: Hook → Problem → Solution → Tech → Benefits → CTA
# Each scene: (label, visual_prompt, overlay_text, duration_s, is_hook, is_gold)
SCENES = [
    # HOOK - grab attention in first 3 seconds
    (
        "HOOK: AI will be BANNED",
        f"{CHARACTER}, looking shocked at laptop screen, sitting at a dark messy desk, alarm expression, face lit by screen glow, night time, dramatic",
        "AI will be\nBANNED.",
        5.0, True, False
    ),
    (
        "HOOK: But yours cannot be",
        f"{CHARACTER}, leaning back confidently in chair, arms crossed, slight smile, laptop glowing cyan on desk, dark room with subtle neon lights, confident posture",
        "But yours\ncannot be.",
        4.0, True, False
    ),
    # PROBLEM - establish pain point
    (
        "PROBLEM: Centralized AI",
        "massive dark corporate data center building exterior at night, single point of failure, ominous red warning light at top, stormy sky, surveillance cameras, cold architecture",
        "All AI runs\nthrough ONE\ncompany's servers.",
        5.0, False, False
    ),
    (
        "PROBLEM: One switch",
        "close-up of large industrial red power switch labeled SHUTDOWN being slowly pushed down by a suited hand, dramatic lighting, dark background, cinematic",
        "One switch.\nEveryone\ngoes dark.",
        4.0, False, False
    ),
    # SOLUTION - introduce QVAC
    (
        "SOLUTION: Your laptop",
        f"{CHARACTER}, opening laptop at coffee shop, screen glowing with holographic peer-to-peer network visualization above the keyboard, excited discovery expression, warm ambient light",
        "What if YOUR\nlaptop ran\nthe AI?",
        5.0, False, False
    ),
    (
        "SOLUTION: P2P network",
        "top-down aerial view of a neighborhood at night, house windows glowing cyan one by one connecting with thin light beams, forming a web, peaceful and powerful",
        "Every device.\nOne unstoppable\nnetwork.",
        5.0, False, False
    ),
    # HOW IT WORKS - technical but visual
    (
        "TECH: Dual mode",
        f"{CHARACTER}, working intensely at laptop with AI chat open on screen, then yawns and closes laptop lid, golden coins gently floating up from the closed laptop in the dark, magical realism",
        "AI while\nyou work.\nMining while\nyou sleep.",
        5.0, False, False
    ),
    (
        "TECH: 5 protocols auto-switch",
        "close-up of five glowing cryptocurrency logos arranged in a circle on a dark surface, one by one lighting up in sequence, smooth automated selection animation, clean and minimal",
        "5 mining\nprotocols.\nAuto-switches\nfor max profit.",
        5.0, False, True
    ),
    # BENEFITS - the payoff
    (
        "BENEFIT: 70% yours",
        f"{CHARACTER}, looking at phone screen with earnings notification, genuine surprised smile, holding phone up to camera showing a green earnings screen, relatable excited reaction",
        "You keep\n70% of all\nearnings.",
        5.0, False, True
    ),
    (
        "BENEFIT: One command",
        "extreme close-up of hands typing on keyboard, terminal screen in background, single line of docker command being entered, green cursor blinking, satisfying keypress motion",
        "One command.\nThat's all\nyou need.",
        4.0, False, False
    ),
    # CTA - call to action
    (
        "CTA: Join the network",
        f"{CHARACTER}, standing up from desk energetically, pointing directly at camera with confident smile, neon teal light behind them, dark professional background, direct eye contact, speaking to viewer",
        "Join the\ndecentralized\nAI revolution.",
        5.0, False, False
    ),
    (
        "CTA: Link",
        "clean dark screen with a single glowing teal terminal cursor blinking, github URL appearing letter by letter on screen as if being typed, minimal elegant design",
        "github.com/\nTerexitariusStomp\n/qvac-chimera",
        4.0, False, False
    ),
]


def main():
    print("=" * 60)
    print("QVAC-Chimera Viral Video v3")
    print("Relatable presenter | Progressive narrative | ~60s")
    print("All generation on Comfy Cloud (AnimateDiff)")
    print("=" * 60)
    os.makedirs(OUT_DIR, exist_ok=True)

    raw_clips = []
    final_clips = []
    durations = []

    for i, (label, prompt, text, dur, is_hook, is_gold) in enumerate(SCENES):
        seed = 55000 + i * 23
        raw = generate_clip(i, label, prompt, seed, dur)
        if raw:
            raw_clips.append(raw)
            final = process_clip(raw, label, text, i, is_hook, is_gold)
            final_clips.append(final)
            durations.append(dur)

    if final_clips:
        compile_video(final_clips, durations)
        print(f"\nView: http://localhost:8080/view_v3.html")
    else:
        print("No clips generated.")


if __name__ == "__main__":
    main()
