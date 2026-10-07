"""Normalize generated theme art: crop, align, premultiplied resize, alpha and in-game QA."""
from pathlib import Path
import json, shutil
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
GENERATED = Path(r'C:\Users\l\.codex\generated_images\01a0fbdf-6f70-78a2-ab0a-74773329a413')
RAW = ROOT / 'docs/art-source'
OUT = ROOT / 'public/assets'
RAW.mkdir(parents=True, exist_ok=True)
for folder in ['body', 'family', 'themes']: (OUT / folder).mkdir(parents=True, exist_ok=True)
report = []

def original(name, filename):
    dest = RAW / (name + '.png')
    if not dest.exists(): shutil.copy2(GENERATED / filename, dest)
    return Image.open(dest).convert('RGBA')

def save_sprite(image, path, scale=None, anchor=None):
    alpha = image.getchannel('A')
    box = alpha.point(lambda value: 255 if value >= 16 else 0).getbbox()
    if not box: raise RuntimeError('Empty alpha: ' + path)
    cropped = image.crop(box)
    factor = scale or min(468 / cropped.width, 470 / cropped.height)
    size = (round(cropped.width * factor), round(cropped.height * factor))
    scaled = cropped.convert('RGBa').resize(size, Image.Resampling.LANCZOS).convert('RGBA')
    canvas = Image.new('RGBA', (512, 512))
    x = round(256 - ((anchor - box[0]) if anchor is not None else cropped.width / 2) * factor)
    canvas.alpha_composite(scaled, (x, 500 - scaled.height))
    canvas.save(OUT / (path + '.png'), optimize=True)
    bounds = canvas.getchannel('A').point(lambda value: 255 if value >= 16 else 0).getbbox()
    report.append({'path': path + '.png', 'size': [512, 512], 'alpha': list(canvas.getchannel('A').getextrema()), 'bounds': bounds, 'anchor': [256, 500], 'source': 'Built-in image_gen / ' + image.info.get('source_name', '')})

backgrounds = {
  'body/workshop': 'exec-6a8b5218-9e80-450e-b6c7-6fcabf0f6a28.png',
  'body/music': 'exec-69bca14f-54a3-46e2-b54a-36d7a6ed700c.png',
  'body/stage': 'exec-894f80e1-b0e6-4409-a033-29f179074880.png',
  'family/living': 'exec-2fbab7e2-2272-4df2-90a2-7944f24cd944.png',
  'family/garden': 'exec-eda312f6-9aa2-4e09-9ede-4cc893a13078.png',
  'family/studio': 'exec-ec6b270b-bf7c-47f2-80ed-a480c9e0d58a.png',
}
for path, filename in backgrounds.items():
    image = original(path.replace('/', '-'), filename).convert('RGB').resize((1600, 900), Image.Resampling.LANCZOS)
    image.save(OUT / (path + '.webp'), quality=89, method=6)
    report.append({'path': path + '.webp', 'size': [1600, 900], 'source': 'Built-in image_gen', 'role': 'background'})

body = original('body-rabbit-poses', 'exec-ca80e6a4-f516-47ab-8f3f-a35bb9749209.png')
# Shared body scale and torso anchor keep the bunny from sliding between key poses.
for index, name in enumerate(['idle', 'nose', 'clap', 'march', 'blow', 'sleep']):
    column, row = index % 3, index // 3
    tile = body.crop((column * 512, row * 512, (column + 1) * 512, (row + 1) * 512))
    tile.info['source_name'] = 'body-rabbit-poses'
    save_sprite(tile, 'body/rabbit-' + name, scale=.955, anchor=[275, 273, 269, 275, 274, 270][index])

family = original('family-roster', 'exec-d607e2fb-3307-41c8-b8b5-0439c94024c4.png')
boxes = {
 'mommy': (0, 0, 567, 549), 'daddy': (567, 0, 1030, 555), 'grandma': (1030, 0, 1536, 555),
 'grandpa': (0, 546, 567, 1024), 'baby': (567, 555, 1030, 1024), 'frame': (1030, 555, 1536, 1024),
}
for name, box in boxes.items():
    tile = family.crop(box)
    tile.info['source_name'] = 'family-roster'
    save_sprite(tile, 'family/' + name)

props = original('theme-props', 'exec-195da944-bdf3-4b7c-9734-1616b944e83b.png')
boxes = {
 'gift': (0, 0, 530, 530), 'storybook': (530, 0, 1090, 496), 'balloon': (1090, 0, 1536, 540),
 'camera': (0, 540, 530, 1024), 'bell': (530, 496, 1030, 1024), 'butterfly': (1030, 540, 1536, 1024),
}
for name, box in boxes.items():
    tile = props.crop(box)
    tile.info['source_name'] = 'theme-props'
    save_sprite(tile, 'themes/' + name)

sheet = Image.new('RGB', (1200, 1100), '#e7efe9')
draw = ImageDraw.Draw(sheet)
sprites = [entry for entry in report if entry['path'].endswith('.png')]
for index, entry in enumerate(sprites):
    im = Image.open(OUT / entry['path'])
    im.thumbnail((185, 195), Image.Resampling.LANCZOS)
    x, y = index % 6 * 200, index // 6 * 230
    sheet.paste(im, (x + (200 - im.width) // 2, y), im)
    draw.text((x + 8, y + 202), entry['path'], fill='#584167')
for index, path in enumerate(backgrounds):
    im = Image.open(OUT / (path + '.webp')).resize((390, 219), Image.Resampling.LANCZOS)
    x, y = index % 3 * 400, 710 + index // 3 * 195
    im.thumbnail((390, 175))
    sheet.paste(im, (x + 4, y))
    draw.text((x + 8, y + 177), path, fill='#584167')
sheet.save(ROOT / 'docs/theme-assets-contact.jpg', quality=92)
(OUT / 'themes/asset-checks.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
(OUT / 'themes/manifest.json').write_text(json.dumps({
 'generatedWith': 'built-in image_gen', 'date': '2026-10-03', 'sourceDirectory': 'docs/art-source',
 'artDirection': 'Rounded plush 3D storybook; distinctive room, garden, sky and night palettes',
 'backgrounds': list(backgrounds), 'sprites': [entry['path'] for entry in sprites],
 'prompts': 'docs/theme-art-prompts.json', 'referenceSources': ['public/assets/snow/buddy-idle.png', 'public/assets/snow/troll.png'],
 'normalization': 'scripts/normalize-theme-assets.py', 'checks': 'asset-checks.json',
}, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
print('Saved 6 backgrounds and', len(sprites), 'alpha sprites; docs/theme-assets-contact.jpg')
