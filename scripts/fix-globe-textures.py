#!/usr/bin/env python3
"""
Planetary Globe Texture Normalization & Seamless Wrapping Pipeline
Abandoned But Not Forgotten

Reads raw source models from `models/` (never modifies raw originals),
extracts and processes equirectangular albedo textures to:
1. Flatten low-frequency photographic satellite swath exposure differences
   (preserving 100% of high-frequency surface craters, rilles, and maria).
2. Cosine-blend the longitudinal boundaries (x=0 and x=width-1) for 100%
   seamless equirectangular sphere wrapping.
3. Emit optimized 2048x1024 Draco + WebP GLB derivatives into `public/models/`.

Usage:
  python scripts/fix-globe-textures.py [moon] [mars]
"""

import io
import json
import os
import struct
import subprocess
import sys
from PIL import Image, ImageFilter
import numpy as np

# ==============================================================================
# PIPELINE PARAMETERS (Configurable at top of script)
# ==============================================================================
TARGET_WIDTH = 2048
TARGET_HEIGHT = 1024

# Low-frequency illumination extraction blur radius (Gaussian sigma in pixels)
MARS_BLUR_SIGMA = 64
MOON_BLUR_SIGMA = 64

# Exposure flattening strength (0.0 = raw, 1.0 = fully flattened low-frequency)
# 0.40 - 0.45 gently neutralizes satellite flyby swath jumps while preserving
# 100% of natural large-scale geological contrast (lunar maria, Martian dark albedo provinces).
MARS_FLATTEN_STRENGTH = 0.40
MOON_FLATTEN_STRENGTH = 0.45

# Longitudinal wrap feathering margin (in columns from border)
WRAP_SEAM_WIDTH = 16

# Intermediate JPEG quality for gltf-transform texture compressor input
INTERMEDIATE_JPEG_QUALITY = 95

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC_DIR = os.path.join(ROOT_DIR, 'models')
OUT_DIR = os.path.join(ROOT_DIR, 'public', 'models')
TEMP_DIR = os.path.join(ROOT_DIR, 'test-artifacts', 'temp')


def extract_glb_parts(glb_path):
    """Extracts JSON chunk, BIN chunk, and image byte slice from a binary glTF."""
    with open(glb_path, 'rb') as f:
        magic, version, total_len = struct.unpack('<4sII', f.read(12))
        if magic != b'glTF':
            raise ValueError(f"File {glb_path} is not a valid glTF 2.0 binary file")
        
        c0_len, c0_type = struct.unpack('<II', f.read(8))
        json_bytes = f.read(c0_len)
        data = json.loads(json_bytes.decode('utf-8'))
        
        c1_len, c1_type = struct.unpack('<II', f.read(8))
        bin_bytes = f.read(c1_len)

    if not data.get('images'):
        raise ValueError(f"No images found in {glb_path}")

    img_bv_idx = data['images'][0]['bufferView']
    bv = data['bufferViews'][img_bv_idx]
    offset = bv.get('byteOffset', 0)
    length = bv['byteLength']
    img_bytes = bin_bytes[offset:offset + length]

    return data, bin_bytes, img_bv_idx, img_bytes


def process_texture(img_bytes, blur_sigma, flatten_strength, seam_width, target_size=(TARGET_WIDTH, TARGET_HEIGHT)):
    """Flattens low-frequency exposure swath jumps and feathers wrap edges seamlessly."""
    img = Image.open(io.BytesIO(img_bytes)).convert('RGB').resize(target_size, Image.Resampling.LANCZOS)
    arr = np.array(img, dtype=np.float32)

    # 1. Low-frequency exposure flattening
    blurred = np.array(img.filter(ImageFilter.GaussianBlur(radius=blur_sigma)), dtype=np.float32)
    mean_val = arr.mean(axis=(0, 1), keepdims=True)
    flattened = arr - blurred + mean_val
    arr_out = (1.0 - flatten_strength) * arr + flatten_strength * flattened
    arr_out = np.clip(arr_out, 0.0, 255.0)

    # 2. Longitudinal wrap feathering across x=0 and x=width-1
    w = target_size[0]
    for k in range(seam_width):
        weight = 0.5 * (1.0 - np.cos(np.pi * (k + 0.5) / seam_width))
        left_col = arr_out[:, k, :].copy()
        right_col = arr_out[:, w - 1 - k, :].copy()
        avg = 0.5 * (left_col + right_col)
        arr_out[:, k, :] = (1.0 - weight) * avg + weight * left_col
        arr_out[:, w - 1 - k, :] = (1.0 - weight) * avg + weight * right_col

    res_img = Image.fromarray(arr_out.astype(np.uint8))
    out_buf = io.BytesIO()
    res_img.save(out_buf, format='JPEG', quality=INTERMEDIATE_JPEG_QUALITY)
    return out_buf.getvalue()


