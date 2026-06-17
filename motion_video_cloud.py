#!/usr/bin/env python3
"""Studio-quality MOTION video for qvac-chimera using Comfy Cloud AnimateDiff.
Generates actual animated video clips on Comfy Cloud (not slideshows).
Compiles with text overlays, fast cuts, and aggressive transitions locally."""

import json
import os
import subprocess
import time

import requests

API_KEY = "comfyui-192d9441cf1b54096559ec787f6b9278f462d8d37f77bd60db9ce675ed9219c1"
BASE_URL = "https://cloud.comfy.org"
OUT_DIR = "/home/user/CascadeProjects/qvac-chimera/motion_clips"
VIDEO_PATH = "/home/user/CascadeProjects/qvac-chimera/qvac_chimera_motion.mp4"
W, H = 512, 512  # AnimateDiff gen resolution (SD 1.5)
VW, VH = 576, 1024  # Final vertical output


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
    payload = {"prompt": workflow, "client_id": f"motion_{int(time.time())}"}
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
    """AnimateDiff workflow that generates actual motion video on Comfy Cloud."""
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


def generate_motion_clip(scene_idx, text, prompt, seed, duration=2.5):
    """Generate an actual motion video clip on Comfy Cloud using AnimateDiff."""
    prefix = f"motion_{scene_idx:02d}"
    out_path = os.path.join(OUT_DIR, f"{prefix}.mp4")
    if os.path.exists(out_path):
        print(f"[Scene {scene_idx}] Already exists: {out_path}")
        return out_path

    print(f"\n[Scene {scene_idx}] {text.replace(chr(10), ' ')}")
    print(f"  Generating motion clip (seed={seed}, {duration}s)...")

    negative = "low quality, blurry, watermark, text, logo, signature, cropped, worst quality"
    num_frames = int(duration * 8)  # 8 fps
    wf = build_animatediff_workflow(prompt, negative, seed, W, H, num_frames, prefix)
    pid = submit_workflow(wf)
    if poll_job(pid):
        files = get_outputs(pid)
        if files:
            fn = files[0]["filename"]
            download_file(fn, out_path)
            print(f"    Saved: {out_path} ({os.path.getsize(out_path)} bytes)")
            return out_path
    print(f"    Failed to generate scene {scene_idx}")
    return None


def add_text_overlay_to_video(video_path, text, out_path, is_hook=False):
    """Add bold text overlay to a video clip using ffmpeg."""
    font_color = "red@0.9" if is_hook else "white@0.95"
    border_color = "black@0.8"
    font_size = 56 if is_hook else 46
    y_offset = "(h-text_h)/2-30" if is_hook else "(h-text_h)/2"

    # Escape text for ffmpeg drawtext
    escaped = text.replace("\\", "\\\\").replace("'", "\\'")
    # Replace newlines with \\n for ffmpeg
    escaped = escaped.replace("\n", "\\n")

    cmd = [
        "ffmpeg", "-y",
        "-i", video_path,
        "-vf",
        f"drawtext=fontfile=/usr/share/fonts/dejavu-sans-mono-fonts/DejaVuSansMono-Bold.ttf:"
        f"text='{escaped}':"
        f"fontcolor={font_color}:"
        f"fontsize={font_size}:"
        f"x=(w-text_w)/2:"
        f"y={y_offset}:"
        f"box=1:"
        f"boxcolor={border_color}:"
        f"boxborderw=20:"
        f"borderw=3:"
        f"bordercolor=black",
        "-c:v", "libopenh264",
        "-b:v", "2M",
        "-pix_fmt", "yuv420p",
        "-an",
        out_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"  Text overlay failed: {result.stderr[-200:]}")
        return video_path
    return out_path


