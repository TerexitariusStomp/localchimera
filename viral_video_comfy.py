#!/usr/bin/env python3
"""Generate viral qvac-chimera explainer video via Comfy Cloud API."""

import json
import os
import subprocess
import time

import requests
from PIL import Image, ImageDraw, ImageFont

BASE_URL = "https://cloud.comfy.org"
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "viral_frames")
VIDEO_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "qvac_chimera_viral.mp4")

API_KEY = os.environ.get("COMFY_API_KEY", "")
if not API_KEY:
    API_KEY = "comfyui-192d9441cf1b54096559ec787f6b9278f462d8d37f77bd60db9ce675ed9219c1"
    print("WARNING: Using hardcoded fallback API key. Set COMFY_API_KEY env var for production.")
FONT_BOLD = "/usr/share/fonts/dejavu-sans-mono-fonts/DejaVuSansMono-Bold.ttf"
FONT_REG = "/usr/share/fonts/dejavu-sans-mono-fonts/DejaVuSansMono.ttf"

W, H = 576, 1024  # 9:16 vertical for TikTok/Shorts

SCENES = [
    ("BREAKING:\nAI BANNED",
     "red emergency alert screen, breaking news banner, government censorship warning, dark dramatic lighting, cyberpunk, high contrast, emergency broadcast system",
     3),
    ("$1.4 TRILLION\nDATA CENTER\nCANCELLED",
     "abandoned massive data center construction site, cranes stopped, desert landscape, dust storm, collapsed infrastructure, cinematic wide shot, dramatic lighting, failure",
     3),
    ("Big Tech AI is\ncollapsing...",
     "crumbling corporate skyscraper with tech logos, digital apocalypse, dark clouds, lightning, cyberpunk dystopia, cinematic, moody",
     4),
    ("but nobody's talking\nabout the REAL\nsolution",
     "mysterious glowing portal in a dark room, hidden secret revealed, neon green light, cyberpunk, cinematic, intrigue",
     4),
    ("Centralized AI =\nGovernment Control",
     "giant government hand pressing down on digital brain, oppression, surveillance state, dark cyberpunk, red and black, high contrast, dramatic",
     3),
    ("One shutdown =\nEVERYONE loses",
     "giant power switch being flipped off, city lights going dark, digital blackout, cascading failure, cyberpunk, dramatic, apocalyptic",
     3),
    ("What if YOUR\ncomputer ran\nthe AI?",
     "person hands holding glowing holographic AI brain, personal empowerment, neon cyan, dark background, cyberpunk, intimate closeup, hope",
     3),
    ("Meet QVAC-Chimera",
     "futuristic glowing network node, decentralized mesh of connected computers, peer to peer topology, neon blue and purple, dark space background, cyberpunk, epic wide shot",
     3),
    ("Decentralized\nAI Inference",
     "neural network visualization, distributed computing nodes connected by light beams, holographic brain, dark background, sci-fi, cinematic, blue and purple",
     3),
    ("Dual Mode:\nAI when active",
     "person using laptop with glowing AI assistant hologram, bright cyan light, futuristic workspace, cyberpunk, productive, clean",
     3),
    ("Mining when idle",
     "same laptop glowing with crypto mining visualization, digital gold coins flowing, green and gold light, cyberpunk, dark room, passive income",
     3),
    ("5 Protocols.\nAuto-switching.",
     "five glowing mining rigs running in parallel, holographic displays, crypto mining control room, sci-fi, neon, cinematic, advanced technology",
     3),
    ("70% to YOU.\n30% to devs.",
     "digital vault opening with glowing crypto tokens pouring out, reward distribution visualization, golden light, cyberpunk, cinematic, wealth",
     3),
    ("Docker.\nOne command.\nDone.",
     "futuristic container ship carrying digital containers, cloud infrastructure, isometric view, clean aesthetic, neon accents, cyberpunk, simple",
     3),
    ("Or just embed\none line of JS",
     "single glowing line of code transforming into complex powerful machine, minimal elegant, futuristic, dark background, cyan light, simplicity",
     3),
    ("Works on your\nPHONE too",
     "smartphone floating in dark space with glowing AI interface, mobile app hologram, futuristic, neon, cyberpunk, cinematic, portable",
     3),
    ("Your laptop =\nAI data center",
     "laptop transforming into massive server farm, holographic expansion, power emanating, cyberpunk, epic, neon blue, metamorphosis",
     3),
    ("Your phone =\nmining rig",
     "smartphone surrounded by floating crypto coins and mining gears, transformation, golden and green light, cyberpunk, epic, wealth",
     3),
    ("Millions of\ndevices.\nOne network.",
     "planet Earth viewed from space covered in glowing network connections, global mesh, decentralized web, cyberpunk, epic, neon, unity",
     3),
    ("The future of AI\nisn't in warehouses",
     "massive dark warehouse interior, empty server racks, dust, abandoned, post-apocalyptic tech, cinematic, moody, desolate",
     3),
    ("It's in\nYOUR hands",
     "human hands reaching out toward glowing decentralized network, empowerment, hope, golden and cyan light, dark background, epic, inspirational, community",
     3),
    ("qvac-chimera\ngithub.com/\nTerexitariusStomp",
     "futuristic logo reveal, QVAC Chimera text glowing, dark background, cyberpunk, neon, cinematic title card, dramatic lighting",
     5),
]


