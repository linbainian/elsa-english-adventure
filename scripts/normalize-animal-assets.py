"""Crop genuine generated alpha; normalize animal pose anchors without repainting art."""
from pathlib import Path
import json, shutil
from PIL import Image, ImageDraw, ImageChops, ImageFilter
from collections import deque

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/assets/animals'
OUT.mkdir(parents=True, exist_ok=True)
spec = json.loads((ROOT / 'docs/animal-art-prompts.json').read_text(encoding='utf8'))
images, report = {}, []
for entry in spec['records']:
    raw = ROOT / entry['source']
    raw.parent.mkdir(parents=True, exist_ok=True)
    if not raw.exists(): shutil.copy2(entry['generatedPath'], raw)
    im = Image.open(raw).convert('RGBA')
    images[entry['name']] = im
    if entry['role'] == 'background':
        im.convert('RGB').resize((1600, 900), Image.Resampling.LANCZOS).save(OUT / (entry['name'] + '.webp'), quality=89, method=6)
        report.append({'path': entry['name'] + '.webp', 'role': 'background', 'size': [1600, 900], 'source': entry['source']})

animals = ['cat', 'dog', 'rabbit', 'bird', 'duck', 'fish']
for name in ['idle', 'poses', 'props']:
    if images[name].size != (1536, 1024): raise RuntimeError('Recheck atlas crop coordinates: ' + name)
    if images[name].getchannel('A').getextrema()[0] != 0: raise RuntimeError('Missing real alpha: ' + name)

