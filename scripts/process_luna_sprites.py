"""
process_luna_sprites.py
Processes 'assets/story/character no bg.png' into isolated, transparent, trimmed
high-resolution character cut-out sprites for Luna in the visual-novel Story Mode.
Outputs:
- luna_curious (reaching for the vintage book)
- luna_reading (sitting cross-legged, happily reading the glowing logbook)
- luna_surprised (gasps with wide eyes as miniature galaxies swirl around her)
- luna_wonder (floating weightlessly with awe in outer space)
"""

import os
import cv2
import numpy as np
from PIL import Image

SRC_PATH = os.path.join('assets', 'story', 'character no bg.png')
OUT_DIRS = [
    os.path.join('assets', 'story', 'luna'),
    os.path.join('public', 'assets', 'story', 'luna')
]

for d in OUT_DIRS:
    os.makedirs(d, exist_ok=True)

img = Image.open(SRC_PATH).convert('RGBA')
arr = np.array(img)
alpha = arr[:, :, 3]

# The sprite sheet layout in character no bg.png (2576 x 1438):
# 1. luna_curious (left): x ~ 0..760, y ~ 150..1050
# 2. luna_reading (center-left): x ~ 760..1380, y ~ 150..950
# 3. luna_surprised (bottom-center): x ~ 1320..2020, y ~ 580..1420
# 4. luna_wonder (top-right): x ~ 1760..2560, y ~ 80..960

POSES = [
    {
        'name': 'luna_curious',
        'crop': (0, 100, 780, 1100),
        'desc': 'Luna reaching down to inspect the NASA mission logbook'
    },
    {
        'name': 'luna_reading',
        'crop': (750, 120, 1370, 1000),
        'desc': 'Luna happily reading the glowing logbook pages'
    },
    {
        'name': 'luna_surprised',
        'crop': (1300, 560, 2040, 1438),
        'desc': 'Luna gasping in wonder as galaxies and planets swirl'
    },
    {
        'name': 'luna_wonder',
        'crop': (1750, 60, 2560, 980),
        'desc': 'Luna floating weightlessly in cosmic awe'
    }
]

def trim_transparent(pil_img, alpha_threshold=8, pad=6):
    img_arr = np.array(pil_img)
    a = img_arr[:, :, 3]
    y_indices, x_indices = np.where(a > alpha_threshold)
    if len(y_indices) == 0:
        return pil_img
    x0 = max(0, x_indices.min() - pad)
    x1 = min(img_arr.shape[1], x_indices.max() + pad)
    y0 = max(0, y_indices.min() - pad)
    y1 = min(img_arr.shape[0], y_indices.max() + pad)
    return pil_img.crop((x0, y0, x1, y1))

def defringe_alpha(pil_img):
    """Smooths semi-transparent edge pixels and cleans residual matte halos."""
    arr = np.array(pil_img).astype(np.float32)
    alpha = arr[:, :, 3] / 255.0
    # Where alpha is very low (< 0.05), set to zero
    alpha[alpha < 0.05] = 0.0
    arr[:, :, 3] = np.clip(alpha * 255.0, 0, 255)
    return Image.fromarray(arr.astype(np.uint8))

print(f"Loaded source image {SRC_PATH} size: {img.size}")

for pose in POSES:
    name = pose['name']
    box = pose['crop']
    cropped = img.crop(box)
    trimmed = trim_transparent(cropped)
    cleaned = defringe_alpha(trimmed)
    
    print(f"Extracted {name}: size {cleaned.size}")
    
    for out_dir in OUT_DIRS:
        png_out = os.path.join(out_dir, f"{name}.png")
        webp_out = os.path.join(out_dir, f"{name}.webp")
        cleaned.save(png_out, format='PNG', optimize=True)
        cleaned.save(webp_out, format='WEBP', quality=95)
        print(f"  Saved -> {png_out} & {webp_out}")

print("All Luna character poses extracted and processed successfully!")
