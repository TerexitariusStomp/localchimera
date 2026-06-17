#!/usr/bin/env python3
"""Download SadTalker and VideoReTalking model weights."""
import urllib.request, os, zipfile, tarfile, sys

SADTALKER = '/home/user/CascadeProjects/qvac-chimera/tools/SadTalker'
RETALKING = '/home/user/CascadeProjects/qvac-chimera/tools/video-retalking'

def download(url, dest):
    if os.path.exists(dest) and os.path.getsize(dest) > 1000:
        print(f"  CACHED {os.path.basename(dest)}")
        return
    print(f"  Downloading {os.path.basename(dest)} ...", flush=True)
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=300) as resp, open(dest, 'wb') as f:
        total = int(resp.headers.get('Content-Length', 0))
        downloaded = 0
        while True:
            chunk = resp.read(1024 * 1024)
            if not chunk: break
            f.write(chunk)
            downloaded += len(chunk)
            if total:
                pct = downloaded * 100 // total
                print(f"\r    {pct}% ({downloaded//1024//1024}MB/{total//1024//1024}MB)", end='', flush=True)
        print(f"\r  OK {os.path.basename(dest)} ({downloaded//1024//1024}MB)")

# ── SadTalker models ──────────────────────────────────────────────
os.makedirs(f'{SADTALKER}/checkpoints', exist_ok=True)
os.makedirs(f'{SADTALKER}/gfpgan/weights', exist_ok=True)

SADTALKER_MODELS = [
    # v0.0.2-rc safetensors (main checkpoints)
    ('https://github.com/OpenTalker/SadTalker/releases/download/v0.0.2-rc/SadTalker_V0.0.2_256.safetensors', f'{SADTALKER}/checkpoints/SadTalker_V0.0.2_256.safetensors'),
    ('https://github.com/OpenTalker/SadTalker/releases/download/v0.0.2-rc/SadTalker_V0.0.2_512.safetensors', f'{SADTALKER}/checkpoints/SadTalker_V0.0.2_512.safetensors'),
    ('https://github.com/OpenTalker/SadTalker/releases/download/v0.0.2-rc/mapping_00229-model.pth.tar',       f'{SADTALKER}/checkpoints/mapping_00229-model.pth.tar'),
    ('https://github.com/OpenTalker/SadTalker/releases/download/v0.0.2-rc/mapping_00109-model.pth.tar',       f'{SADTALKER}/checkpoints/mapping_00109-model.pth.tar'),
    # v0.0.2 remaining checkpoints
    ('https://github.com/OpenTalker/SadTalker/releases/download/v0.0.2/auido2exp_00300-model.pth',     f'{SADTALKER}/checkpoints/auido2exp_00300-model.pth'),
    ('https://github.com/OpenTalker/SadTalker/releases/download/v0.0.2/auido2pose_00140-model.pth',    f'{SADTALKER}/checkpoints/auido2pose_00140-model.pth'),
    ('https://github.com/OpenTalker/SadTalker/releases/download/v0.0.2/epoch_20.pth',                   f'{SADTALKER}/checkpoints/epoch_20.pth'),
    ('https://github.com/OpenTalker/SadTalker/releases/download/v0.0.2/facevid2vid_00189-model.pth.tar', f'{SADTALKER}/checkpoints/facevid2vid_00189-model.pth.tar'),
    ('https://github.com/OpenTalker/SadTalker/releases/download/v0.0.2/shape_predictor_68_face_landmarks.dat', f'{SADTALKER}/checkpoints/shape_predictor_68_face_landmarks.dat'),
    # BFM zip
    ('https://github.com/OpenTalker/SadTalker/releases/download/v0.0.2/BFM_Fitting.zip', f'{SADTALKER}/checkpoints/BFM_Fitting.zip'),
    # hub zip
    ('https://github.com/OpenTalker/SadTalker/releases/download/v0.0.2/hub.zip', f'{SADTALKER}/checkpoints/hub.zip'),
    # GFPGAN enhancer
    ('https://github.com/xinntao/facexlib/releases/download/v0.1.0/alignment_WFLW_4HG.pth',     f'{SADTALKER}/gfpgan/weights/alignment_WFLW_4HG.pth'),
    ('https://github.com/xinntao/facexlib/releases/download/v0.1.0/detection_Resnet50_Final.pth', f'{SADTALKER}/gfpgan/weights/detection_Resnet50_Final.pth'),
    ('https://github.com/TencentARC/GFPGAN/releases/download/v1.3.0/GFPGANv1.4.pth',             f'{SADTALKER}/gfpgan/weights/GFPGANv1.4.pth'),
]

