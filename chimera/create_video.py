#!/usr/bin/env python3
"""Generate a promotional video for the Chimera codebase using SD v1.5 + LCM LoRA."""

import os
import subprocess
import sys

import numpy as np
import torch
from PIL import Image, ImageDraw, ImageFont
from diffusers import LCMScheduler, StableDiffusionPipeline

DEVICE = "cpu"
MODEL_ID = "runwayml/stable-diffusion-v1-5"
LORA_ID = "latent-consistency/lcm-lora-sdv1-5"
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "video_frames")
VIDEO_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "chimera_promo.mp4")
FONT_PATH = "/usr/share/fonts/dejavu-sans-mono-fonts/DejaVuSansMono-Bold.ttf"

SCENES = [
    ("QVAC-Pear Miner Node", "futuristic glowing server node in a decentralized network, cyberpunk aesthetic, high tech, neon blue and purple, digital art"),
    ("Decentralized AI Inference", "neural network visualization, distributed computing nodes connected by light beams, holographic brain, dark background, sci-fi"),
    ("Dual Mode Operation", "split composition day and night, AI robot active on one side resting on other, yin yang concept, futuristic, cinematic"),
    ("P2P Distribution", "interconnected mesh network of glowing peers, peer-to-peer topology, floating nodes, data streams, futuristic"),
    ("Multi-Miner Support", "multiple futuristic mining rigs running in parallel, holographic displays, crypto mining, sci-fi control room"),
    ("Hypercore Storage", "glowing blockchain data cubes, append-only log structure, encrypted vault, futuristic data center, holographic"),
    ("One-Line Integration", "simple elegant code flowing into a powerful machine, minimal script transforming into complex system, futuristic"),
    ("Docker Ready", "futuristic container ship carrying digital containers, cloud infrastructure, isometric, clean aesthetic, neon accents"),
    ("Protocol Multisig", "cryptographic vault with multiple keys, secure multi-signature wallet, digital security, holographic locks"),
    ("Start Earning Today", "futuristic city with data streams flowing to people, decentralized rewards, golden light, hopeful sci-fi"),
]


def load_pipeline():
    print("Loading Stable Diffusion v1.5 + LCM LoRA...")
    pipe = StableDiffusionPipeline.from_pretrained(
        MODEL_ID,
        torch_dtype=torch.float32,
        safety_checker=None,
        use_safetensors=True,
    )
    pipe.scheduler = LCMScheduler.from_config(pipe.scheduler.config)
    pipe.load_lora_weights(LORA_ID)
    pipe.to(DEVICE)
    print("Model loaded.")
    return pipe


def add_text_overlay(image: Image.Image, title: str) -> Image.Image:
    draw = ImageDraw.Draw(image)
    try:
        font = ImageFont.truetype(FONT_PATH, 28)
    except Exception:
        font = ImageFont.load_default()

    # Title text
    text = title
    bbox = draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    img_w, img_h = image.size
    x = (img_w - text_w) // 2
    y = img_h - text_h - 40

    # Semi-transparent background bar
    padding_x = 20
    padding_y = 10
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)
    overlay_draw.rectangle(
        [x - padding_x, y - padding_y, x + text_w + padding_x, y + text_h + padding_y],
        fill=(0, 0, 0, 160),
    )
    image = Image.alpha_composite(image.convert("RGBA"), overlay).convert("RGB")

    # Draw text on top
    draw = ImageDraw.Draw(image)
    draw.text((x, y), text, font=font, fill=(255, 255, 255))
    return image


def generate_frames(pipe):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    frame_paths = []

    for i, (title, prompt) in enumerate(SCENES):
        print(f"[{i+1}/{len(SCENES)}] Generating: {title}")
        image = pipe(
            prompt,
            num_inference_steps=4,
            guidance_scale=1.0,
            height=512,
            width=512,
        ).images[0]

        image = add_text_overlay(image, title)
        path = os.path.join(OUTPUT_DIR, f"frame_{i:02d}.png")
        image.save(path)
        frame_paths.append(path)
        print(f"  Saved {path}")

    return frame_paths


def build_video(frame_paths):
    print("\nCompiling video with ffmpeg...")
    # Create a concat list with crossfade transitions
    # Each scene: 3s display + 1s crossfade (except last)
    duration = 3  # seconds per scene
    fade = 1      # crossfade duration
    fps = 30

    # Build filter_complex for crossfades
    inputs = []
    filters = []
    for i, path in enumerate(frame_paths):
        inputs.extend(["-loop", "1", "-i", path])

    # First input stream
    stream = "0"
    for i in range(1, len(frame_paths)):
        prev = stream
        curr = str(i)
        out = f"v{i}"
        # Overlay curr over prev with fade
        # Using xfade filter (requires ffmpeg 4.4+)
        filters.append(
            f"[{prev}][{curr}]xfade=transition=fade:duration={fade}:offset={i * duration}[{out}]"
        )
        stream = out

    total_duration = len(frame_paths) * duration
    filters.append(f"[{stream}]format=yuv420p[final]")

    cmd = [
        "ffmpeg",
        "-y",
        *inputs,
        "-filter_complex", ";".join(filters),
        "-map", "[final]",
        "-t", str(total_duration),
        "-r", str(fps),
        "-pix_fmt", "yuv420p",
        "-crf", "23",
        "-preset", "fast",
        VIDEO_PATH,
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print("ffmpeg failed, trying fallback slideshow method...")
        print(result.stderr)
        build_slideshow(frame_paths, duration, fps)
    else:
        print(f"Video saved to {VIDEO_PATH}")


def build_slideshow(frame_paths, duration, fps):
    """Fallback: simple slideshow without transitions."""
    list_file = os.path.join(OUTPUT_DIR, "input.txt")
    with open(list_file, "w") as f:
        for path in frame_paths:
            f.write(f"file '{path}'\n")
            f.write(f"duration {duration}\n")
        # ffmpeg concat demuxer requires last file repeated
        f.write(f"file '{frame_paths[-1]}'\n")

    cmd = [
        "ffmpeg",
        "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", list_file,
        "-vf", "format=yuv420p",
        "-r", str(fps),
        "-crf", "23",
        "-preset", "fast",
        VIDEO_PATH,
    ]
    subprocess.run(cmd, check=True)
    print(f"Video saved to {VIDEO_PATH}")


def main():
    pipe = load_pipeline()
    frame_paths = generate_frames(pipe)
    build_video(frame_paths)
    print("Done!")


if __name__ == "__main__":
    main()
