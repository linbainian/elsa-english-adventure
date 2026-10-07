"""Extract generated alpha islands; retain complete silhouettes and align feet."""
from pathlib import Path
from collections import deque
import json, shutil
from PIL import Image, ImageDraw, ImageChops, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/assets/community'
OUT.mkdir(parents=True, exist_ok=True)
spec = json.loads((ROOT / 'docs/community-art-final-records.json').read_text(encoding='utf8'))
images, sources, report = {}, {}, []
for entry in spec['records']:
    raw = ROOT / entry['source']
    raw.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(entry['generatedPath'], raw)
    images[entry['name']] = Image.open(raw).convert('RGBA')
    sources[entry['name']] = entry['source']
    if entry['role'] == 'background':
        images[entry['name']].convert('RGB').resize((1600, 900), Image.Resampling.LANCZOS).save(OUT / (entry['name'] + '.webp'), quality=89, method=6)
        report.append({'path': entry['name'] + '.webp', 'role': 'background', 'size': [1600, 900], 'source': entry['source']})

def islands(raw, count=6):
    alpha = images[raw].getchannel('A')
    w, h = alpha.size
    if alpha.getextrema()[0] != 0: raise RuntimeError('No genuine alpha: ' + raw)
    pixels, visited, components = alpha.tobytes(), bytearray(w * h), []
    for start, value in enumerate(pixels):
        if value < 16 or visited[start]: continue
        queue, members = deque([start]), []; visited[start] = 1
        while queue:
            index = queue.popleft(); members.append(index)
            x, y = index % w, index // w
            neighbors = ([index - 1] if x else []) + ([index + 1] if x + 1 < w else []) + ([index - w] if y else []) + ([index + w] if y + 1 < h else [])
            for nxt in neighbors:
                if pixels[nxt] >= 16 and not visited[nxt]: visited[nxt] = 1; queue.append(nxt)
        if len(members) > 9000: components.append(members)
    if len(components) != count: raise RuntimeError('Expected ' + str(count) + ' separate alpha islands: ' + raw + ' ' + str(len(components)))
    components.sort(key=lambda part: (int(sum(index // w for index in part) / len(part)) // (h // 2), sum(index % w for index in part) / len(part)))
    extracted = []
    for part in components:
        mask_bytes = bytearray(w * h)
        for index in part: mask_bytes[index] = 255
        mask = Image.frombytes('L', (w, h), bytes(mask_bytes)).filter(ImageFilter.MaxFilter(7))
        isolated = images[raw].copy(); isolated.putalpha(ImageChops.multiply(alpha, mask))
        bounds = isolated.getchannel('A').point(lambda v: 255 if v >= 16 else 0).getbbox()
        print(raw, 'source bounds', bounds, 'pixels', len(part))
        if bounds[0] < 3 or bounds[1] < 3 or bounds[2] > w - 3 or bounds[3] > h - 3:
            raise RuntimeError('Clipped original silhouette; regenerate, never fake-pad: ' + raw + ' ' + str(bounds))
        box = (bounds[0] - 3, bounds[1] - 3, bounds[2] + 3, bounds[3] + 3)
        extracted.append((isolated.crop(box), box))
    return extracted

def save(name, raw, tile, box, role, max_size=(460, 460)):
    bounds = tile.getchannel('A').point(lambda v: 255 if v >= 16 else 0).getbbox()
    crop = tile.crop(bounds)
    ratio = min(max_size[0] / crop.width, max_size[1] / crop.height)
    scaled = crop.convert('RGBa').resize((round(crop.width * ratio), round(crop.height * ratio)), Image.Resampling.LANCZOS).convert('RGBA')
    sprite = Image.new('RGBA', (512, 512))
    sprite.alpha_composite(scaled, ((512 - scaled.width) // 2, 500 - scaled.height))
    alpha = sprite.getchannel('A'); final_bounds = alpha.point(lambda v: 255 if v >= 16 else 0).getbbox()
    if alpha.getextrema()[0] != 0 or final_bounds[0] < 4 or final_bounds[1] < 4 or final_bounds[2] > 508 or final_bounds[3] > 508:
        raise RuntimeError('Alpha/padding failed: ' + name)
    sprite.save(OUT / (name + '.png'), optimize=True)
    report.append({'path': name + '.png', 'role': role, 'size': [512, 512], 'alpha': list(alpha.getextrema()),
        'bounds': list(final_bounds), 'anchors': {'feet': [256, 500]}, 'source': sources[raw], 'sourceCrop': list(box)})
    return sprite

roles = ['bus-driver', 'firefighter', 'police-officer', 'doctor', 'nurse', 'dentist']
for raw, suffix in [('helpers', ''), ('waves', '-wave')]:
    for role, (tile, box) in zip(roles, islands(raw)):
        sprite = save(role + suffix, raw, tile, box, 'community helper' + suffix)
        if not suffix:
            # Head and shoulders for badges and seated bus passengers, from the actual helper.
            head = sprite.crop((96, 35, 416, 350)).convert('RGBa').resize((256, 256), Image.Resampling.LANCZOS).convert('RGBA')
            head.save(OUT / ('face-' + role + '.png'), optimize=True)
            report.append({'path': 'face-' + role + '.png', 'role': 'portrait', 'size': [256, 256], 'source': role + '.png', 'crop': [96, 35, 416, 350]})
props = ['bus', 'tooth', 'brush', 'stethoscope', 'pinwheel', 'flower']
for name, (tile, box) in zip(props, islands('props')):
    save(name, 'props', tile, box, 'moving story prop', (472, 450))
for tile, box in islands('blanket', 1):
    save('blanket', 'blanket', tile, box, 'soft generated quilt')

tuantuan = Image.open(ROOT / 'public/assets/body/rabbit-idle.png').convert('RGBA')
tuantuan.crop((96, 35, 416, 350)).convert('RGBa').resize((256, 256), Image.Resampling.LANCZOS).convert('RGBA').save(OUT / 'face-tuantuan.png', optimize=True)
report.append({'path': 'face-tuantuan.png', 'role': 'seated passenger portrait', 'size': [256, 256],
    'source': 'public/assets/body/rabbit-idle.png', 'crop': [96, 35, 416, 350]})

sheet = Image.new('RGB', (1200, 1300), '#f7f0e5'); draw = ImageDraw.Draw(sheet)
for i, name in enumerate(['street', 'clinic', 'plaza']):
    preview = Image.open(OUT / (name + '.webp')).resize((390, 219), Image.Resampling.LANCZOS)
    sheet.paste(preview, (i * 400 + 5, 5)); draw.text((i * 400 + 12, 232), name, fill='#554866')
for i, name in enumerate(roles + [role + '-wave' for role in roles] + props + ['blanket']):
    preview = Image.open(OUT / (name + '.png')).resize((178, 178), Image.Resampling.LANCZOS)
    x, y = i % 6 * 200 + 10, 270 + i // 6 * 250
    sheet.paste(preview, (x, y), preview); draw.text((x + 8, y + 186), name, fill='#554866')
sheet.save(ROOT / 'docs/community-assets-contact.jpg', quality=93)
(OUT / 'asset-checks.json').write_text(json.dumps({'files': len(report), 'errors': [], 'results': report}, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
(OUT / 'manifest.json').write_text(json.dumps({'generatedWith': 'built-in image_gen', 'date': '2026-10-04',
    'prompts': 'docs/community-art-final-records.json', 'normalization': 'scripts/normalize-community-assets.py',
    'artDirection': spec['artDirection'], 'files': report, 'approval': 'Selected for in-game validation'}, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
print('Saved', len(report), 'community assets with genuine alpha, complete silhouettes and shared anchors.')