def build_workflow(prompt, seed, width, height):
    """Build a ComfyUI text-to-image workflow JSON."""
    return {
        "prompt": {
            "1": {"inputs": {"ckpt_name": "v1-5-pruned-emaonly-fp16.safetensors"}, "class_type": "CheckpointLoaderSimple"},
            "2": {"inputs": {"text": prompt, "clip": ["1", 1]}, "class_type": "CLIPTextEncode"},
            "3": {"inputs": {"text": "low quality, blurry, watermark, text, logo, signature, cropped, worst quality", "clip": ["1", 1]}, "class_type": "CLIPTextEncode"},
            "4": {"inputs": {"width": width, "height": height, "batch_size": 1}, "class_type": "EmptyLatentImage"},
            "5": {"inputs": {"seed": seed, "steps": 20, "cfg": 7.0, "sampler_name": "euler", "scheduler": "normal", "denoise": 1.0,
                           "model": ["1", 0], "positive": ["2", 0], "negative": ["3", 0], "latent_image": ["4", 0]}, "class_type": "KSampler"},
            "6": {"inputs": {"samples": ["5", 0], "vae": ["1", 2]}, "class_type": "VAEDecode"},
            "7": {"inputs": {"filename_prefix": f"viral_{seed}", "images": ["6", 0]}, "class_type": "SaveImage"}
        },
        "client_id": f"viral_{seed}"
    }


def submit_prompt(workflow):
    """Submit workflow to Comfy Cloud API."""
    r = requests.post(
        f"{BASE_URL}/api/prompt",
        headers={"Content-Type": "application/json", "X-API-Key": API_KEY},
        json=workflow,
        timeout=30
    )
    r.raise_for_status()
    data = r.json()
    if data.get("node_errors"):
        print(f"  Node errors: {data['node_errors']}")
    return data["prompt_id"]


def poll_job(prompt_id, timeout=180):
    """Poll job status until completion or timeout."""
    start = time.time()
    while time.time() - start < timeout:
        r = requests.get(
            f"{BASE_URL}/api/job/{prompt_id}/status",
            headers={"X-API-Key": API_KEY},
            timeout=30
        )
        r.raise_for_status()
        data = r.json()
        status = data.get("status")
        if status in ("completed", "success"):
            print(f"  Done in {time.time()-start:.1f}s")
            return True
        elif status in ("error", "failed"):
            print(f"  FAILED: {data.get('error_message', 'unknown')}")
            return False
        time.sleep(5)
    print("  TIMEOUT")
    return False


def get_output_filename(prompt_id):
    """Get output image filename from job."""
    r = requests.get(
        f"{BASE_URL}/api/jobs/{prompt_id}",
        headers={"X-API-Key": API_KEY},
        timeout=30
    )
    r.raise_for_status()
    data = r.json()
    outputs = data.get("outputs", {})
    for node_id, node_out in outputs.items():
        images = node_out.get("images", [])
        if images:
            return images[0]["filename"]
    return None


def download_image(filename, out_path):
    """Download image from Comfy Cloud."""
    url = f"{BASE_URL}/api/view?filename={filename}&type=output"
    r = requests.get(url, headers={"X-API-Key": API_KEY}, timeout=60, allow_redirects=True)
    r.raise_for_status()
    with open(out_path, "wb") as f:
        f.write(r.content)
    return out_path


