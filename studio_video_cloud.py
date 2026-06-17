#!/usr/bin/env python3
"""Studio-quality viral video for qvac-chimera. ALL generation via Comfy Cloud API.
Uses image-sequence motion technique: generate base frames + variation frames on Cloud,
then compile locally with aggressive motion editing."""

import json
import os
import subprocess
import time

import requests
from PIL import Image, ImageDraw, ImageFont

API_KEY = "comfyui-192d9441cf1b54096559ec787f6b9278f462d8d37f77bd60db9ce675ed9219c1"
BASE_URL = "https://cloud.comfy.org"
OUT_DIR = "/home/user/CascadeProjects/qvac-chimera/studio_frames"
VIDEO_PATH = "/home/user/CascadeProjects/qvac-chimera/qvac_chimera_studio.mp4"
FONT_BOLD = "/usr/share/fonts/dejavu-sans-mono-fonts/DejaVuSansMono-Bold.ttf"
W, H = 576, 1024  # 9:16 vertical


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
    """Submit a ComfyUI workflow JSON and return prompt_id."""
    payload = {"prompt": workflow, "client_id": f"studio_{int(time.time())}"}
    data = api_post("/api/prompt", payload)
    if data.get("node_errors"):
        print(f"  Node errors: {data['node_errors']}")
    return data["prompt_id"]


def poll_job(prompt_id, timeout=300):
    """Poll job until completion or timeout."""
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
    """Get output filenames from a completed job."""
    data = api_get(f"/api/jobs/{prompt_id}")
    outputs = data.get("outputs", {})
    files = []
    for node_id, node_out in outputs.items():
        images = node_out.get("images", [])
        for img in images:
            files.append(img)
    return files


def download_file(filename, subfolder="", type_="output", out_path=""):
    """Download a file from Comfy Cloud."""
    url = f"{BASE_URL}/api/view?filename={filename}&type={type_}&subfolder={subfolder}"
    r = requests.get(url, headers={"X-API-Key": API_KEY}, timeout=120, allow_redirects=True)
    r.raise_for_status()
    with open(out_path, "wb") as f:
        f.write(r.content)
    return out_path


def build_txt2img_workflow(prompt, negative, seed, width, height, filename_prefix="frame"):
    """Standard text-to-image workflow."""
    return {
        "1": {"inputs": {"ckpt_name": "v1-5-pruned-emaonly-fp16.safetensors"}, "class_type": "CheckpointLoaderSimple"},
        "2": {"inputs": {"text": prompt, "clip": ["1", 1]}, "class_type": "CLIPTextEncode"},
        "3": {"inputs": {"text": negative, "clip": ["1", 1]}, "class_type": "CLIPTextEncode"},
        "4": {"inputs": {"width": width, "height": height, "batch_size": 1}, "class_type": "EmptyLatentImage"},
        "5": {"inputs": {"seed": seed, "steps": 25, "cfg": 7.0, "sampler_name": "euler", "scheduler": "normal", "denoise": 1.0, "model": ["1", 0], "positive": ["2", 0], "negative": ["3", 0], "latent_image": ["4", 0]}, "class_type": "KSampler"},
        "6": {"inputs": {"samples": ["5", 0], "vae": ["1", 2]}, "class_type": "VAEDecode"},
        "7": {"inputs": {"filename_prefix": filename_prefix, "images": ["6", 0]}, "class_type": "SaveImage"},
    }


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