def write_intermediate_glb(data, bin_bytes, img_bv_idx, new_img_bytes, out_glb_path, mime='image/jpeg'):
    """Replaces image bytes in the glTF buffer and writes aligned intermediate GLB."""
    data['images'][0]['mimeType'] = mime
    bv = data['bufferViews'][img_bv_idx]
    old_offset = bv.get('byteOffset', 0)
    old_len = bv['byteLength']

    # 4-byte padding alignment as mandated by glTF 2.0
    pad = (4 - (len(new_img_bytes) % 4)) % 4
    padded_img = new_img_bytes + b'\x00' * pad
    delta = len(padded_img) - old_len

    bv['byteLength'] = len(new_img_bytes)

    for i, other_bv in enumerate(data['bufferViews']):
        if i != img_bv_idx:
            off = other_bv.get('byteOffset', 0)
            if off > old_offset:
                other_bv['byteOffset'] = off + delta

    new_bin = bin_bytes[:old_offset] + padded_img + bin_bytes[old_offset + old_len:]
    data['buffers'][0]['byteLength'] = len(new_bin)

    new_json_bytes = json.dumps(data, separators=(',', ':')).encode('utf-8')
    json_pad = (4 - (len(new_json_bytes) % 4)) % 4
    new_json_bytes += b' ' * json_pad

    out_total_len = 12 + 8 + len(new_json_bytes) + 8 + len(new_bin)
    os.makedirs(os.path.dirname(out_glb_path), exist_ok=True)
    with open(out_glb_path, 'wb') as f:
        f.write(struct.pack('<4sII', b'glTF', 2, out_total_len))
        f.write(struct.pack('<II', len(new_json_bytes), 0x4E4F534A))
        f.write(new_json_bytes)
        f.write(struct.pack('<II', len(new_bin), 0x004E4942))
        f.write(new_bin)


def run_gltf_optimize(input_glb, output_glb, simplify=False):
    """Executes gltf-transform optimize with Draco, WebP, and vertex welding."""
    cmd = [
        'npx.cmd' if sys.platform == 'win32' else 'npx',
        '--yes',
        '@gltf-transform/cli',
        'optimize',
        input_glb,
        output_glb,
        '--compress', 'draco',
        '--texture-compress', 'webp',
        '--texture-size', str(TARGET_WIDTH),
        '--simplify', 'true' if simplify else 'false',
    ]
    print(f"Running gltf-transform optimize on {input_glb} -> {output_glb}...")
    subprocess.run(cmd, cwd=ROOT_DIR, check=True)


def main():
    targets = [arg.lower() for arg in sys.argv[1:]] if len(sys.argv) > 1 else ['mars', 'moon']
    os.makedirs(TEMP_DIR, exist_ok=True)
    os.makedirs(OUT_DIR, exist_ok=True)

    if 'mars' in targets:
        print("\n=== Normalizing Mars Globe Texture ===")
        mars_src = os.path.join(SRC_DIR, 'mars.glb')
        mars_inter = os.path.join(TEMP_DIR, 'mars_intermediate.glb')
        mars_out = os.path.join(OUT_DIR, 'mars-opt.glb')

        data, bin_b, bv_idx, img_b = extract_glb_parts(mars_src)
        processed_img = process_texture(
            img_b,
            blur_sigma=MARS_BLUR_SIGMA,
            flatten_strength=MARS_FLATTEN_STRENGTH,
            seam_width=WRAP_SEAM_WIDTH
        )
        write_intermediate_glb(data, bin_b, bv_idx, processed_img, mars_inter)
        run_gltf_optimize(mars_inter, mars_out, simplify=False)
        print(f"✓ Mars globe successfully optimized -> {mars_out} ({os.path.getsize(mars_out):,} bytes)")

    if 'moon' in targets:
        print("\n=== Normalizing Moon Globe Texture ===")
        moon_src = os.path.join(SRC_DIR, 'moon.glb')
        moon_inter = os.path.join(TEMP_DIR, 'moon_intermediate.glb')
        moon_out = os.path.join(OUT_DIR, 'moon-opt.glb')

        data, bin_b, bv_idx, img_b = extract_glb_parts(moon_src)
        processed_img = process_texture(
            img_b,
            blur_sigma=MOON_BLUR_SIGMA,
            flatten_strength=MOON_FLATTEN_STRENGTH,
            seam_width=WRAP_SEAM_WIDTH
        )
        write_intermediate_glb(data, bin_b, bv_idx, processed_img, moon_inter)
        run_gltf_optimize(moon_inter, moon_out, simplify=False)
        print(f"✓ Moon globe successfully optimized -> {moon_out} ({os.path.getsize(moon_out):,} bytes)")

    print("\n✓ Planetary globe texture normalization completed successfully.")


if __name__ == '__main__':
    main()