def islands(raw):
    """Extract the six separate alpha islands; wide wings may cross nominal grid lines."""
    alpha = images[raw].getchannel('A')
    w, h = alpha.size
    pixels = alpha.tobytes()
    visited = bytearray(w * h)
    components = []
    for start, value in enumerate(pixels):
        if value < 16 or visited[start]: continue
        queue = deque([start]); visited[start] = 1; members = []
        while queue:
            index = queue.popleft(); members.append(index)
            x, y = index % w, index // w
            for nxt in ([index - 1] if x else []) + ([index + 1] if x + 1 < w else []) + ([index - w] if y else []) + ([index + w] if y + 1 < h else []):
                if pixels[nxt] >= 16 and not visited[nxt]: visited[nxt] = 1; queue.append(nxt)
        if len(members) > 10000: components.append(members)
    if len(components) != 6: raise RuntimeError('Expected six distinct alpha islands: ' + raw + ' ' + str(len(components)))
    components.sort(key=lambda part: (int(sum(index // w for index in part) / len(part)) // 512, sum(index % w for index in part) / len(part)))
    extracted = []
    for part in components:
        mask_bytes = bytearray(w * h)
        for index in part: mask_bytes[index] = 255
        # Retain soft antialias/fur just outside the main island, without neighboring sprites.
        mask = Image.frombytes('L', (w, h), bytes(mask_bytes)).filter(ImageFilter.MaxFilter(7))
        isolated = images[raw].copy(); isolated.putalpha(ImageChops.multiply(alpha, mask))
        bounds = isolated.getchannel('A').point(lambda v: 255 if v >= 16 else 0).getbbox()
        if bounds[0] < 3 or bounds[1] < 3 or bounds[2] > w - 3 or bounds[3] > h - 3: raise RuntimeError('Clipped original silhouette: ' + raw)
        box = (bounds[0] - 3, bounds[1] - 3, bounds[2] + 3, bounds[3] + 3)
        extracted.append((isolated.crop(box), box))
    return extracted

def save(name, raw, box, max_size, role, tile=None):
    if tile is None: tile = images[raw].crop(box)
    bounds = tile.getchannel('A').point(lambda v: 255 if v >= 16 else 0).getbbox()
    if not bounds: raise RuntimeError('Empty sprite: ' + name)
    # All source silhouettes must fit; a cut ear/wing is not repaired by resizing.
    if bounds[0] < 2 or bounds[1] < 2 or bounds[2] > tile.width - 2 or bounds[3] > tile.height - 2:
        raise RuntimeError('Source silhouette crosses reviewed crop: ' + name + ' ' + str(bounds))
    crop = tile.crop(bounds)
    ratio = min(max_size[0] / crop.width, max_size[1] / crop.height)
    scaled = crop.convert('RGBa').resize((round(crop.width * ratio), round(crop.height * ratio)), Image.Resampling.LANCZOS).convert('RGBA')
    sprite = Image.new('RGBA', (512, 512))
    sprite.alpha_composite(scaled, ((512 - scaled.width) // 2, 500 - scaled.height))
    alpha = sprite.getchannel('A')
    final_bounds = alpha.point(lambda v: 255 if v >= 16 else 0).getbbox()
    if alpha.getextrema()[0] != 0 or not final_bounds or final_bounds[0] < 4 or final_bounds[1] < 4 or final_bounds[2] > 508 or final_bounds[3] > 508:
        raise RuntimeError('Alpha or padding check failed: ' + name)
    sprite.save(OUT / (name + '.png'), optimize=True)
    report.append({'path': name + '.png', 'role': role, 'size': [512, 512], 'alpha': list(alpha.getextrema()),
        'bounds': list(final_bounds), 'anchors': {'feet': [256, 500]}, 'source': 'docs/art-source/animals-' + raw + '.png', 'sourceCrop': list(box)})

for i, animal in enumerate(animals):
    box = (i % 3 * 512, i // 3 * 512, (i % 3 + 1) * 512, (i // 3 + 1) * 512)
    save(animal, 'idle', box, (460, 460), 'awake animal')

# Reviewed wing crop crosses the ideal grid; keep the complete wing, no clipping.
pose_names = ['cat-sleep', 'dog-play', 'rabbit-sleep', 'bird-fly', 'duck-swim', 'fish-swim']
pose_sizes = [(430, 350), (460, 440), (420, 340), (480, 355), (430, 365), (460, 390)]
for name, (tile, box), size in zip(pose_names, islands('poses'), pose_sizes):
    save(name, 'poses', box, size, 'expressive animal pose', tile)

props = ['bed', 'ball', 'brush', 'aquarium', 'leaf', 'tent']
for name, (tile, box) in zip(props, islands('props')): save(name, 'props', box, (468, 468), 'animal-care prop', tile)

sheet = Image.new('RGB', (1200, 1000), '#f7f0e5')
draw = ImageDraw.Draw(sheet)
for i, name in enumerate(['shelter', 'pond', 'camp']):
    preview = Image.open(OUT / (name + '.webp')).resize((390, 219), Image.Resampling.LANCZOS)
    sheet.paste(preview, (i * 400 + 5, 5)); draw.text((i * 400 + 12, 232), name, fill='#554866')
for i, name in enumerate(animals + pose_names + list(props)):
    preview = Image.open(OUT / (name + '.png')).resize((180, 180), Image.Resampling.LANCZOS)
    x, y = i % 6 * 200 + 10, 275 + i // 6 * 230
    sheet.paste(preview, (x, y), preview); draw.text((x + 8, y + 188), name, fill='#554866')
sheet.save(ROOT / 'docs/animal-assets-contact.jpg', quality=93)
(OUT / 'asset-checks.json').write_text(json.dumps({'files': len(report), 'errors': [], 'results': report}, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
(OUT / 'manifest.json').write_text(json.dumps({'generatedWith': 'built-in image_gen', 'date': '2026-10-04',
    'prompts': 'docs/animal-art-prompts.json', 'normalization': 'scripts/normalize-animal-assets.py',
    'artDirection': spec['artDirection'], 'files': report, 'approval': 'Selected for in-game validation'}, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
print('Saved', len(report), 'animal assets; real alpha, full silhouettes and shared anchors checked.')
