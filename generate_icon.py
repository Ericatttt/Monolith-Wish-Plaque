"""
Wish Plaque – App Icon Generator
目标：尽量贴近 ⛩️ emoji 的造型
  · 深红/朱红鸟居，暗夜背景
  · 笠木（上横梁）两端明显上翘
  · 贯（下横梁）在柱子之间
  · 整体比例参考 Unicode ⛩ 标准图形
"""
from PIL import Image, ImageDraw
import os, math

SIZE = 1024

# ── 配色 ──────────────────────────────────────────────────
BG       = (18,  6,  2)    # 近黑暖色背景
RED      = (208, 38,  8)   # 朱红
RED_HI   = (240, 90, 45)   # 高光（顶面）
RED_SH   = (130, 18,  0)   # 阴影（底面/侧面）
BLACK    = (22, 12,  6)    # 笠木顶面 / 台石
SUN      = (255, 200,  50)  # 太阳主色
SUN_HI   = (255, 235, 120)  # 太阳高光

ASSETS = "/Users/oka/Library/Mobile Documents/com~apple~CloudDocs/web3/rustLearn/wishWall/jinjia/wish-wall-app/assets"
RES    = "/Users/oka/Library/Mobile Documents/com~apple~CloudDocs/web3/rustLearn/wishWall/jinjia/wish-wall-app/android/app/src/main/res"


def draw_rounded_bg(draw, size, r, color):
    s = size
    draw.rectangle([r, 0, s-r, s], fill=color)
    draw.rectangle([0, r, s, s-r], fill=color)
    for cx, cy in [(r, r), (s-r, r), (r, s-r), (s-r, s-r)]:
        draw.ellipse([cx-r, cy-r, cx+r, cy+r], fill=color)