def add_text_overlay(image, text, is_hook=False):
    """Add bold viral-style text overlay."""
    draw = ImageDraw.Draw(image)
    try:
        font_large = ImageFont.truetype(FONT_BOLD, 56 if is_hook else 46)
    except Exception:
        font_large = ImageFont.load_default()

    lines = text.split("\n")
    total_h = 0
    line_heights = []
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font_large)
        lh = bbox[3] - bbox[1]
        line_heights.append(lh)
        total_h += lh + 10
    total_h -= 10

    img_w, img_h = image.size
    y_start = (img_h - total_h) // 2 - (60 if is_hook else 30)

    padding = 35
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)
    overlay_draw.rectangle(
        [30, y_start - padding, img_w - 30, y_start + total_h + padding],
        fill=(0, 0, 0, 200 if is_hook else 150),
    )
    image = Image.alpha_composite(image.convert("RGBA"), overlay).convert("RGB")

    draw = ImageDraw.Draw(image)
    y = y_start
    for i, line in enumerate(lines):
        bbox = draw.textbbox((0, 0), line, font=font_large)
        text_w = bbox[2] - bbox[0]
        x = (img_w - text_w) // 2

        # Outline
        for dx, dy in [(-2,0),(2,0),(0,-2),(0,2),(-1,-1),(1,1),(-1,1),(1,-1)]:
            draw.text((x+dx, y+dy), line, font=font_large, fill=(0,0,0))

        if "BREAKING" in text or "BANNED" in text or "CANCELLED" in text:
            color = (255, 50, 50)
        elif "$" in text or "70%" in text or "mining" in text.lower():
            color = (255, 200, 0)
        elif "YOUR" in text or "hands" in text.lower():
            color = (0, 255, 180)
        else:
            color = (255, 255, 255)

        draw.text((x, y), line, font=font_large, fill=color)
        y += line_heights[i] + 10

    return image


def generate_all_frames():
    os.makedirs(OUT_DIR, exist_ok=True)
    frame_paths = []

    for i, (text, prompt, duration) in enumerate(SCENES):
        print(f"[{i+1}/{len(SCENES)}] {text.replace(chr(10), ' ')}")
        full_prompt = f"{prompt}, vertical composition, portrait orientation, 9:16 aspect ratio, centered subject"
        seed = 1000 + i * 7
        workflow = build_workflow(full_prompt, seed, W, H)

        try:
            prompt_id = submit_prompt(workflow)
            print(f"  Submitted: {prompt_id}")
            if poll_job(prompt_id):
                filename = get_output_filename(prompt_id)
                if filename:
                    raw_path = os.path.join(OUT_DIR, f"raw_{i:02d}.png")
                    download_image(filename, raw_path)
                    print(f"  Downloaded: {raw_path}")

                    img = Image.open(raw_path)
                    is_hook = i < 2 or "BREAKING" in text or "CANCELLED" in text
                    img = add_text_overlay(img, text, is_hook=is_hook)
                    final_path = os.path.join(OUT_DIR, f"frame_{i:02d}.png")
                    img.save(final_path)
                    frame_paths.append((final_path, duration))
                    print(f"  Final: {final_path}")
                else:
                    print("  No output filename found")
            else:
                print("  Job failed, will retry or skip")
        except Exception as e:
            print(f"  ERROR: {e}")

    return frame_paths


def build_viral_video(frame_paths):
    print("\nCompiling viral video...")
    concat_file = os.path.join(OUT_DIR, "concat.txt")
    with open(concat_file, "w") as f:
        for path, duration in frame_paths:
            f.write(f"file '{path}'\n")
            f.write(f"duration {duration}\n")
        f.write(f"file '{frame_paths[-1][0]}'\n")

    total_duration = sum(d for _, d in frame_paths)

    # Try zoompan for dynamic movement
    cmd = [
        "ffmpeg", "-y",
        "-f", "concat", "-safe", "0",
        "-i", concat_file,
        "-vf", "zoompan=z='min(zoom+0.0012,1.12)':d=90:s=576x1024:fps=30,format=yuv420p",
        "-r", "30", "-t", str(total_duration),
        "-c:v", "libopenh264", "-b:v", "2M",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart",
        VIDEO_PATH,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print("Zoompan failed, using simple slideshow...")
        print(result.stderr[-300:] if len(result.stderr) > 300 else result.stderr)
        cmd2 = [
            "ffmpeg", "-y",
            "-f", "concat", "-safe", "0",
            "-i", concat_file,
            "-vf", "format=yuv420p",
            "-r", "30",
            "-c:v", "libopenh264", "-b:v", "2M",
            "-pix_fmt", "yuv420p",
            VIDEO_PATH,
        ]
        subprocess.run(cmd2, check=True)

    print(f"\nVideo saved: {VIDEO_PATH}")
    print(f"Duration: {total_duration}s | Format: {W}x{H} vertical 9:16")
    print("Optimized for TikTok, YouTube Shorts, Instagram Reels")


def main():
    print("=" * 50)
    print("QVAC-CHIMERA VIRAL VIDEO GENERATOR")
    print("Using Comfy Cloud API + Local Editing")
    print("=" * 50)
    frame_paths = generate_all_frames()
    if frame_paths:
        build_viral_video(frame_paths)
        print("\nDone! View the video at:")
        print(f"  file://{VIDEO_PATH}")
    else:
        print("\nNo frames generated. Check errors above.")


if __name__ == "__main__":
    main()
