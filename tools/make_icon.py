"""Lean Bulk OS 主屏图标：红底上从中心放射的针灸针（向 Dr. Needle 系列致敬，程序重画）。
观察参考图得到的规则：
- 光从右边来：画面左暗右亮；每根针往左下投一道软影；中心圆顶往左投一大片影
- 每条射线 = 2–3 条并行轨道，每条轨道是一串首尾交叠的短针，每根针一端有个小圆头
- 针和底色同色系，只比底色亮一点，主要靠影子显形
- 中心是哑光的大圆顶，正中
用法：python tools/make_icon.py [输出目录]"""
import math, random, pathlib, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

S, SS = 1024, 2
W = S * SS
root = pathlib.Path(__file__).resolve().parent.parent
out = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else root
rng = random.Random(5)
cx = cy = W * 0.5
LX, LY = 1.0, -0.25                                    # 光的方向：右、略偏上
SHX, SHY = -W * 0.0095, W * 0.0060                     # 针影偏移：左下

# ---------- 底色：左暗右亮 ----------
yy, xx = np.mgrid[0:W, 0:W].astype(np.float32) / W
t = np.clip(0.22 + xx * 0.75 + (1 - yy) * 0.05 - (1 - xx) * (1 - yy) * 0.35, 0, 1)
dark, lite = np.array([128, 10, 8], np.float32), np.array([240, 44, 30], np.float32)
img = dark + (lite - dark) * t[..., None]


def darken(arr, mask, k):           # mask 0–1，k 压暗比例
    return arr * (1 - k * mask[..., None])


def blurmask(draw_fn, blur):
    m = Image.new('L', (W, W), 0); draw_fn(ImageDraw.Draw(m))
    return np.array(m.filter(ImageFilter.GaussianBlur(blur)), np.float32) / 255


# 中心圆顶向左投下的大片影
R = W * 0.10
big = blurmask(lambda d: d.ellipse([cx - R * 4.2, cy - R * 3.2, cx + R * 0.3, cy + R * 2.0], fill=255), W * 0.09)
img = darken(img, big, 0.18)

# ---------- 针 ----------
# 每条射线 = 3 条交错的“车道”，每条车道是一串短针；每根新针相对上一根往旁边错开一点（阶梯状），角度也各有偏差
shadow = Image.new('L', (W, W), 0); ds = ImageDraw.Draw(shadow)
body = Image.new('L', (W, W), 0); db_ = ImageDraw.Draw(body)
spec = Image.new('L', (W, W), 0); dsp = ImageDraw.Draw(spec)
heads = Image.new('L', (W, W), 0); dh = ImageDraw.Draw(heads)
SHX, SHY = -W * 0.013, W * 0.0045                     # 针离开表面，影子往左落得比较远

