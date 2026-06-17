#!/usr/bin/env python3
"""Generate a viral explainer video for qvac-chimera using local SD + viral editing."""

import os
import subprocess
import sys
import time

import numpy as np
import torch
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from diffusers import LCMScheduler, StableDiffusionPipeline

DEVICE = "cpu"
MODEL_ID = "runwayml/stable-diffusion-v1-5"
LORA_ID = "latent-consistency/lcm-lora-sdv1-5"
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "viral_frames")
VIDEO_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "qvac_chimera_viral.mp4")
FONT_BOLD = "/usr/share/fonts/dejavu-sans-mono-fonts/DejaVuSansMono-Bold.ttf"
FONT_REG = "/usr/share/fonts/dejavu-sans-mono-fonts/DejaVuSansMono.ttf"

# 9:16 vertical format for TikTok/YouTube Shorts
W, H = 576, 1024

# Each scene: (text_overlay, prompt_for_SD, duration_seconds)
# Prompts are designed for cyberpunk/dark tech aesthetic
SCENES = [
    # HOOK 0-3s
    (
        "BREAKING:\nAI BANNED",
        "red emergency alert screen, breaking news banner, government seal, censorship warning, dark dramatic lighting, cyberpunk, digital art, high contrast",
        3,
    ),
    # HOOK 3-6s
    (
        "$1.4 TRILLION\nDATA CENTER\nCANCELLED",
        "abandoned massive data center construction site, cranes stopped, desert landscape, dust storm, failure, collapsed infrastructure, cinematic wide shot, dramatic lighting",
        3,
    ),
    # SETUP 6-10s
    (
        "Big Tech AI is\ncollapsing...",
        "crumbling corporate skyscraper with tech logos, digital apocalypse, dark clouds, lightning, cyberpunk dystopia, cinematic",
        4,
    ),
    (
        "but nobody's talking\nabout the REAL\nsolution",
        "mysterious glowing portal in a dark room, hidden secret revealed, neon green light, cyberpunk, cinematic",
        4,
    ),
    # PROBLEM 10-15s
    (
        "Centralized AI =\nGovernment Control",
        "giant government hand pressing down on digital brain, oppression, surveillance state, dark cyberpunk, red and black, high contrast",
        3,
    ),
    (
        "One shutdown =\nEVERYONE loses access",
        "giant power switch being flipped off, city lights going dark, digital blackout, cascading failure, cyberpunk, dramatic",
        3,
    ),
    # TRANSITION/SOLUTION 15-20s
    (
        "What if YOUR\ncomputer ran\nthe AI?",
        "person's hands holding glowing holographic AI brain, personal empowerment, neon cyan, dark background, cyberpunk, intimate closeup",
        3,
    ),
    (
        "Meet QVAC-Chimera",
        "futuristic glowing network node, decentralized mesh of connected computers, peer to peer topology, neon blue and purple, dark space background, cyberpunk, epic wide shot",
        3,
    ),
    # FEATURES 20-32s
    (
        "Decentralized\nAI Inference",
        "neural network visualization, distributed computing nodes connected by light beams, holographic brain, dark background, sci-fi, cinematic",
        3,
    ),
    (
        "Dual Mode:\nAI when active",
        "split screen, person using laptop with glowing AI assistant hologram, bright cyan light, futuristic workspace, cyberpunk",
        3,
    ),
    (
        "Mining when idle",
        "same laptop now glowing with crypto mining visualization, digital gold coins flowing, green and gold light, cyberpunk, dark room",
        3,
    ),
    (
        "5 Protocols.\nAuto-switching.",
        "five glowing mining rigs running in parallel, holographic displays, crypto mining control room, sci-fi, neon, cinematic",
        3,
    ),
    (
        "70% to YOU.\n30% to devs.",
        "digital vault opening with glowing crypto tokens pouring out, reward distribution visualization, golden light, cyberpunk, cinematic",
        3,
    ),
    # EASY SETUP 32-40s
    (
        "Docker.\nOne command.\nDone.",
        "futuristic container ship carrying digital containers, cloud infrastructure, isometric view, clean aesthetic, neon accents, cyberpunk",
        3,
    ),
    (
        "Or just embed\none line of JS",
        "single glowing line of code transforming into complex powerful machine, minimal elegant, futuristic, dark background, cyan light",
        3,
    ),
    (
        "Works on your\nPHONE too",
        "smartphone floating in dark space with glowing AI interface, mobile app hologram, futuristic, neon, cyberpunk, cinematic",
        3,
    ),
    # VISION 40-48s
    (
        "Your laptop =\nAI data center",
        "laptop transforming into massive server farm, holographic expansion, power emanating, cyberpunk, epic, neon blue",
        3,
    ),
    (
        "Your phone =\nmining rig",
        "smartphone surrounded by floating crypto coins and mining gears, transformation, golden and green light, cyberpunk, epic",
        3,
    ),
    (
        "Millions of\ndevices.\nOne network.",
        "planet Earth viewed from space covered in glowing network connections, global mesh, decentralized web, cyberpunk, epic, neon",
        3,
    ),
    # CTA 48-55s
    (
        "The future of AI\nisn't in warehouses",
        "massive dark warehouse interior, empty server racks, dust, abandoned, post-apocalyptic tech, cinematic, moody",
        3,
    ),
    (
        "It's in\nYOUR hands",
        "human hands reaching out toward glowing decentralized network, empowerment, hope, golden and cyan light, dark background, epic, inspirational",
        3,
    ),
    # LOOP 55-60s
    (
        "qvac-chimera\ngithub.com/\nTerexitariusStomp",
        "futuristic logo reveal, QVAC Chimera text glowing, dark background, cyberpunk, neon, cinematic title card",
        5,
    ),
]


