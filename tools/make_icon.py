"""生成 Lean Bulk OS 的主屏图标：红底 + 从中心放射的成束细针，左上光、右下投影
（向 Dr. Needle 系列针灸针作品的质感致敬，图形是程序重画的，不是原作）。
用法：python tools/make_icon.py  → icon-1024/512/192/180.png"""
import math, random, pathlib
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

S, SS = 1024, 2
W = S * SS
root = pathlib.Path(__file__).resolve().parent.parent
random.seed(11)
cx, cy = W * 0.48, W * 0.46

# 1. 底色：左上暗、右下亮的饱和红，带一点不均匀
yy, xx = np.mgrid[0:W, 0:W].astype(np.float32) / W
t = np.clip((xx * 0.55 + yy * 0.75) / 1.1, 0, 1)            # 左上 0 → 右下 1
d = np.hypot(xx - cx / W, yy - cy / W)
r = 150 + 90 * t + 10 * (1 - d)
g = 12 + 26 * t
b = 10 + 18 * t
base = np.stack([r, g, b], -1)
noise = np.random.default_rng(3).normal(0, 2.0, (W // 8, W // 8, 1)).astype(np.float32)
noise = np.array(Image.fromarray(((noise[..., 0] + 8) * 16).clip(0, 255).astype(np.uint8)).resize((W, W), Image.BICUBIC), np.float32) / 16 - 8
base += noise[..., None]
bg = Image.fromarray(base.clip(0, 255).astype(np.uint8), 'RGB')

shadow = Image.new('L', (W, W), 0)
ds = ImageDraw.Draw(shadow)
needles = Image.new('RGBA', (W, W), (0, 0, 0, 0))
dn = ImageDraw.Draw(needles)
off = (W * 0.007, W * 0.010)                                # 投影往右下

rays = 40
for i in range(rays):
    a0 = (i / rays) * 2 * math.pi + random.uniform(-0.04, 0.04)
    k = random.choice([2, 3, 3, 4, 5])                      # 一束几根
    for j in range(k):
        a = a0 + (j - k / 2) * random.uniform(0.006, 0.014)
        r0 = W * random.uniform(0.075, 0.12)
        r1 = W * random.uniform(0.33, 0.78)
        x0, y0 = cx + r0 * math.cos(a), cy + r0 * math.sin(a)
        x1, y1 = cx + r1 * math.cos(a), cy + r1 * math.sin(a)
        w = max(3, int(W * random.uniform(0.0026, 0.0038)))
        ds.line([(x0 + off[0], y0 + off[1]), (x1 + off[0], y1 + off[1])], fill=190, width=w + 3)
        # 针身：随方向变亮暗（朝左上的那面更亮）
        lit = 0.5 + 0.5 * math.cos(a + math.pi * 0.75)
        col = (int(212 + 30 * lit), int(30 + 28 * lit), int(24 + 20 * lit), 255)
        dn.line([(x0, y0), (x1, y1)], fill=col, width=w)
        dn.line([(x0 - 1, y0 - 2), (x1 - 1, y1 - 2)], fill=(255, 120, 100, int(25 + 55 * lit)), width=max(1, w // 3))
        # 外端的针柄小结
        rr = w * 1.3
        ds.ellipse([x1 - rr + off[0], y1 - rr + off[1], x1 + rr + off[0], y1 + rr + off[1]], fill=190)
        dn.ellipse([x1 - rr, y1 - rr, x1 + rr, y1 + rr], fill=(236, 62, 46, 255))
        for tt in random.sample([0.45,0.6,0.72,0.85],2):        # 针身上的小结
            bx, by = x0 + (x1 - x0) * tt, y0 + (y1 - y0) * tt
            ds.ellipse([bx - rr + off[0], by - rr + off[1], bx + rr + off[0], by + rr + off[1]], fill=170)
            dn.ellipse([bx - rr * .8, by - rr * .8, bx + rr * .8, by + rr * .8], fill=(232, 58, 44, 255))

shadow = shadow.filter(ImageFilter.GaussianBlur(W * 0.006))
bg = Image.composite(Image.new('RGB', (W, W), (70, 4, 3)), bg, shadow.point(lambda v: int(v * 0.75)))

# 中心：针根汇聚成一个低调的圆顶，左上受光、右下压暗，旁边落一圈软阴影
R = W * 0.095
ring = Image.new('L', (W, W), 0)
ImageDraw.Draw(ring).ellipse([cx - R * 1.25 + off[0] * 2, cy - R * 1.25 + off[1] * 2, cx + R * 1.25 + off[0] * 2, cy + R * 1.25 + off[1] * 2], fill=255)
bg = Image.composite(Image.new('RGB', (W, W), (90, 6, 4)), bg, ring.filter(ImageFilter.GaussianBlur(W * 0.03)).point(lambda v: int(v * 0.55)))
bg = bg.convert('RGBA')
bg.alpha_composite(needles)
yy2, xx2 = np.mgrid[0:W, 0:W].astype(np.float32)
dd = np.hypot(xx2 - cx, yy2 - cy) / R
lightdir = ((cx - xx2) * 0.7 + (cy - yy2) * 0.7) / R                 # 朝左上为正
dome = np.clip(1 - dd, 0, 1)
arr = np.array(bg, np.float32)
m = (dd < 1)[..., None]
col = np.stack([200 + 35 * lightdir, 24 + 18 * lightdir, 18 + 12 * lightdir], -1)
alpha = (np.clip(dome * 3, 0, 1) * 0.92)[..., None]
rgb = arr[..., :3] * (1 - alpha) + col * alpha
arr[..., :3] = np.where(m, rgb, arr[..., :3])
bg = Image.fromarray(arr.clip(0, 255).astype(np.uint8), 'RGBA').filter(ImageFilter.GaussianBlur(1))

img = bg.convert('RGB').resize((S, S), Image.LANCZOS)
for size in (1024, 512, 192, 180):
    img.resize((size, size), Image.LANCZOS).save(root / f'icon-{size}.png', optimize=True)
print('ok')
