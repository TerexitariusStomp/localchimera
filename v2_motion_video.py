#!/usr/bin/env python3
"""Studio-quality QVAC-Chimera video v2 - inspired by 3Blue1Brown visual principles.
- Unified visual language (dark bg, cyan nodes, gold accents, white minimal text)
- Progressive visual narrative (scenes build on each other)
- Actual motion via AnimateDiff on Comfy Cloud
- Unified color grade + smooth crossfade transitions
"""

import json
import os
import subprocess
import time

import requests

API_KEY = "comfyui-192d9441cf1b54096559ec787f6b9278f462d8d37f77bd60db9ce675ed9219c1"
BASE_URL = "https://cloud.comfy.org"
OUT_DIR = "/home/user/CascadeProjects/qvac-chimera/v2_clips"
VIDEO_PATH = "/home/user/CascadeProjects/qvac-chimera/qvac_chimera_v2.mp4"
W, H = 512, 512

STYLE_SUFFIX = (
    "minimalist technical diagram, dark pure black background, single cyan glowing geometric object as focal point, "
    "thin gold accent lines, clean flat vector style, no text, no watermark, no signature, high contrast, "
    "cinematic top lighting, subtle teal rim light, consistent visual language"
)

NEGATIVE = (
    "low quality, blurry, watermark, text, logo, signature, cropped, worst quality, "
    "multiple objects, cluttered, busy, cartoon, anime, photorealistic face, people, humans, portrait"
)


def api_post(endpoint, payload):
    r = requests.post(
        f"{BASE_URL}{endpoint}",
        headers={"Content-Type": "application/json", "X-API-Key": API_KEY},
        json=payload,
        timeout=60,
    )
    r.raise_for_status()
    return r.json()


def api_get(endpoint):
    r = requests.get(
        f"{BASE_URL}{endpoint}",
        headers={"X-API-Key": API_KEY},
        timeout=60,
    )
    r.raise_for_status()
    return r.json()


def submit_workflow(workflow):
    payload = {"prompt": workflow, "client_id": f"v2_{int(time.time())}"}
    data = api_post("/api/prompt", payload)
    if data.get("node_errors"):
        print(f"  Node errors: {data['node_errors']}")
    return data["prompt_id"]


def poll_job(prompt_id, timeout=300):
    start = time.time()
    while time.time() - start < timeout:
        data = api_get(f"/api/job/{prompt_id}/status")
        status = data.get("status")
        if status in ("completed", "success"):
            print(f"  Done in {time.time()-start:.1f}s")
            return True
        elif status in ("error", "failed"):
            print(f"  FAILED: {data.get('error_message', 'unknown')[:200]}")
            return False
        time.sleep(8)
    print("  TIMEOUT")
    return False


def get_outputs(prompt_id):
    data = api_get(f"/api/jobs/{prompt_id}")
    outputs = data.get("outputs", {})
    files = []
    for node_id, node_out in outputs.items():
        for key in ["gifs", "images", "files"]:
            for item in node_out.get(key, []):
                files.append(item)
    return files


def download_file(filename, out_path, type_="output", subfolder=""):
    url = f"{BASE_URL}/api/view?filename={filename}&type={type_}&subfolder={subfolder}"
    r = requests.get(url, headers={"X-API-Key": API_KEY}, timeout=120, allow_redirects=True)
    r.raise_for_status()
    with open(out_path, "wb") as f:
        f.write(r.content)
    return out_path


