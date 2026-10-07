"""Reproducible crop, resize and anchor alignment; no generated-pixel painting."""
from pathlib import Path
import json
import shutil
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/assets/snow'
ORIGINALS = OUT / 'originals'
GENERATED = Path(r'C:\Users\l\.codex\generated_images\01a0fbdf-6f70-78a2-ab0a-74773329a413')
ORIGINALS.mkdir(parents=True, exist_ok=True)
REPORT = []

def original(name, filename):
    destination = ORIGINALS / (name + '.png')
    shutil.copy2(GENERATED / filename, destination)
    return Image.open(destination).convert('RGBA')

def resize_alpha(image, size):
    # Premultiplied resize prevents hidden RGB in transparent pixels leaking into edges.
    return image.convert('RGBa').resize(size, Image.Resampling.LANCZOS).convert('RGBA')

def save(image, name):
    image.save(OUT / (name + '.png'), optimize=True)
    alpha = image.getchannel('A')
    REPORT.append({'asset': name, 'size': list(image.size), 'alpha': list(alpha.getextrema()), 'bounds': list(alpha.getbbox() or (0, 0, 0, 0))})

def sprite(image, name, height=470, width=470):
    box = image.getchannel('A').getbbox()
    if box is None:
        raise RuntimeError('Empty cutout ' + name)
    cropped = image.crop(box)
    scale = min(width / cropped.width, height / cropped.height)
    sized = resize_alpha(cropped, (round(cropped.width * scale), round(cropped.height * scale)))
    canvas = Image.new('RGBA', (512, 512))
    canvas.alpha_composite(sized, ((512 - sized.width) // 2, 500 - sized.height))
    save(canvas, name)

for name, filename in {
    'glade': 'exec-f20c3d49-828c-44cf-8a3f-72b09f99eafe.png',
    'orchard': 'exec-9360502b-819f-4430-9f40-2b2eca6a794d.png',
    'palace': 'exec-ff565d45-545c-411e-bdb8-eea8d76c71d8.png',
}.items():
    image = original(name, filename).convert('RGB')
    image.resize((1600, 900), Image.Resampling.LANCZOS).save(OUT / (name + '.webp'), quality=89, method=6)

friends = original('friends-atlas', 'exec-57bf6d52-0011-4df3-bd13-cd964020fa7b.png')
for name, box in {
    'buddy-idle': (0, 0, 627, 615), 'buddy-wave': (627, 0, 1254, 615),
    'troll': (0, 615, 627, 1254), 'owl': (627, 615, 1254, 1254),
}.items():
    sprite(friends.crop(box), name)

props = original('props-atlas', 'exec-675d3b66-64be-4090-b175-aec19ad6fabf.png')
for name, box in {
    'gate-closed': (0, 0, 512, 512), 'gate-open': (512, 0, 1024, 512),
    'basket': (1024, 0, 1536, 496), 'lantern': (0, 496, 380, 1024),
    'bridge': (380, 512, 1100, 1024), 'globe': (1100, 512, 1536, 1024),
}.items():
    sprite(props.crop(box), name, height=470, width=470)

fruit = original('fruit-atlas', 'exec-a5d516fb-b69e-4f4b-b90b-5a2a147b7039.png')
for name, box in {'apple': (0, 0, 680, 724), 'banana': (680, 0, 1530, 724), 'pear': (1530, 0, 2172, 724)}.items():
    sprite(fruit.crop(box), name, height=470, width=470)

# Three real source poses, with a shared torso anchor and floor baseline.
# Wider canvases preserve the cape rather than squeezing it into a square.
for pose, filename, torso_x in [('idle', 'elsa-wiki.png', 60), ('cheer', 'elsa-cheer.webp', 333), ('cast', 'elsa-cast.webp', 160)]:
    image = Image.open(ORIGINALS / filename).convert('RGBA')
    scale = 480 / image.height
    sized = resize_alpha(image, (round(image.width * scale), 480))
    canvas = Image.new('RGBA', (1024, 512))
    canvas.alpha_composite(sized, (round(512 - torso_x * scale), 20))
    save(canvas, 'princess-' + pose)

# QA sheet composites actual alpha over the game palette, exposing cutout defects.
names = [r['asset'] for r in REPORT]
sheet = Image.new('RGB', (960, ((len(names) + 3) // 4) * 270), '#e6ecff')
draw = ImageDraw.Draw(sheet)
for i, name in enumerate(names):
    image = Image.open(OUT / (name + '.png')).convert('RGBA')
    image.thumbnail((225, 230), Image.Resampling.LANCZOS)
    x = (i % 4) * 240 + (240 - image.width) // 2
    y = (i // 4) * 270 + 12
    sheet.paste(image, (x, y), image)
    draw.text(((i % 4) * 240 + 12, (i // 4) * 270 + 249), name, fill='#4d397b')
sheet.save(ROOT / 'docs/snow-assets-contact.jpg', quality=92)
(OUT / 'asset-checks.json').write_text(json.dumps(REPORT, indent=2), encoding='utf8')
print('Normalized', len(REPORT), 'cutouts and 3 backgrounds. QA: docs/snow-assets-contact.jpg')