def compile_final_video(clips, durations, text_overlays):
    """Compile motion clips into final viral video with fast cuts and effects."""
    print("\nCompiling final motion video...")
    processed = []

    for i, (clip, text, dur) in enumerate(zip(clips, text_overlays, durations)):
        if not clip or not os.path.exists(clip):
            continue

        is_hook = i < 2 or "BREAKING" in text or "CANCELLED" in text
        overlay_path = os.path.join(OUT_DIR, f"scene_{i:02d}_overlay.mp4")

        # Add text overlay + crop to 9:16 + speed up slightly for energy
        escaped = text.replace("\\", "\\\\\\\\").replace("'", "\\\\'")
        escaped = escaped.replace("\n", "\\\\n")

        font_color = "#ff3232" if is_hook else ("#ffd700" if "$" in text or "70%" in text else "#ffffff")
        font_size = 52 if is_hook else 42
        y_pos = "(h-text_h)/2-40" if is_hook else "(h-text_h)/2"

        # Crop to 9:16 vertical, add zoom effect, add text
        vf = (
            f"crop=ih*9/16:ih:(iw-ih*9/16)/2:0,"
            f"zoompan=z='min(zoom+0.005,1.1)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':fps=30,"
            f"drawtext=fontfile=/usr/share/fonts/dejavu-sans-mono-fonts/DejaVuSansMono-Bold.ttf:"
            f"text='{escaped}':fontcolor={font_color}@0.95:fontsize={font_size}:"
            f"x=(w-text_w)/2:y={y_pos}:box=1:boxcolor=black@0.75:boxborderw=18:borderw=3:bordercolor=black,"
            f"format=yuv420p"
        )

        # Speed up slightly (1.1x) for energy + set exact duration
        cmd = [
            "ffmpeg", "-y",
            "-i", clip,
            "-vf", vf,
            "-filter:a", "atempo=1.1",
            "-t", str(dur),
            "-r", "30",
            "-c:v", "libopenh264",
            "-b:v", "2M",
            "-pix_fmt", "yuv420p",
            "-an",
            overlay_path,
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0 and os.path.exists(overlay_path) and os.path.getsize(overlay_path) > 1000:
            processed.append(overlay_path)
            print(f"  Scene {i}: {overlay_path}")
        else:
            print(f"  Scene {i} processing failed, using raw clip")
            if clip and os.path.exists(clip):
                processed.append(clip)

    if not processed:
        print("No clips to compile")
        return

    # Concatenate all clips
    concat_list = os.path.join(OUT_DIR, "concat.txt")
    with open(concat_list, "w") as f:
        for p in processed:
            f.write(f"file '{p}'\n")

    cmd = [
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
    subprocess.run(cmd, check=True)
    print(f"\nMotion video saved: {VIDEO_PATH}")
    print(f"Format: {VW}x{VH} vertical 9:16")


# Viral script scenes
SCENES = [
    ("BREAKING:\nAI BANNED", "red emergency alert broadcast screen, government censorship, dramatic warning, dark cyberpunk atmosphere, emergency broadcast system, flashing red lights, cinematic", 3),
    ("$1.4 TRILLION\nDATA CENTER\nCANCELLED", "abandoned massive data center construction site, cranes stopped, desert dust storm, collapsed tech infrastructure, failure, cinematic wide shot, dramatic dark lighting", 3),
    ("Big Tech AI is\ncollapsing...", "crumbling corporate skyscraper with holographic tech logos falling apart, digital apocalypse, dark storm clouds, lightning, cyberpunk dystopia, cinematic, moody atmosphere", 3),
    ("but nobody's talking\nabout the REAL\nsolution", "mysterious glowing portal opening in dark underground room, hidden secret revealed, neon green light, cyberpunk, intrigue, cinematic", 3),
    ("Centralized AI =\nGovernment Control", "giant dark government hand pressing down on glowing digital brain, oppression, surveillance state, dark cyberpunk, red and black, high contrast, dramatic lighting", 2.5),
    ("One shutdown =\nEVERYONE loses", "giant industrial power switch being flipped off, city lights going dark in sequence, digital blackout, cascading failure, cyberpunk, dramatic, apocalyptic", 2.5),
    ("What if YOUR\ncomputer ran\nthe AI?", "person's hands holding glowing holographic AI brain, personal empowerment, neon cyan light, dark background, cyberpunk, intimate closeup, hopeful atmosphere", 2.5),
    ("Meet QVAC-Chimera", "futuristic glowing decentralized network node, mesh of connected computers, peer to peer topology, neon blue and purple light, dark space background, cyberpunk, epic wide shot", 2.5),
    ("Decentralized\nAI Inference", "neural network visualization, distributed computing nodes connected by beams of light, holographic brain floating, dark background, sci-fi, cinematic, blue and purple", 2.5),
    ("Dual Mode:\nAI when active", "person using laptop with glowing AI assistant hologram projecting upward, bright cyan light, futuristic workspace, cyberpunk, productive, clean aesthetic", 2.5),
    ("Mining when idle", "laptop glowing with crypto mining visualization, digital golden coins flowing upward, green and gold light, cyberpunk, dark room, passive income concept", 2.5),
    ("5 Protocols.\nAuto-switching.", "five glowing futuristic mining rigs running in parallel, holographic displays showing different protocols, crypto mining control room, sci-fi, neon, cinematic", 2.5),
    ("70% to YOU.\n30% to devs.", "massive digital vault door opening with glowing crypto tokens pouring out, reward distribution visualization, golden light, cyberpunk, cinematic, wealth", 2.5),
    ("Docker.\nOne command.\nDone.", "futuristic container ship carrying glowing digital containers through space, cloud infrastructure, isometric view, clean aesthetic, neon accents, cyberpunk, simple elegance", 2.5),
    ("Or just embed\none line of JS", "single glowing line of code floating and transforming into complex powerful machine, minimal elegant design, futuristic, dark background, cyan light, simplicity", 2.5),
    ("Works on your\nPHONE too", "smartphone floating in dark space with glowing holographic AI interface surrounding it, mobile app hologram, futuristic, neon, cyberpunk, cinematic, portable technology", 2.5),
    ("Your laptop =\nAI data center", "laptop transforming and expanding into massive server farm, holographic expansion effect, power emanating outward, cyberpunk, epic, neon blue, metamorphosis", 2.5),
    ("Your phone =\nmining rig", "smartphone surrounded by floating golden crypto coins and rotating mining gears, transformation effect, golden and green light, cyberpunk, epic, wealth generation", 2.5),
    ("Millions of\ndevices.\nOne network.", "planet Earth viewed from space covered in glowing interconnected network lines, global mesh, decentralized web, cyberpunk, epic, neon, unity concept", 2.5),
    ("The future of AI\nisn't in warehouses", "massive dark abandoned warehouse interior, empty rusted server racks, dust particles in light beams, post-apocalyptic tech, cinematic, moody, desolate", 2.5),
    ("It's in\nYOUR hands", "human hands reaching upward toward glowing decentralized network above, empowerment, hope, golden and cyan light, dark background, epic, inspirational, community", 2.5),
    ("qvac-chimera\ngithub.com/\nTerexitariusStomp", "futuristic logo reveal, QVAC Chimera text glowing brightly, dark background, cyberpunk, neon, cinematic title card, dramatic lighting, final scene", 4),
]


def main():
    print("=" * 60)
    print("MOTION VIDEO - QVAC-CHIMERA")
    print("Actual animated video via Comfy Cloud AnimateDiff")
    print("NOT a slideshow - real motion generation")
    print("=" * 60)

    os.makedirs(OUT_DIR, exist_ok=True)

    clips = []
    durations = []
    texts = []

    for i, (text, prompt, duration) in enumerate(SCENES):
        seed = 9000 + i * 17
        clip_path = generate_motion_clip(i, text, prompt, seed, duration)
        if clip_path:
            clips.append(clip_path)
            durations.append(duration)
            texts.append(text)

    if clips:
        compile_final_video(clips, durations, texts)
        print(f"\nDone! View: file://{VIDEO_PATH}")
    else:
        print("\nNo clips generated.")


if __name__ == "__main__":
    main()