def generate_scene_on_cloud(scene_idx, text, prompt, base_seed, num_variations=3):
    """Generate a scene: 1 base image + N variations on Comfy Cloud. Returns list of local file paths."""
    print(f"\n[Scene {scene_idx}] {text.replace(chr(10), ' ')}")
    negative = "low quality, blurry, watermark, text, logo, signature, cropped, worst quality, duplicate"
    prefix = f"scene_{scene_idx:02d}"
    paths = []

    # 1. Generate base image (skip if exists)
    base_path = os.path.join(OUT_DIR, f"{prefix}_base.png")
    if os.path.exists(base_path):
        print(f"  Base already exists: {base_path}")
        paths.append(base_path)
    else:
        print(f"  Generating base image (seed={base_seed})...")
        wf = build_txt2img_workflow(prompt, negative, base_seed, W, H, filename_prefix=f"{prefix}_base")
        pid = submit_workflow(wf)
        if poll_job(pid):
            files = get_outputs(pid)
            if files:
                fn = files[0]["filename"]
                download_file(fn, out_path=base_path)
                print(f"    Base: {base_path}")
                paths.append(base_path)
            else:
                print("    No output files from base generation")
                return paths
        else:
            print("    Base generation failed")
            return paths

    # 2. Generate motion variations (skip if exists)
    variation_suffixes = [
        "slightly different angle, subtle motion",
        "another perspective, dynamic lighting shift",
        "continuing movement, slight camera pan",
        "final frame of sequence, dramatic lighting",
    ]
    for v in range(num_variations):
        var_seed = base_seed + v + 1
        var_path = os.path.join(OUT_DIR, f"{prefix}_var{v}.png")
        if os.path.exists(var_path):
            print(f"  Variation {v+1} already exists: {var_path}")
            paths.append(var_path)
            continue
        var_prompt = f"{prompt}, {variation_suffixes[v]}"
        print(f"  Generating variation {v+1}/{num_variations} (seed={var_seed})...")
        wf_var = build_txt2img_workflow(var_prompt, negative, var_seed, W, H, filename_prefix=f"{prefix}_var{v}")
        pid_var = submit_workflow(wf_var)
        if poll_job(pid_var):
            files_var = get_outputs(pid_var)
            if files_var:
                fn_var = files_var[0]["filename"]
                download_file(fn_var, out_path=var_path)
                print(f"    Variation: {var_path}")
                paths.append(var_path)

    return paths


def build_studio_video(scene_frames, scene_durations):
    """Compile image sequences into a studio-quality video with aggressive motion effects."""
    print("\nCompiling studio video...")

    # For each scene, create a mini-sequence with crossfades between base + variations
    all_clips = []
    for scene_idx, (frames, duration) in enumerate(zip(scene_frames, scene_durations)):
        if not frames:
            continue

        # Each frame gets equal time within the scene duration
        if len(frames) == 1:
            per_frame = duration
        else:
            per_frame = duration / len(frames)

        scene_list = os.path.join(OUT_DIR, f"scene_{scene_idx:02d}_concat.txt")
        with open(scene_list, "w") as f:
            for frame_path in frames:
                f.write(f"file '{frame_path}'\n")
                f.write(f"duration {per_frame:.2f}\n")
            f.write(f"file '{frames[-1]}'\n")

        scene_video = os.path.join(OUT_DIR, f"scene_{scene_idx:02d}.mp4")

        # Apply zoompan for each frame + crossfade between frames
        if len(frames) > 1:
            # Build xfade transitions
            inputs = []
            filters = []
            for i, frame_path in enumerate(frames):
                inputs.extend(["-loop", "1", "-i", frame_path])

            stream = "0"
            for i in range(1, len(frames)):
                prev = stream
                curr = str(i)
                out = f"v{i}"
                # crossfade between frames
                fade_d = 0.3  # 0.3s crossfade
                offset = i * per_frame - fade_d
                filters.append(
                    f"[{prev}][{curr}]xfade=transition=fade:duration={fade_d}:offset={offset}[{out}]"
                )
                stream = out

            filters.append(f"[{stream}]zoompan=z='min(zoom+0.002,1.1)':d=60:s={W}x{H}:fps=30,format=yuv420p[final]")

            cmd = [
                "ffmpeg", "-y",
                *inputs,
                "-filter_complex", ";".join(filters),
                "-map", "[final]",
                "-t", str(duration),
                "-r", "30",
                "-pix_fmt", "yuv420p",
                "-c:v", "libopenh264",
                "-b:v", "2M",
                "-movflags", "+faststart",
                scene_video,
            ]
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode != 0:
                print(f"  Scene {scene_idx} xfade failed, using simple slideshow...")
                print(result.stderr[-300:] if len(result.stderr) > 300 else result.stderr)
                # Fallback
                cmd2 = [
                    "ffmpeg", "-y",
                    "-f", "concat", "-safe", "0",
                    "-i", scene_list,
                    "-vf", "zoompan=z='min(zoom+0.003,1.15)':d=60:s=576x1024:fps=30,format=yuv420p",
                    "-r", "30", "-t", str(duration),
                    "-c:v", "libopenh264", "-b:v", "2M", "-pix_fmt", "yuv420p",
                    scene_video,
                ]
                subprocess.run(cmd2, check=True)
        else:
            # Single frame: zoompan effect
            cmd = [
                "ffmpeg", "-y",
                "-loop", "1", "-i", frames[0],
                "-vf", f"zoompan=z='min(zoom+0.003,1.15)':d={int(duration*30)}:s={W}x{H}:fps=30,format=yuv420p",
                "-r", "30", "-t", str(duration),
                "-c:v", "libopenh264", "-b:v", "2M", "-pix_fmt", "yuv420p",
                scene_video,
            ]
            subprocess.run(cmd, check=True)

        all_clips.append(scene_video)
        print(f"  Scene {scene_idx} compiled: {scene_video}")

    # Concatenate all scene clips
    final_list = os.path.join(OUT_DIR, "final_concat.txt")
    with open(final_list, "w") as f:
        for clip in all_clips:
            f.write(f"file '{clip}'\n")

    cmd = [
        "ffmpeg", "-y",
        "-f", "concat", "-safe", "0",
        "-i", final_list,
        "-c", "copy",
        "-movflags", "+faststart",
        VIDEO_PATH,
    ]
    subprocess.run(cmd, check=True)
    print(f"\nStudio video saved: {VIDEO_PATH}")
    print(f"Format: {W}x{H} vertical 9:16")