rays = 36
for i in range(rays):
    a = i / rays * 2 * math.pi + rng.uniform(-0.04, 0.04)
    reach = W * rng.uniform(0.55, 0.8)
    lanes = rng.choice([3, 3, 4])
    for k in range(lanes):
        lat = (k - (lanes - 1) / 2) * W * 0.006
        r = R * rng.uniform(0.95, 1.05) + W * rng.uniform(0, 0.06) * (k % 2)
        while r < reach:
            L = W * rng.uniform(0.09, 0.15)
            aa = a + rng.uniform(-0.012, 0.012)
            ca, sa = math.cos(aa), math.sin(aa)
            px, py = -math.sin(a), math.cos(a)
            lat += rng.uniform(-1, 1) * W * 0.0035              # 阶梯错位
            r1 = min(r + L, reach)
            x0, y0 = cx + r * ca + px * lat, cy + r * sa + py * lat
            x1, y1 = cx + r1 * ca + px * lat, cy + r1 * sa + py * lat
            w = int(W * rng.uniform(0.0034, 0.0046))
            # 影子：针根贴着表面影子短，针尾翘起影子远
            ds.line([(x0 + SHX * .3, y0 + SHY * .3), (x1 + SHX, y1 + SHY)], fill=255, width=w + 4)
            db_.line([(x0, y0), (x1, y1)], fill=255, width=w)
            nx, ny = (px, py) if px * LX + py * LY > 0 else (-px, -py)
            lit = abs(px * LX + py * LY) / math.hypot(LX, LY)
            dsp.line([(x0 + nx * w * .35, y0 + ny * w * .35), (x1 + nx * w * .35, y1 + ny * w * .35)], fill=int(150 + 105 * lit), width=max(2, w // 2))
            hr = w * 0.95
            ds.ellipse([x1 - hr + SHX * 1.1, y1 - hr + SHY * 1.1, x1 + hr + SHX * 1.1, y1 + hr + SHY * 1.1], fill=255)
            dh.ellipse([x1 - hr, y1 - hr, x1 + hr, y1 + hr], fill=255)
            if r1 >= reach:
                break
            r = r1 - L * rng.uniform(0.15, 0.35)

sh = np.array(shadow.filter(ImageFilter.GaussianBlur(W * 0.005)), np.float32) / 255
img = darken(img, sh, 0.40)
bd = np.array(body.filter(ImageFilter.GaussianBlur(0.7)), np.float32)[..., None] / 255
sp = np.array(spec.filter(ImageFilter.GaussianBlur(0.8)), np.float32)[..., None] / 255
hd = np.array(heads.filter(ImageFilter.GaussianBlur(0.9)), np.float32)[..., None] / 255
# 针自己受光：不跟着底色变暗，只轻微随左右明暗变化 → 阴影里的针也是亮的
glow = (0.86 + 0.14 * t)[..., None]
needle = np.array([214, 34, 22], np.float32) * glow
img = img * (1 - bd) + needle * bd
img = img + (np.array([255, 92, 70]) - img) * sp * 0.45
img = img * (1 - hd) + np.array([236, 62, 44], np.float32) * glow * hd

# ---------- 中心圆顶（哑光，右亮左暗，边缘柔和） ----------
d = np.hypot(xx * W - cx, yy * W - cy) / R
inside = np.clip((1.1 - d) * 1.6, 0, 1)
nz = np.sqrt(np.clip(1 - d ** 2, 0, 1))
nxm, nym = (xx * W - cx) / R, (yy * W - cy) / R
shade = np.clip(0.42 + 0.38 * (nxm * LX + nym * LY) / 1.03 + 0.12 * nz, 0, 1.2)
lo, hi = np.array([150, 14, 10]), np.array([226, 36, 26])
dome = lo + (hi - lo) * shade[..., None]
img = img * (1 - inside[..., None]) + dome * inside[..., None]
rim = blurmask(lambda dd: dd.ellipse([cx - R * 1.02, cy - R * 1.02, cx + R * 1.02, cy + R * 1.02], outline=255, width=int(W * .006)), W * 0.006)
img = darken(img, rim * np.clip((0.5 - xx) * 8, 0, 1), 0.45)
cast = blurmask(lambda dd: dd.ellipse([cx - R * 1.45, cy - R * 0.95, cx - R * 0.55, cy + R * 1.05], fill=255), W * 0.02)
img = darken(img, cast * (1 - inside), 0.30)

sharp = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), 'RGB')
soft = np.array(sharp.filter(ImageFilter.GaussianBlur(W * 0.004)), np.float32)
dof = np.clip(1.1 - np.hypot(xx - .5, yy - .5) / 0.32, 0, 1)[..., None] * 0.75   # 中间偏虚，像相机景深
img = img * (1 - dof) + soft * dof
img = img * 0.94 + np.array([235, 60, 45]) * 0.06                                  # 一层薄薄的空气感
res = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), 'RGB').filter(ImageFilter.GaussianBlur(1.1))
res = res.resize((S, S), Image.LANCZOS)
for size in (1024, 512, 192, 180):
    res.resize((size, size), Image.LANCZOS).save(out / f'icon-{size}.png', optimize=True)
print('ok')