print("\n=== Downloading SadTalker models ===")
for url, dest in SADTALKER_MODELS:
    download(url, dest)

# Extract zips
for zname in ['BFM_Fitting.zip', 'hub.zip']:
    zpath = f'{SADTALKER}/checkpoints/{zname}'
    if os.path.exists(zpath) and os.path.getsize(zpath) > 1000:
        print(f"  Extracting {zname}...")
        with zipfile.ZipFile(zpath, 'r') as z:
            z.extractall(f'{SADTALKER}/checkpoints/')

# ── VideoReTalking models ─────────────────────────────────────────
os.makedirs(f'{RETALKING}/checkpoints', exist_ok=True)

RETALKING_MODELS = [
    ('https://github.com/vinthony/video-retalking/releases/download/v0.0.1/30_net_gen.pth',    f'{RETALKING}/checkpoints/30_net_gen.pth'),
    ('https://github.com/vinthony/video-retalking/releases/download/v0.0.1/BFM.zip',           f'{RETALKING}/checkpoints/BFM.zip'),
    ('https://github.com/vinthony/video-retalking/releases/download/v0.0.1/DNet.pt',           f'{RETALKING}/checkpoints/DNet.pt'),
    ('https://github.com/vinthony/video-retalking/releases/download/v0.0.1/ENet.pth',          f'{RETALKING}/checkpoints/ENet.pth'),
    ('https://github.com/vinthony/video-retalking/releases/download/v0.0.1/expression.mat',    f'{RETALKING}/checkpoints/expression.mat'),
    ('https://github.com/vinthony/video-retalking/releases/download/v0.0.1/face_det.pth',      f'{RETALKING}/checkpoints/face_det.pth'),
    ('https://github.com/vinthony/video-retalking/releases/download/v0.0.1/gfpgan_clean_v1.3.pth', f'{RETALKING}/checkpoints/gfpgan_clean_v1.3.pth'),
    ('https://github.com/vinthony/video-retalking/releases/download/v0.0.1/LNet.pth',          f'{RETALKING}/checkpoints/LNet.pth'),
    ('https://github.com/vinthony/video-retalking/releases/download/v0.0.1/ParseNet-latest.pth', f'{RETALKING}/checkpoints/ParseNet-latest.pth'),
    ('https://github.com/vinthony/video-retalking/releases/download/v0.0.1/RetinaFace-R50.pth', f'{RETALKING}/checkpoints/RetinaFace-R50.pth'),
    ('https://github.com/vinthony/video-retalking/releases/download/v0.0.1/shape_predictor_68_face_landmarks.dat', f'{RETALKING}/checkpoints/shape_predictor_68_face_landmarks.dat'),
]

print("\n=== Downloading VideoReTalking models ===")
for url, dest in RETALKING_MODELS:
    download(url, dest)

# Extract BFM zip
bfm_zip = f'{RETALKING}/checkpoints/BFM.zip'
if os.path.exists(bfm_zip) and os.path.getsize(bfm_zip) > 1000:
    print("  Extracting BFM.zip...")
    with zipfile.ZipFile(bfm_zip, 'r') as z:
        z.extractall(f'{RETALKING}/checkpoints/')

print("\n=== All downloads complete ===")
print(f"SadTalker checkpoints: {os.listdir(f'{SADTALKER}/checkpoints/')}")
print(f"VideoReTalking checkpoints: {os.listdir(f'{RETALKING}/checkpoints/')}")