def draw_torii(draw, cx=512, cy=512, scale=1.0):
    """
    以 (cx, cy) 为中心绘制鸟居，scale 缩放。
    设计尺寸基于 1024 画布，cx=512 cy=530。
    """
    def s(v): return v * scale
    def px(x): return int(cx + s(x - 512))
    def py(y): return int(cy + s(y - 530))

    # ── 柱子参数 ──────────────────────────────────────────
    lx  = px(295)   # 左柱左边
    rx  = px(657)   # 右柱左边
    pw  = int(s(72))  # 柱宽
    p_top = py(395)   # 柱顶（接笠木底部）
    p_bot = py(880)   # 柱底

    # ── 笠木（上横梁）参数 ────────────────────────────────
    # 主体横梁：连接两柱外侧
    km_l  = px(295)   # 主梁左端
    km_r  = px(729)   # 主梁右端（=rx+pw）
    km_t  = py(310)   # 主梁顶
    km_b  = py(395)   # 主梁底（= 柱顶）

    # 上翘端：左侧
    wl_ox = px(170)   # 左翘 外端 x
    wl_ot = py(248)   # 左翘 外端顶 y  ← 高于主梁顶
    wl_ob = py(328)   # 左翘 外端底 y

    # 上翘端：右侧（镜像）
    wr_ox = px(854)   # 右翘 外端 x
    wr_ot = py(248)
    wr_ob = py(328)

    # ── 贯（下横梁）参数，两侧伸出，比笠木翘端更宽 ─────────
    # 笠木翘端：wl_ox=px(170) ~ wr_ox=px(854)，span=684
    # 贯左右：px(110) ~ px(914)，span=804，比笠木宽
    nk_l = px(175)
    nk_r = px(849)
    nk_t = py(468)
    nk_b = py(508)

    # ── 額束（笠木底~贯顶的中央短竖木）参数 ──────────────
    gk_cx  = px(512)           # 水平居中
    gk_hw  = int(s(18))        # 半宽
    gk_t   = py(395)           # = km_b（笠木底）
    gk_b   = py(468)           # = nk_t（贯顶）

    # ═══════════════════════ 绘制 ═══════════════════════

    # 1. 左翘端（四边形：内上→外上→外下→内下）
    left_wing = [
        (km_l,   km_t),
        (wl_ox,  wl_ot),
        (wl_ox,  wl_ob),
        (km_l,   km_b),
    ]
    draw.polygon(left_wing, fill=RED)
    # 顶面：黑色
    draw.polygon([
        (km_l,  km_t),
        (wl_ox, wl_ot),
        (wl_ox, wl_ot + int(s(14))),
        (km_l,  km_t + int(s(14))),
    ], fill=BLACK)
    # 阴影：翘端底面
    draw.polygon([
        (km_l,  km_b),
        (wl_ox, wl_ob),
        (wl_ox, wl_ob - int(s(10))),
        (km_l,  km_b - int(s(10))),
    ], fill=RED_SH)

    # 2. 右翘端
    right_wing = [
        (km_r,   km_t),
        (km_r,   km_b),
        (wr_ox,  wr_ob),
        (wr_ox,  wr_ot),
    ]
    draw.polygon(right_wing, fill=RED)
    draw.polygon([
        (km_r,  km_t),
        (wr_ox, wr_ot),
        (wr_ox, wr_ot + int(s(14))),
        (km_r,  km_t + int(s(14))),
    ], fill=BLACK)
    draw.polygon([
        (km_r,  km_b),
        (wr_ox, wr_ob),
        (wr_ox, wr_ob - int(s(10))),
        (km_r,  km_b - int(s(10))),
    ], fill=RED_SH)

    # 3. 主横梁（笠木中段）
    draw.rectangle([km_l, km_t, km_r, km_b], fill=RED)
    # 顶面黑色，与翘端顶面等宽（s(14)）
    draw.rectangle([km_l, km_t, km_r, km_t + int(s(14))], fill=BLACK)
    # 底面阴影条
    draw.rectangle([km_l, km_b - int(s(12)), km_r, km_b], fill=RED_SH)

    # 4. 额束（笠木底到贯顶的中央短竖木）
    draw.rectangle([gk_cx - gk_hw, gk_t, gk_cx + gk_hw, gk_b], fill=RED)
    draw.rectangle([gk_cx - gk_hw, gk_t, gk_cx - gk_hw + int(s(8)), gk_b], fill=RED_HI)
    draw.rectangle([gk_cx + gk_hw - int(s(8)), gk_t, gk_cx + gk_hw, gk_b], fill=RED_SH)

    # 5. 贯（下横梁，两侧伸出，比笠木更宽）
    draw.rectangle([nk_l, nk_t, nk_r, nk_b], fill=RED)
    draw.rectangle([nk_l, nk_t, nk_r, nk_t + int(s(10))], fill=RED_HI)
    draw.rectangle([nk_l, nk_b - int(s(8)), nk_r, nk_b], fill=RED_SH)

    # 6. 左柱
    draw.rectangle([lx, p_top, lx + pw, p_bot], fill=RED)
    draw.rectangle([lx, p_top, lx + int(s(10)), p_bot], fill=RED_HI)   # 左高光
    draw.rectangle([lx + pw - int(s(10)), p_top, lx + pw, p_bot], fill=RED_SH)  # 右阴影

    # 7. 右柱
    draw.rectangle([rx, p_top, rx + pw, p_bot], fill=RED)
    draw.rectangle([rx, p_top, rx + int(s(10)), p_bot], fill=RED_HI)
    draw.rectangle([rx + pw - int(s(10)), p_top, rx + pw, p_bot], fill=RED_SH)

    # 8. 柱础（底座）
    base_pad = int(s(14))
    base_h   = int(s(28))
    draw.rectangle([lx - base_pad, p_bot, lx + pw + base_pad, p_bot + base_h], fill=BLACK)
    draw.rectangle([rx - base_pad, p_bot, rx + pw + base_pad, p_bot + base_h], fill=BLACK)


