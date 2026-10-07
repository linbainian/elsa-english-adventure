"""Deterministic atlas slicing and runtime sizing; generated originals are retained."""
from pathlib import Path
from PIL import Image
import json

root = Path(__file__).resolve().parents[1] / "public" / "assets"
atlas = Image.open(root / "character-atlas.png").convert("RGBA")
w, h = atlas.size
sx, sy = round(w * .53), round(h * .53)
slots = {
    "hero": (0, 0, sx, sy),
    "fox": (sx, 0, w, sy),
    "guardian": (0, sy, sx, h),
    "owl": (sx, sy, w, h),
}
report = []
for name, box in slots.items():
    sprite = atlas.crop(box)
    bounds = sprite.getchannel("A").getbbox()
    if not bounds:
        raise ValueError(f"Empty sprite: {name}")
    sprite = sprite.crop(bounds)
    sprite.thumbnail((480, 480), Image.Resampling.LANCZOS)
    out = Image.new("RGBA", (512, 512))
    out.alpha_composite(sprite, ((512 - sprite.width) // 2, 500 - sprite.height))
    out.save(root / f"{name}.png", optimize=True)
    report.append({"asset": f"{name}.png", "size": [512, 512], "sourceBox": box,
                   "alpha": list(out.getchannel("A").getextrema())})
forest = Image.open(root / "forest-background.png").convert("RGB")
forest.thumbnail((1672, 941), Image.Resampling.LANCZOS)
forest.save(root / "forest.webp", quality=88, method=6)
print(json.dumps(report, ensure_ascii=False, indent=2))
