"""Extract generated clothing sprites; align neck/feet for runtime dress-up composition."""
from pathlib import Path
import json, shutil
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/assets/wardrobe'
OUT.mkdir(parents=True, exist_ok=True)
spec = json.loads((ROOT / 'docs/wardrobe-art-prompts.json').read_text(encoding='utf8'))
images, report = {}, []
for entry in spec['records']:
    raw = ROOT / entry['source']
    raw.parent.mkdir(parents=True, exist_ok=True)
    if not raw.exists(): shutil.copy2(entry['generatedPath'], raw)
    images[entry['name']] = Image.open(raw).convert('RGBA')
    if entry['role'] == 'background':
        images[entry['name']].convert('RGB').resize((1600, 900), Image.Resampling.LANCZOS).save(OUT / (entry['name'] + '.webp'), quality=89, method=6)
        report.append({'path': entry['name'] + '.webp', 'role': 'background', 'size': [1600, 900], 'source': entry['source']})

atlas = images['garments']
if atlas.size != (1536, 1024): raise RuntimeError('Recheck garment atlas crop coordinates.')
if atlas.getchannel('A').getextrema()[0] != 0: raise RuntimeError('Garments require genuine transparent alpha.')
# Shared neck and floor anchors prevent the face from jumping during clothing changes.
# The wide ball-gown hem crosses an ideal grid boundary; preserve it with reviewed crops.
outfits = {
    'casual': ((0, 0, 530, 499), (315, 18), 485),
    'dress': ((530, 0, 1023, 499), (765, 18), 485),
    'shirt': ((1023, 0, 1536, 499), (1198, 18), 485),
    'skirt': ((0, 499, 520, 1024), (313, 505), 998),
    'coat': ((520, 499, 932, 1024), (755, 506), 998),
    'ballgown': ((932, 499, 1536, 1024), (1196, 519), 998),
}
def save_sprite(name, sprite, role, source, box, anchors):
    a = sprite.getchannel('A')
    bounds = a.point(lambda v: 255 if v >= 16 else 0).getbbox()
    if not bounds or a.getextrema()[0] != 0: raise RuntimeError('Empty/missing transparency: ' + name)
    if bounds[0] < 4 or bounds[1] < 4 or bounds[2] > sprite.width - 4 or bounds[3] > sprite.height - 4: raise RuntimeError('Clipped sprite: ' + name)
    sprite.save(OUT / (name + '.png'), optimize=True)
    report.append({'path': name + '.png', 'role': role, 'size': list(sprite.size), 'alpha': list(a.getextrema()), 'bounds': list(bounds), 'anchors': anchors, 'source': source, 'sourceCrop': list(box)})

for name, (box, neck, feet) in outfits.items():
    crop = atlas.crop(box)
    scale = 385 / (feet - neck[1])
    resized = crop.convert('RGBa').resize((round(crop.width * scale), round(crop.height * scale)), Image.Resampling.LANCZOS).convert('RGBA')
    sprite = Image.new('RGBA', (1024, 512))
    x = round(512 - (neck[0] - box[0]) * scale)
    y = round(115 - (neck[1] - box[1]) * scale)
    sprite.alpha_composite(resized, (x, y))
    save_sprite('outfit-' + name, sprite, 'wearable outfit', 'docs/art-source/wardrobe-garments.png', box, {'neck': [512, 115], 'feet': [512, 500]})

accessories = images['accessories']
if accessories.size != (1290, 1219): raise RuntimeError('Recheck accessory atlas crop coordinates.')
parts = {
    'dress': (images['props'], (0, 0, 755, 526), 'props'),
    'shirt': (images['props'], (755, 0, 1536, 466), 'props'),
    'skirt': (images['props'], (0, 526, 755, 1024), 'props'),
    'coat': (images['props'], (755, 466, 1536, 1024), 'props'),
    'hat': (accessories, (0, 0, 737, 500), 'accessories'),
    'shoes': (accessories, (737, 0, 1290, 495), 'accessories'),
    'shoes-sparkle': (accessories, (0, 550, 676, 1200), 'accessories'),
    'frame': (accessories, (676, 495, 1290, 1219), 'accessories'),
}
for name, (source, box, raw) in parts.items():
    tile = source.crop(box)
    bounds = tile.getchannel('A').point(lambda a: 255 if a >= 16 else 0).getbbox()
    if not bounds: raise RuntimeError('Empty part: ' + name)
    crop = tile.crop(bounds)
    scale = min(468 / crop.width, 470 / crop.height)
    resized = crop.convert('RGBa').resize((round(crop.width * scale), round(crop.height * scale)), Image.Resampling.LANCZOS).convert('RGBA')
    sprite = Image.new('RGBA', (512, 512))
    sprite.alpha_composite(resized, ((512 - resized.width) // 2, 500 - resized.height))
    save_sprite(name, sprite, 'clothing prop' if name != 'frame' else 'empty mirror frame', 'docs/art-source/wardrobe-' + raw + '.png', box, {'feet': [256, 500]})

sheet = Image.new('RGB', (1200, 950), '#f9f2e8')
draw = ImageDraw.Draw(sheet)
for i, name in enumerate(['closet', 'garden', 'ball']):
    preview = Image.open(OUT / (name + '.webp')).resize((390, 219), Image.Resampling.LANCZOS)
    sheet.paste(preview, (i * 400 + 5, 5)); draw.text((i * 400 + 12, 230), name, fill='#554866')
for i, name in enumerate(outfits):
    preview = Image.open(OUT / ('outfit-' + name + '.png')).resize((390, 195), Image.Resampling.LANCZOS)
    x, y = i % 3 * 400 + 5, 265 + i // 3 * 215
    sheet.paste(preview, (x, y), preview); draw.text((x + 12, y + 197), name, fill='#554866')
for i, name in enumerate(parts):
    preview = Image.open(OUT / (name + '.png')); preview.thumbnail((140, 170), Image.Resampling.LANCZOS)
    x, y = i * 150, 735
    sheet.paste(preview, (x + (150 - preview.width) // 2, y), preview); draw.text((x + 8, 919), name, fill='#554866')
sheet.save(ROOT / 'docs/wardrobe-assets-contact.jpg', quality=92)
(OUT / 'asset-checks.json').write_text(json.dumps({'files': len(report), 'errors': [], 'results': report}, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
(OUT / 'manifest.json').write_text(json.dumps({'generatedWith': 'built-in image_gen', 'date': '2026-10-04', 'prompts': 'docs/wardrobe-art-prompts.json', 'normalization': 'scripts/normalize-wardrobe-assets.py', 'artDirection': spec['artDirection'], 'portrait': {'source': 'public/assets/snow/princess-idle.png', 'method': 'runtime crop; original art preserved; hand uses a separate texture', 'crop': [455, 0, 120, 123], 'frame': '__BASE', 'handCrop': [465, 254, 19, 29]}, 'files': report, 'approval': 'Selected for in-game validation'}, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
print(f'Saved {len(report)} wardrobe assets; shared neck/floor anchors and alpha checks passed.')