# Script and scene definitions
SCENES = [
    ("BREAKING:\nAI BANNED", "red emergency alert screen, breaking news broadcast, government censorship warning, dramatic red lighting, high contrast, emergency broadcast system, dark cyberpunk atmosphere", 3),
    ("$1.4 TRILLION\nDATA CENTER\nCANCELLED", "abandoned massive data center construction site, cranes stopped, desert dust storm, collapsed tech infrastructure, failure, cinematic wide shot, dramatic dark lighting", 3),
    ("Big Tech AI is\ncollapsing...", "crumbling corporate skyscraper with holographic tech logos falling apart, digital apocalypse, dark storm clouds, lightning, cyberpunk dystopia, cinematic, moody atmosphere", 4),
    ("but nobody's talking\nabout the REAL\nsolution", "mysterious glowing portal opening in a dark underground room, hidden secret revealed, neon green light emanating, cyberpunk, intrigue, cinematic", 4),
    ("Centralized AI =\nGovernment Control", "giant dark government hand pressing down on a glowing digital brain, oppression, surveillance state, dark cyberpunk, red and black, high contrast, dramatic lighting", 3),
    ("One shutdown =\nEVERYONE loses", "giant industrial power switch being flipped off, entire city lights going dark in sequence, digital blackout, cascading failure, cyberpunk, dramatic, apocalyptic", 3),
    ("What if YOUR\ncomputer ran\nthe AI?", "person's hands holding a glowing holographic AI brain, personal empowerment, neon cyan light, dark background, cyberpunk, intimate closeup, hopeful atmosphere", 3),
    ("Meet QVAC-Chimera", "futuristic glowing decentralized network node, mesh of connected computers, peer to peer topology, neon blue and purple light, dark space background, cyberpunk, epic wide shot", 3),
    ("Decentralized\nAI Inference", "neural network visualization, distributed computing nodes connected by beams of light, holographic brain floating, dark background, sci-fi, cinematic, blue and purple", 3),
    ("Dual Mode:\nAI when active", "person using laptop with glowing AI assistant hologram projecting upward, bright cyan light, futuristic workspace, cyberpunk, productive, clean aesthetic", 3),
    ("Mining when idle", "laptop glowing with crypto mining visualization, digital golden coins flowing upward, green and gold light, cyberpunk, dark room, passive income concept", 3),
    ("5 Protocols.\nAuto-switching.", "five glowing futuristic mining rigs running in parallel, holographic displays showing different protocols, crypto mining control room, sci-fi, neon, cinematic", 3),
    ("70% to YOU.\n30% to devs.", "massive digital vault door opening with glowing crypto tokens pouring out like a waterfall, reward distribution visualization, golden light, cyberpunk, cinematic, wealth", 3),
    ("Docker.\nOne command.\nDone.", "futuristic container ship carrying glowing digital containers through space, cloud infrastructure, isometric view, clean aesthetic, neon accents, cyberpunk, simple elegance", 3),
    ("Or just embed\none line of JS", "single glowing line of code floating and transforming into a complex powerful machine, minimal elegant design, futuristic, dark background, cyan light, simplicity", 3),
    ("Works on your\nPHONE too", "smartphone floating in dark space with glowing holographic AI interface surrounding it, mobile app hologram, futuristic, neon, cyberpunk, cinematic, portable technology", 3),
    ("Your laptop =\nAI data center", "laptop transforming and expanding into a massive server farm, holographic expansion effect, power emanating outward, cyberpunk, epic, neon blue, metamorphosis", 3),
    ("Your phone =\nmining rig", "smartphone surrounded by floating golden crypto coins and rotating mining gears, transformation effect, golden and green light, cyberpunk, epic, wealth generation", 3),
    ("Millions of\ndevices.\nOne network.", "planet Earth viewed from space covered in glowing interconnected network lines, global mesh, decentralized web, cyberpunk, epic, neon, unity concept", 3),
    ("The future of AI\nisn't in warehouses", "massive dark abandoned warehouse interior, empty rusted server racks, dust particles in light beams, post-apocalyptic tech, cinematic, moody, desolate", 3),
    ("It's in\nYOUR hands", "human hands reaching upward toward a glowing decentralized network above, empowerment, hope, golden and cyan light, dark background, epic, inspirational, community", 3),
    ("qvac-chimera\ngithub.com/\nTerexitariusStomp", "futuristic logo reveal, QVAC Chimera text glowing brightly, dark background, cyberpunk, neon, cinematic title card, dramatic lighting, final scene", 5),
]


