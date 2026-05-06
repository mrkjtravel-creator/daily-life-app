import sys, math
sys.path.insert(0, '/Users/jimhuang/Library/Python/3.7/lib/python/site-packages')

from PIL import Image, ImageDraw, ImageFilter

def lerp_color(c1, c2, t):
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))

def make_icon(size):
    scale = 4  # supersample for anti-alias
    S = size * scale
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # ── Gradient background ──────────────────────────────────
    col_tl = (56, 214, 206)   # #38D6CE
    col_br = (22, 126, 122)   # #167E7A
    radius = int(108 * S / 512)

    # Draw gradient pixel by pixel (fast enough at this size)
    for y in range(S):
        t = y / S
        row_color = lerp_color(col_tl, col_br, t)
        draw.line([(0, y), (S, y)], fill=row_color + (255,))

    # Clip to rounded rect mask
    mask = Image.new('L', (S, S), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle([0, 0, S - 1, S - 1], radius=radius, fill=255)
    img.putalpha(mask)

    # ── Inner highlight (radial, top-left) ──────────────────
    highlight = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    h_draw = ImageDraw.Draw(highlight)
    cx, cy = int(0.35 * S), int(0.28 * S)
    r = int(0.55 * S)
    for step in range(r, 0, -1):
        alpha = int(46 * (1 - step / r))
        h_draw.ellipse([cx - step, cy - step, cx + step, cy + step],
                       fill=(255, 255, 255, alpha))
    img = Image.alpha_composite(img, highlight)
    draw = ImageDraw.Draw(img)

    # ── Ring ─────────────────────────────────────────────────
    center = S // 2
    ring_r = int(155 * S / 512)
    ring_w = int(24 * S / 512)
    # Draw ring as thick ellipse
    draw.ellipse(
        [center - ring_r - ring_w // 2,
         center - ring_r - ring_w // 2,
         center + ring_r + ring_w // 2,
         center + ring_r + ring_w // 2],
        outline=(255, 255, 255, 235), width=ring_w
    )

    # ── Gap dots (N/E/S/W) — punch holes in the ring ─────────
    gap_r = int(16 * S / 512)
    positions = [
        (center, center - ring_r),  # 12 o'clock
        (center + ring_r, center),  # 3 o'clock
        (center, center + ring_r),  # 6 o'clock
        (center - ring_r, center),  # 9 o'clock
    ]
    # Background colors at each cardinal point (interpolated)
    bg_colors = [
        lerp_color(col_tl, col_br, (center - ring_r) / S),
        lerp_color(col_tl, col_br, center / S),
        lerp_color(col_tl, col_br, (center + ring_r) / S),
        lerp_color(col_tl, col_br, center / S),
    ]
    for (px, py), bg in zip(positions, bg_colors):
        draw.ellipse([px - gap_r, py - gap_r, px + gap_r, py + gap_r],
                     fill=bg + (255,))
        # Small white dot cap
        cap_r = int(8 * S / 512)
        draw.ellipse([px - cap_r, py - cap_r, px + cap_r, py + cap_r],
                     fill=(255, 255, 255, 229))

    # ── Checkmark ────────────────────────────────────────────
    # Scaled from 512: (176,262) → (229,320) → (342,186)
    pts = [
        (int(176 * S / 512), int(262 * S / 512)),
        (int(229 * S / 512), int(320 * S / 512)),
        (int(342 * S / 512), int(186 * S / 512)),
    ]
    ck_w = int(42 * S / 512)
    draw.line([pts[0], pts[1]], fill=(255, 255, 255, 242), width=ck_w)
    draw.line([pts[1], pts[2]], fill=(255, 255, 255, 242), width=ck_w)
    # Round line caps using small filled circles
    cap = ck_w // 2
    for px, py in pts:
        draw.ellipse([px - cap, py - cap, px + cap, py + cap],
                     fill=(255, 255, 255, 242))

    # ── Downsample (anti-alias) ──────────────────────────────
    return img.resize((size, size), Image.LANCZOS)

for sz in [512, 192, 180]:
    icon = make_icon(sz)
    name = 'icon-512.png' if sz == 512 else ('apple-touch-icon.png' if sz == 180 else f'icon-{sz}.png')
    icon.save(f'/Users/jimhuang/Desktop/CC_test/daily-life-app/icons/{name}')
    print(f'Saved {name} ({sz}x{sz})')

print('Done.')