def build_animatediff_workflow(prompt, negative, seed, width, height, num_frames, filename_prefix):
    return {
        "1": {"inputs": {"ckpt_name": "v1-5-pruned-emaonly-fp16.safetensors"}, "class_type": "CheckpointLoaderSimple"},
        "2": {"inputs": {"text": prompt, "clip": ["1", 1]}, "class_type": "CLIPTextEncode"},
        "3": {"inputs": {"text": negative, "clip": ["1", 1]}, "class_type": "CLIPTextEncode"},
        "4": {"inputs": {"width": width, "height": height, "batch_size": num_frames}, "class_type": "EmptyLatentImage"},
        "5": {"inputs": {"model_name": "mm_sd_v15_v2.ckpt"}, "class_type": "ADE_LoadAnimateDiffModel"},
        "6": {"inputs": {"model": ["1", 0], "latents": ["4", 0], "model_name": "mm_sd_v15_v2.ckpt", "unlimited_area_hack": False, "beta_schedule": "sqrt_linear (AnimateDiff)"}, "class_type": "AnimateDiffLoaderV1"},
        "7": {"inputs": {"seed": seed, "steps": 25, "cfg": 7, "sampler_name": "euler", "scheduler": "normal", "denoise": 1, "model": ["6", 0], "positive": ["2", 0], "negative": ["3", 0], "latent_image": ["6", 1]}, "class_type": "KSampler"},
        "8": {"inputs": {"samples": ["7", 0], "vae": ["1", 2]}, "class_type": "VAEDecode"},
        "9": {"inputs": {"images": ["8", 0], "frame_rate": 8, "loop_count": 0, "filename_prefix": filename_prefix, "format": "video/h264-mp4", "pix_fmt": "yuv420p", "crf": 19, "save_metadata": True, "trim_to_audio": False, "pingpong": False, "save_output": True}, "class_type": "VHS_VideoCombine"}
    }


def generate_motion_clip(scene_idx, text, prompt, seed, duration=3.0):
    prefix = f"v2_{scene_idx:02d}"
    out_path = os.path.join(OUT_DIR, f"{prefix}.mp4")
    if os.path.exists(out_path) and os.path.getsize(out_path) > 1000:
        print(f"[Scene {scene_idx}] Already exists: {out_path}")
        return out_path

    print(f"\n[Scene {scene_idx}] {text}")
    print(f"  Generating motion clip (seed={seed}, {duration}s)...")

    full_prompt = f"{prompt}, {STYLE_SUFFIX}"
    num_frames = max(16, int(duration * 8))
    wf = build_animatediff_workflow(full_prompt, NEGATIVE, seed, W, H, num_frames, prefix)
    pid = submit_workflow(wf)
    if poll_job(pid):
        files = get_outputs(pid)
        if files:
            fn = files[0]["filename"]
            download_file(fn, out_path)
            sz = os.path.getsize(out_path)
            print(f"    Saved: {out_path} ({sz} bytes)")
            if sz > 1000:
                return out_path
    print(f"    Failed to generate scene {scene_idx}")
    return None