def add_sun(draw, cx=512, cy=512, scale=1.0):
    """右上角太阳装饰：8条三角光芒 + 中心圆"""
    def s(v): return int(v * scale)
    sx = int(cx + (820 - 512) * scale)
    sy = int(cy + (158 - 530) * scale)

    core_r = s(28)   # 中心圆半径
    ray_len = s(22)  # 光芒长度
    ray_hw  = s(9)   # 光芒根部半宽

    for i in range(8):
        angle = math.radians(i * 45)
        perp  = angle + math.pi / 2
        bcx = sx + int(math.cos(angle) * core_r)
        bcy = sy + int(math.sin(angle) * core_r)
        tip = (sx + int(math.cos(angle) * (core_r + ray_len)),
               sy + int(math.sin(angle) * (core_r + ray_len)))
        p1  = (bcx + int(math.cos(perp) * ray_hw),
               bcy + int(math.sin(perp) * ray_hw))
        p2  = (bcx - int(math.cos(perp) * ray_hw),
               bcy - int(math.sin(perp) * ray_hw))
        draw.polygon([p1, p2, tip], fill=SUN)

    # 中心圆
    draw.ellipse([sx - core_r, sy - core_r, sx + core_r, sy + core_r], fill=SUN)
    # 高光
    draw.ellipse([sx - core_r + s(6), sy - core_r + s(4),
                  sx + s(6),          sy + s(4)], fill=SUN_HI)


# ═══════════════════════════════════════════
# 1.  icon.png  （完整背景版）
# ═══════════════════════════════════════════
img  = Image.new('RGB', (SIZE, SIZE), BG)
draw = ImageDraw.Draw(img)
draw_rounded_bg(draw, SIZE, 180, BG)
draw_torii(draw, cx=512, cy=530, scale=1.0)
add_sun(draw, cx=512, cy=530, scale=1.0)
img.save(f"{ASSETS}/icon.png")
print("icon.png saved")

# ═══════════════════════════════════════════
# 2.  adaptive-icon.png  （透明前景，缩小留边）
# ═══════════════════════════════════════════
img2  = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
draw2 = ImageDraw.Draw(img2)
sc  = 0.72
ocx = 512
ocy = int(512 + (530 - 512) * sc)   # 等比缩放后重新居中
draw_torii(draw2, cx=ocx, cy=ocy, scale=sc)
add_sun(draw2, cx=ocx, cy=ocy, scale=sc)
img2.save(f"{ASSETS}/adaptive-icon.png")
print("adaptive-icon.png saved")

# ═══════════════════════════════════════════
# 3.  各 mipmap 目录 webp 文件
# ═══════════════════════════════════════════
MIPMAP_SIZES = {
    "mipmap-mdpi":    48,
    "mipmap-hdpi":    72,
    "mipmap-xhdpi":   96,
    "mipmap-xxhdpi":  144,
    "mipmap-xxxhdpi": 192,
}

def make_launcher(px_size):
    """带背景的方形图标（ic_launcher）"""
    base = Image.new('RGB', (SIZE, SIZE), BG)
    d = ImageDraw.Draw(base)
    draw_rounded_bg(d, SIZE, 180, BG)
    draw_torii(d, cx=512, cy=530, scale=1.0)
    add_sun(d, cx=512, cy=530, scale=1.0)
    return base.resize((px_size, px_size), Image.LANCZOS)

def make_round(px_size):
    """圆形裁切版（ic_launcher_round）"""
    base = make_launcher(px_size)
    mask = Image.new('L', (px_size, px_size), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, px_size, px_size], fill=255)
    result = Image.new('RGB', (px_size, px_size), BG)
    result.paste(base, (0, 0), mask)
    return result

def make_foreground(px_size):
    """透明前景（ic_launcher_foreground）"""
    return img2.resize((px_size, px_size), Image.LANCZOS)

for folder, px in MIPMAP_SIZES.items():
    out_dir = f"{RES}/{folder}"
    os.makedirs(out_dir, exist_ok=True)
    make_launcher(px).save(f"{out_dir}/ic_launcher.webp",        "WEBP", quality=90)
    make_round(px).save(   f"{out_dir}/ic_launcher_round.webp",  "WEBP", quality=90)
    make_foreground(px).save(f"{out_dir}/ic_launcher_foreground.webp", "WEBP", quality=90)
    print(f"{folder} ({px}px) done")

print("\nAll done!")