def load_pipeline():
    print("Loading SD v1.5 + LCM LoRA...")
    pipe = StableDiffusionPipeline.from_pretrained(
        MODEL_ID,
        torch_dtype=torch.float32,
        safety_checker=None,
        use_safetensors=True,
    )
    pipe.scheduler = LCMScheduler.from_config(pipe.scheduler.config)
    pipe.load_lora_weights(LORA_ID)
    pipe.to(DEVICE)
    print("Pipeline ready.")
    return pipe


def add_text_overlay(image, text, is_hook=False):
    """Add bold viral-style text overlay."""
    draw = ImageDraw.Draw(image)
    try:
        font_large = ImageFont.truetype(FONT_BOLD, 52 if is_hook else 42)
        font_small = ImageFont.truetype(FONT_REG, 24)
    except Exception:
        font_large = ImageFont.load_default()
        font_small = ImageFont.load_default()

    # Split text by newlines
    lines = text.split("\n")
    
    # Calculate total text height
    total_h = 0
    line_heights = []
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font_large)
        lh = bbox[3] - bbox[1]
        line_heights.append(lh)
        total_h += lh + 8
    total_h -= 8

    img_w, img_h = image.size
    
    # Position: centered vertically, slightly above middle for hooks
    y_start = (img_h - total_h) // 2 - (80 if is_hook else 40)
    
    # Draw semi-transparent dark overlay behind text for readability
    padding = 30
    overlay_h = total_h + padding * 2
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)
    overlay_draw.rectangle(
        [40, y_start - padding, img_w - 40, y_start + total_h + padding],
        fill=(0, 0, 0, 180 if is_hook else 140),
    )
    image = Image.alpha_composite(image.convert("RGBA"), overlay).convert("RGB")
    
    # Draw text with slight glow effect
    draw = ImageDraw.Draw(image)
    y = y_start
    for i, line in enumerate(lines):
        bbox = draw.textbbox((0, 0), line, font=font_large)
        text_w = bbox[2] - bbox[0]
        x = (img_w - text_w) // 2
        
        # Draw glow/outline
        for dx, dy in [(-2,0),(2,0),(0,-2),(0,2),(-1,-1),(1,1),(-1,1),(1,-1)]:
            draw.text((x+dx, y+dy), line, font=font_large, fill=(0,0,0))
        
        # Color: red for hooks/breaking, cyan for features, gold for money
        if "BREAKING" in text or "BANNED" in text or "CANCELLED" in text:
            color = (255, 60, 60)
        elif "$" in text or "70%" in text or "mining" in text.lower():
            color = (255, 215, 0)
        elif "YOUR" in text or "hands" in text.lower():
            color = (0, 255, 200)
        else:
            color = (255, 255, 255)
        
        draw.text((x, y), line, font=font_large, fill=color)
        y += line_heights[i] + 8
    
    return image