def add_text_and_grade(video_path, text, out_path, is_hook=False, is_gold=False):
    """Add minimal text + unified color grade (teal shadows, gold highlights)."""
    escaped = text.replace("\\", "\\\\").replace("'", "\\'")
    escaped = escaped.replace("\n", "\\n")

    font_color = "#ff3232" if is_hook else ("#ffd700" if is_gold else "#ffffff")
    font_size = 48 if is_hook else 40
    y_pos = "(h-text_h)/2-50" if is_hook else "(h-text_h)/2"

    # Unified color grade: teal shadows, cyan mids, gold highlights + crop to 9:16
    vf = (
        f"crop=ih*9/16:ih:(iw-ih*9/16)/2:0,"
        # Subtle zoom for energy
        f"zoompan=z='min(zoom+0.003,1.05)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':fps=30,"
        # Color grade: push shadows to teal, mids to cyan, highlights warm
        f"curves=r='0/0.05 0.5/0.45 1/1':g='0/0.1 0.5/0.55 1/0.95':b='0/0.15 0.5/0.6 1/0.9',"
        f"eq=saturation=0.85:contrast=1.1:brightness=0.02,"
        # Minimal text overlay
        f"drawtext=fontfile=/usr/share/fonts/dejavu-sans-mono-fonts/DejaVuSansMono-Bold.ttf:"
        f"text='{escaped}':fontcolor={font_color}@0.95:fontsize={font_size}:"
        f"x=(w-text_w)/2:y={y_pos}:box=0:borderw=4:bordercolor=black@0.8,"
        f"format=yuv420p"
    )

    cmd = [
        "ffmpeg", "-y",
        "-i", video_path,
        "-vf", vf,
        "-r", "30",
        "-c:v", "libopenh264",
        "-b:v", "2M",
        "-pix_fmt", "yuv420p",
        "-an",
        out_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode == 0 and os.path.exists(out_path) and os.path.getsize(out_path) > 1000:
        return out_path
    print(f"  Text/grade failed for {text}, using raw")
    return video_path


def compile_with_transitions(clips, durations, texts):
    """Compile with xfade crossfade transitions between scenes."""
    print("\nCompiling final video with crossfade transitions...")
    processed = []

    for i, (clip, text, dur) in enumerate(zip(clips, texts, durations)):
        if not clip or not os.path.exists(clip):
            continue

        is_hook = i < 2
        is_gold = "$" in text or "70%" in text or "coin" in text.lower()

        overlay_path = os.path.join(OUT_DIR, f"graded_{i:02d}.mp4")
        graded = add_text_and_grade(clip, text, overlay_path, is_hook, is_gold)
        if graded and os.path.exists(graded) and os.path.getsize(graded) > 1000:
            processed.append(graded)
            print(f"  Scene {i}: graded + text")
        else:
            if clip and os.path.exists(clip):
                processed.append(clip)

    if not processed:
        print("No clips to compile")
        return

    # Build filter_complex with xfade transitions
    # Each clip trimmed to exact duration, then crossfaded
    n = len(processed)
    if n == 1:
        # Simple copy
        cmd = ["ffmpeg", "-y", "-i", processed[0], "-vf", "scale=576:1024:force_original_aspect_ratio=decrease,pad=576:1024:(ow-iw)/2:(oh-ih)/2:black,format=yuv420p", "-c:v", "libopenh264", "-b:v", "2M", "-pix_fmt", "yuv420p", "-movflags", "+faststart", VIDEO_PATH]
        subprocess.run(cmd, check=True)
        return

    inputs = []
    for p in processed:
        inputs.extend(["-i", p])

    # Build filter complex: trim each, then chain xfade
    parts = []
    for i in range(n):
        dur = durations[i] if i < len(durations) else 3.0
        parts.append(f"[{i}:v]trim=duration={dur},setpts=PTS-STARTPTS[v{i}]")

    # Chain xfade
    prev = "v0"
    offset = durations[0] if len(durations) > 0 else 3.0
    for i in range(1, n):
        dur = durations[i] if i < len(durations) else 3.0
        transition_d = min(0.5, dur * 0.3)
        parts.append(f"[{prev}][v{i}]xfade=transition=fade:duration={transition_d}:offset={offset - transition_d}[out{i}]")
        prev = f"out{i}"
        offset += dur - transition_d

    # Final scale
    parts.append(f"[{prev}]scale=576:1024:force_original_aspect_ratio=decrease,pad=576:1024:(ow-iw)/2:(oh-ih)/2:black,format=yuv420p[final]")

    filter_complex = ";".join(parts)

    cmd = [
        "ffmpeg", "-y",
    ] + inputs + [
        "-filter_complex", filter_complex,
        "-map", "[final]",
        "-r", "30",
        "-c:v", "libopenh264",
        "-b:v", "2M",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        VIDEO_PATH,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"xfade failed, falling back to concat: {result.stderr[-300:]}")
        # Fallback: simple concat
        concat_list = os.path.join(OUT_DIR, "concat.txt")
        with open(concat_list, "w") as f:
            for p in processed:
                f.write(f"file '{p}'\n")
        cmd2 = [
            "ffmpeg", "-y",
            "-f", "concat", "-safe", "0",
            "-i", concat_list,
            "-vf", "scale=576:1024:force_original_aspect_ratio=decrease,pad=576:1024:(ow-iw)/2:(oh-ih)/2:black,format=yuv420p",
            "-r", "30",
            "-c:v", "libopenh264",
            "-b:v", "2M",
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            VIDEO_PATH,
        ]
        subprocess.run(cmd2, check=True)

    print(f"\nVideo saved: {VIDEO_PATH}")
    print(f"Format: 576x1024 vertical 9:16")


# Progressive visual narrative - scenes build on each other
# Each scene uses the unified style. Visual motifs: cyan laptop, gold lines, teal brain
SCENES = [
    ("YOUR COMPUTER", "single glowing cyan laptop floating in dark void, minimalist, one focal point, clean geometric shape, dark pure black background, subtle teal rim light", 3.0),
    ("PEER TO PEER", "two glowing cyan laptops connected by thin pulsing gold line, data flowing between them, minimalist dark background, clean vector style, network connection", 3.0),
    ("5 PROTOCOLS", "five glowing cyan laptops arranged in row, each with different colored thin thread connecting upward, minimalist dark background, clean geometric, protocol indicators", 3.0),
    ("DECENTRALIZED AI", "five glowing cyan laptops feeding thin gold beams into central floating geometric brain, brain made of cyan polygons, dark background, minimalist, neural network topology", 3.0),
    ("AI WHEN ACTIVE", "central glowing cyan geometric brain activating, holographic assistant figure emerging from top, bright cyan light rays, dark background, minimalist, power on", 3.0),
    ("MINING WHEN IDLE", "single glowing cyan laptop in idle state, golden coins flowing upward from it like a fountain, dark background, minimalist, passive income visualization", 3.0),
    ("DUAL MODE", "split screen composition, left side glowing cyan brain active, right side golden coins flowing from laptop, dark background, minimalist, two modes in one", 3.0),
    ("70% TO YOU", "glowing golden vault splitting into two streams, 70% flowing toward large cyan laptop, 30% to smaller node, dark background, minimalist geometric, reward distribution", 3.0),
    ("CENTRALIZED = VULNERABLE", "massive dark ominous server tower with red warning glow at top, single point of failure, dark stormy atmosphere, minimalist, threatening, vulnerability", 3.0),
    ("DECENTRALIZED\n= RESILIENT", "giant red off button being pressed by shadowy hand, massive server tower going dark, but single small cyan laptop stays brightly lit, resilience, dark background", 3.0),
    ("GLOBAL NETWORK", "planet earth viewed from space covered in thin glowing cyan network mesh lines, peer to peer connections, dark space background, minimalist, unity", 3.0),
    ("ONE COMMAND", "single glowing terminal window with cyan cursor, containers spawning and floating outward, dark background, minimalist, docker containers as geometric shapes", 3.0),
    ("ONE LINE JS", "single line of glowing cyan code floating in dark void, transforming and expanding into complex network of connected nodes, dark background, minimalist, morphing", 3.0),
    ("PHONE TOO", "smartphone and laptop both glowing cyan connected by thin gold line, same network, portable technology, dark background, minimalist geometric shapes", 3.0),
    ("YOUR DATA CENTER", "laptop transforming and expanding into massive server rack, metamorphosis effect, glowing cyan light emanating outward, dark background, minimalist, power expansion", 3.0),
    ("YOUR MINING RIG", "smartphone surrounded by rotating golden mining gears and floating coins, transformation effect, dark background, minimalist geometric, wealth generation", 3.0),
    ("MILLIONS\nONE NETWORK", "swarm of thousands of tiny glowing cyan dots forming one unified brain shape, millions of devices one network, dark background, minimalist, particle swarm", 3.0),
    ("QVAC-CHIMERA", "geometric cyan chimera logo made of interlocking hexagons and circuits, glowing brightly on pure dark background, clean minimalist title card, epic reveal, final scene", 4.0),
]


def main():
    print("=" * 60)
    print("QVAC-CHIMERA v2 - Progressive Visual Narrative")
    print("Unified style | Minimal text | Real motion | Smooth transitions")
    print("=" * 60)

    os.makedirs(OUT_DIR, exist_ok=True)

    clips = []
    durations = []
    texts = []

    for i, (text, prompt, duration) in enumerate(SCENES):
        seed = 12000 + i * 31
        clip_path = generate_motion_clip(i, text, prompt, seed, duration)
        if clip_path:
            clips.append(clip_path)
            durations.append(duration)
            texts.append(text)

    if clips:
        compile_with_transitions(clips, durations, texts)
        print(f"\nDone! View: file://{VIDEO_PATH}")
        print(f"Also: http://localhost:8080/qvac_chimera_v2.mp4")
    else:
        print("\nNo clips generated.")


if __name__ == "__main__":
    main()