def main():
    print("=" * 60)
    print("STUDIO-QUALITY QVAC-CHIMERA VIDEO")
    print("ALL generation via Comfy Cloud API")
    print("Motion via image-sequence crossfading technique")
    print("=" * 60)

    os.makedirs(OUT_DIR, exist_ok=True)

    scene_frames = []
    scene_durations = []

    for i, (text, prompt, duration) in enumerate(SCENES):
        seed = 5000 + i * 13
        # Character scenes get more variations for "talking" effect
        num_vars = 4 if i < 2 or "YOUR" in text or "hands" in text.lower() else 2
        frames = generate_scene_on_cloud(i, text, prompt, seed, num_variations=num_vars)

        if frames:
            # Add text overlay to all frames in this scene
            for j, frame_path in enumerate(frames):
                img = Image.open(frame_path)
                is_hook = i < 2 or "BREAKING" in text or "CANCELLED" in text
                img = add_text_overlay(img, text, is_hook=is_hook)
                img.save(frame_path)

            scene_frames.append(frames)
            scene_durations.append(duration)
        else:
            print(f"  Scene {i} failed, skipping")

    if scene_frames:
        build_studio_video(scene_frames, scene_durations)
        print(f"\nDone! View the video at:")
        print(f"  file://{VIDEO_PATH}")
    else:
        print("\nNo scenes generated. All failed.")


if __name__ == "__main__":
    main()
