"""Normalize downloaded Elsa cutouts without repainting their pixels.

All actor frames keep the game's 1024 x 512 torso/ground convention. Original
downloads remain in docs; provenance and reproducible crops ship in manifest.json.
"""
from pathlib import Path
import hashlib
import json
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/assets/elsa-looks'
OUT.mkdir(parents=True, exist_ok=True)
SOURCES = ROOT / 'docs/elsa-source-candidates'
RIGHTS = 'Disney character. Public gallery source for the authorized personal, non-commercial prototype; not CC0 and not claimed to be an official film render.'

ITEMS = [
    dict(id='spring', title='春日花裙', file='spring-freeicons-curl.png', torso=222, head=[190, 0, 291, 132],
         page='https://www.freeiconspng.com/img/42239',
         image='https://www.freeiconspng.com/uploads/green-dresses-elsa-frozen-fever-render-png-31.png',
         credit='Ahkâm / FreeIconsPNG', note='Source lists Personal Use Only and requests website attribution.'),
    dict(id='garden', title='花园短裙', file='spring-wpb-original.png', torso=416, head=[350, 6, 541, 223],
         page='https://pngpix.com/png/elsa-frozen-fever-look-png-wpb-6uanpf3tyrz69n3d.html',
         image='https://pngpix.com/images/file/elsa-frozen-fever-look-png-wpb-6uanpf3tyrz69n3d.png',
         credit='PNGpix', note='CG-style gallery illustration; do not label as the original Frozen Fever film costume.'),
    dict(id='winter', title='冬日长靴', file='holiday-t1-original.png', torso=455, head=[350, 8, 542, 231],
         page='https://pngpix.com/png/elsa-holiday-celebration-png-05212024-t1mtd8cfhbrcvzp2.html',
         image='https://pngpix.com/images/file/elsa-holiday-celebration-png-05212024-t1mtd8cfhbrcvzp2.png',
         credit='PNGpix', note='CG-style winter illustration with complete boots and cape.'),
    dict(id='starlight', title='星光蓬裙', file='coronation-ovh-original.png', torso=565, head=[445, 10, 665, 292],
         page='https://pngpix.com/png/elsa-coronation-dress-png-ovh-gzb4tmgu52c9wag8.html',
         image='https://pngpix.com/images/file/elsa-coronation-dress-png-ovh-gzb4tmgu52c9wag8.png',
         credit='PNGpix', note='Page title says coronation; actual image is a turquoise party dress, so the game calls it 星光蓬裙.'),
    dict(id='spirit', title='精灵白裙', file='pngall-Elsa-PNG-Picture.png', torso=395, head=[329, 39, 492, 270],
         page='https://www.pngall.com/elsa-png/download/48385/',
         image='https://www.pngall.com/wp-content/uploads/5/Elsa-PNG-Picture.png',
         credit='PNG All', note='Transparent white gown, loose hair, complete head/hands/feet. The source already ends the cape at its left edge; normalization retains every supplied pixel.'),
    dict(id='ice-wave', title='蓝裙 · 捧雪花', file='pngall-Disney-Princess-Elsa-Transparent.png', torso=255, head=[190, 30, 327, 215],
         page='https://www.pngall.com/elsa-png/download/48261/',
         image='https://www.pngall.com/wp-content/uploads/5/Disney-Princess-Elsa-Transparent.png',
         credit='PNG All', note='Additional full-body pose in the existing blue costume.'),
    dict(id='ice-cheer', title='蓝裙 · 张臂欢呼', file='pngall-Elsa-PNG-HD-Image.png', torso=293, head=[230, 8, 349, 165],
         page='https://www.pngall.com/elsa-png/download/48326/',
         image='https://www.pngall.com/wp-content/uploads/5/Elsa-PNG-HD-Image.png',
         credit='PNG All', note='Additional full-body cheering pose; the source is scaled down rather than enlarged.'),
]


def resize_alpha(image, size):
    return image.convert('RGBa').resize(size, Image.Resampling.LANCZOS).convert('RGBA')


def portrait(image, crop, name):
    head = image.crop(crop)
    scale = min(228 / head.width, 244 / head.height)
    sized = resize_alpha(head, (round(head.width * scale), round(head.height * scale)))
    canvas = Image.new('RGBA', (256, 256))
    canvas.alpha_composite(sized, ((256 - sized.width) // 2, 256 - sized.height))
    canvas.save(OUT / (name + '-portrait.png'), optimize=True)


manifest = []
for item in ITEMS:
    source = SOURCES / item['file']
    image = Image.open(source).convert('RGBA')
    alpha = image.getchannel('A')
    box = alpha.getbbox()
    assert box and alpha.getextrema() == (0, 255), f'Missing real alpha: {source}'
    cropped = image.crop(box)
    scale = 480 / cropped.height
    sized = resize_alpha(cropped, (round(cropped.width * scale), 480))
    x = round(512 - (item['torso'] - box[0]) * scale)
    assert x > 8 and x + sized.width < 1016, f'Would clip supplied cape: {source}'
    canvas = Image.new('RGBA', (1024, 512))
    canvas.alpha_composite(sized, (x, 20))
    canvas.save(OUT / (item['id'] + '.png'), optimize=True)
    portrait(image, item['head'], item['id'])
    record = {**item, 'original': source.relative_to(ROOT).as_posix(), 'rights': RIGHTS,
              'sha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'sourceSize': list(image.size),
              'sourceAlphaBounds': list(box), 'actorSize': [1024, 512],
              'actorAlphaBounds': list(canvas.getchannel('A').getbbox()), 'groundY': 500, 'torsoX': 512}
    manifest.append(record)

# Keep the original blue sprite untouched, including the wardrobe face/hand frames.
portrait(Image.open(ROOT / 'public/assets/snow/princess-idle.png').convert('RGBA'), [453, 0, 578, 137], 'ice')

font = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 22)
small = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 15)
sheet = Image.new('RGB', (1440, 930), '#ede9f7')
draw = ImageDraw.Draw(sheet)
draw.text((30, 15), '艾莎的冒险衣橱 · 6 种场景造型', font=font, fill='#634d82')
names = [('ice', '经典冰蓝裙'), *[(item['id'], item['title']) for item in ITEMS[:5]]]
for i, (name, title) in enumerate(names):
    cx, cy = (i % 3) * 480, 55 + (i // 3) * 435
    path = ROOT / 'public/assets/snow/princess-idle.png' if name == 'ice' else OUT / (name + '.png')
    im = Image.open(path).convert('RGBA')
    im = im.crop(im.getchannel('A').getbbox())
    im.thumbnail((445, 346), Image.Resampling.LANCZOS)
    sheet.paste(im, (cx + (480 - im.width) // 2, cy + 346 - im.height), im)
    draw.text((cx + 22, cy + 366), title, font=font, fill='#634d82')
    face = Image.open(OUT / (name + '-portrait.png')).convert('RGBA').resize((65, 65), Image.Resampling.LANCZOS)
    sheet.paste(face, (cx + 388, cy + 355), face)
draw.text((30, 912), '网上素材已接入场景；原图和来源记录保留在项目中。', font=small, fill='#887799')
sheet.save(ROOT / 'docs/elsa-looks-contact.jpg', quality=94)
(OUT / 'manifest.json').write_text(json.dumps({'date': '2026-10-05', 'processing': 'Alpha crop, premultiplied resize, torso/floor alignment and head crop only.', 'assets': manifest}, ensure_ascii=False, indent=2), encoding='utf8')
print(f'Normalized {len(ITEMS)} actor frames and {len(ITEMS) + 1} portraits; QA: docs/elsa-looks-contact.jpg')
