"""Production crop/anchor/resize and alpha QA for the generated Chapter 4 toy set."""
from pathlib import Path
import json, shutil
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
GENERATED = Path(r'C:\Users\l\.codex\generated_images\01a0fbdf-6f70-78a2-ab0a-74773329a413')
OUT = ROOT / 'public/assets/toys'
OUT.mkdir(parents=True, exist_ok=True)
spec = json.loads((ROOT / 'docs/toy-art-prompts.json').read_text(encoding='utf8'))
images = {}
report = []
for entry in spec['records']:
    raw = ROOT / entry['raw']
    raw.parent.mkdir(parents=True, exist_ok=True)
    if not raw.exists(): shutil.copy2(GENERATED / entry['source'], raw)
    images[entry['id']] = Image.open(raw).convert('RGBA')
    if entry['role'] == 'background':
        image = images[entry['id']].convert('RGB').resize((1600, 900), Image.Resampling.LANCZOS)
        image.save(ROOT / entry['output'], quality=89, method=6)
        report.append({'path': entry['id'] + '.webp', 'size': [1600, 900], 'role': 'background', 'source': entry['raw']})

atlas = images['sprites']
if atlas.size != (1536, 1024): raise RuntimeError('Review atlas bounds before slicing an unexpected size.')
if atlas.getchannel('A').getextrema()[0] != 0: raise RuntimeError('Source does not have transparent alpha.')
# Authored bounds preserve the car's winding key and the doll's feet, which cross ideal grid margins.
boxes = {
    'ball': (0, 0, 510, 550), 'teddy': (510, 0, 1040, 550), 'doll': (1040, 0, 1536, 560),
    'car': (0, 560, 567, 1024), 'train': (567, 560, 1055, 1024), 'blocks': (1055, 560, 1536, 1024),
}
sprite_sources = {name: (atlas.crop(box), box) for name, box in boxes.items()}
sprite_sources['wagon'] = (images['wagon'], None)
for name, (tile, box) in sprite_sources.items():
    bounds = tile.getchannel('A').point(lambda a: 255 if a >= 16 else 0).getbbox()
    if not bounds: raise RuntimeError('Empty toy: ' + name)
    crop = tile.crop(bounds)
    scale = min(468 / crop.width, 470 / crop.height)
    resized = crop.convert('RGBa').resize((round(crop.width * scale), round(crop.height * scale)), Image.Resampling.LANCZOS).convert('RGBA')
    sprite = Image.new('RGBA', (512, 512))
    sprite.alpha_composite(resized, ((512 - resized.width) // 2, 500 - resized.height))
    sprite.save(OUT / (name + '.png'), optimize=True)
    alpha = sprite.getchannel('A')
    content = alpha.point(lambda a: 255 if a >= 16 else 0).getbbox()
    if not content or content[0] < 8 or content[1] < 8 or content[2] > 504 or content[3] > 504:
        raise RuntimeError('Clipped content: ' + name)
    if alpha.getextrema()[0] != 0: raise RuntimeError('Missing alpha: ' + name)
    report.append({'path': name + '.png', 'role': 'toy sprite', 'size': [512, 512], 'alpha': list(alpha.getextrema()),
        'bounds': list(content), 'pivot': [256, 500], 'source': 'docs/art-source/toys-wagon.png' if name == 'wagon' else 'docs/art-source/toys-sprites.png', 'sourceCrop': list(box) if box else None})

sheet = Image.new('RGB', (1200, 755), '#f9f2e8')
draw = ImageDraw.Draw(sheet)
for i, name in enumerate(['playroom', 'station', 'parade']):
    preview = Image.open(OUT / (name + '.webp')).resize((390, 219), Image.Resampling.LANCZOS)
    sheet.paste(preview, (i * 400 + 5, 5))
    draw.text((i * 400 + 12, 232), name, fill='#554866')
for i, name in enumerate(sprite_sources):
    preview = Image.open(OUT / (name + '.png'))
    preview.thumbnail((185, 200), Image.Resampling.LANCZOS)
    x, y = i % 6 * 200, 272 + i // 6 * 240
    sheet.paste(preview, (x + (200 - preview.width) // 2, y), preview)
    draw.text((x + 12, y + 213), name, fill='#554866')
sheet.save(ROOT / 'docs/toy-assets-contact.jpg', quality=92)
(OUT / 'asset-checks.json').write_text(json.dumps({'files': len(report), 'errors': [], 'results': report}, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
(OUT / 'manifest.json').write_text(json.dumps({
    'generatedWith': 'built-in image_gen', 'date': '2026-10-04', 'sourceDirectory': 'docs/art-source',
    'prompts': 'docs/toy-art-prompts.json', 'normalization': 'scripts/normalize-toy-assets.py',
    'artDirection': spec['artDirection'], 'files': report, 'approval': 'Selected for in-game validation',
}, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
print('Saved 3 backgrounds, 6 transparent toys and a carriage; all crop/size/alpha checks passed.')
