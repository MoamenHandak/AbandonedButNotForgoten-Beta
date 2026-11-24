import math
import struct
import os

def generate_rgbe_hdr(filename, width=512, height=256, sun_x=340, sun_y=75, sun_radius=20, sun_intensity=65.0, ambient=(0.018, 0.020, 0.028)):
    pixels = bytearray()
    
    for y in range(height):
        row_rgbe = []
        for x in range(width):
            # Calculate angular distance to sun
            dx = (x - sun_x)
            if dx > width / 2: dx -= width
            if dx < -width / 2: dx += width
            dy = (y - sun_y)
            dist = math.sqrt(dx * dx + dy * dy)
            
            if dist < sun_radius:
                t = dist / sun_radius
                intensity = sun_intensity * (1.0 - t * t) + ambient[0]
                r = intensity
                g = intensity * 0.96
                b = intensity * 0.90
            elif dist < sun_radius * 2.8:
                t = (dist - sun_radius) / (sun_radius * 1.8)
                corona = sun_intensity * 0.10 * (1.0 - t) * (1.0 - t)
                r = ambient[0] + corona
                g = ambient[1] + corona * 0.92
                b = ambient[2] + corona * 0.85
            else:
                r, g, b = ambient
                
            max_v = max(r, max(g, b))
            if max_v < 1e-32:
                row_rgbe.append((0, 0, 0, 0))
            else:
                exponent = math.ceil(math.log2(max_v))
                mantissa = (256.0 * (2.0 ** (-exponent)))
                R = min(255, max(0, int(r * mantissa)))
                G = min(255, max(0, int(g * mantissa)))
                B = min(255, max(0, int(b * mantissa)))
                E = min(255, max(0, int(exponent + 128)))
                row_rgbe.append((R, G, B, E))
                
        pixels.extend([2, 2, (width >> 8) & 0xFF, width & 0xFF])
        for channel_idx in range(4):
            chan_vals = [row_rgbe[x][channel_idx] for x in range(width)]
            idx = 0
            while idx < width:
                chunk_len = min(127, width - idx)
                pixels.append(chunk_len)
                pixels.extend(chan_vals[idx:idx + chunk_len])
                idx += chunk_len

    header = (
        b"#?RADIANCE\n"
        b"FORMAT=32-bit_rle_rgbe\n"
        b"EXPOSURE=1.000000\n\n"
        b"-Y " + str(height).encode('ascii') + b" +X " + str(width).encode('ascii') + b"\n"
    )

    with open(filename, 'wb') as f:
        f.write(header)
        f.write(pixels)
    print(f"Generated {filename} ({len(header) + len(pixels)} bytes)")

if __name__ == '__main__':
    out_path = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'space_sun.hdr')
    generate_rgbe_hdr(out_path)