def generate_frames(pipe):
    os.makedirs(OUT_DIR, exist_ok=True)
    frame_paths = []
    
    for i, (text, prompt, duration) in enumerate(SCENES):
        print(f"[{i+1}/{len(SCENES)}] Generating: {text.replace(chr(10), ' ')}")
        
        # Add aspect ratio hint to prompt for vertical generation
        full_prompt = f"{prompt}, vertical composition, portrait orientation, 9:16 aspect ratio, centered subject"
        
        image = pipe(
            full_prompt,
            num_inference_steps=4,
            guidance_scale=1.0,
            height=H,
            width=W,
        ).images[0]
        
        is_hook = i < 2 or "BREAKING" in text or "CANCELLED" in text
        image = add_text_overlay(image, text, is_hook=is_hook)
        
        path = os.path.join(OUT_DIR, f"frame_{i:02d}.png")
        image.save(path)
        frame_paths.append((path, duration))
        print(f"  Saved {path}")
    
    return frame_paths


def build_viral_video(frame_paths):
    """Compile frames into viral-style video with fast cuts and effects."""
    print("\nCompiling viral video...")
    
    # Create a concat file for ffmpeg
    concat_file = os.path.join(OUT_DIR, "concat.txt")
    with open(concat_file, "w") as f:
        for path, duration in frame_paths:
            f.write(f"file '{path}'\n")
            f.write(f"duration {duration}\n")
        # ffmpeg concat demuxer requires last file repeated
        f.write(f"file '{frame_paths[-1][0]}'\n")
    
    # Build with viral editing style:
    # - zoom/pan on each frame (Ken Burns)
    # - fast fade transitions
    # - 30fps, H.264
    total_duration = sum(d for _, d in frame_paths)
    
    # Use zoompan filter for dynamic movement on each static frame
    # Format: 9:16 vertical, 30fps
    cmd = [
        "ffmpeg", "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", concat_file,
        "-vf",
        # zoompan adds subtle movement to each frame
        "zoompan=z='min(zoom+0.0015,1.15)':d=90:s=576x1024:fps=30,format=yuv420p",
        "-r", "30",
        "-t", str(total_duration),
        "-c:v", "libopenh264",
        "-b:v", "2M",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        VIDEO_PATH,
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print("Advanced filter failed, using fallback...")
        print(result.stderr[-500:] if len(result.stderr) > 500 else result.stderr)
        # Fallback: simple slideshow
        cmd2 = [
            "ffmpeg", "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", concat_file,
            "-vf", "format=yuv420p",
            "-r", "30",
            "-c:v", "libopenh264",
            "-b:v", "2M",
            "-pix_fmt", "yuv420p",
            VIDEO_PATH,
        ]
        subprocess.run(cmd2, check=True)
    
    print(f"Video saved: {VIDEO_PATH}")
    print(f"Duration: {total_duration}s | Format: {W}x{H} vertical")


def main():
    pipe = load_pipeline()
    frame_paths = generate_frames(pipe)
    build_viral_video(frame_paths)
    print("\nDone! Your viral video is ready.")
    print(f"Path: {VIDEO_PATH}")
    print(f"Format: {W}x{H} (9:16 vertical) - optimized for TikTok/YouTube Shorts")


if __name__ == "__main__":
    main()
