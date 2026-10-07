from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/previews'
board = Image.new('RGB', (1800, 400), '#fff7ee')
draw = ImageDraw.Draw(board)
font = ImageFont.truetype(r'C:\Windows\Fonts\msyh.ttc', 24)
for i, (name, label) in enumerate([
    ('animals-shelter', '彩虹救助站 · 玩球与躲猫猫'),
    ('animals-pond', '泡泡水塘 · 飞翔、划水与游泳'),
    ('animals-camp', '月光动物营地 · 照顾与派对'),
]):
    im = Image.open(OUT / (name + '.png')).convert('RGB'); im.thumbnail((586, 330), Image.Resampling.LANCZOS)
    board.paste(im, (i * 600 + 7, 7)); draw.text((i * 600 + 14, 350), label, font=font, fill='#65516a')
board.save(OUT / 'animal-worlds.jpg', quality=93)
frames = []
for file in sorted((OUT / 'animal-frames').glob('*.png')):
    im = Image.open(file).convert('RGB'); im.thumbnail((850, 480), Image.Resampling.LANCZOS); frames.append(im)
if frames: frames[0].save(OUT / 'animal-party.gif', save_all=True, append_images=frames[1:], duration=125, loop=0, optimize=True)
print('Saved Chapter 6 three-scene board and', len(frames), 'party frames.')
