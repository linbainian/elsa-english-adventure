from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/previews'
board = Image.new('RGB', (1800, 400), '#fff7ee')
draw = ImageDraw.Draw(board)
font = ImageFont.truetype(r'C:\Windows\Fonts\msyh.ttc', 24)
for i, (name, label) in enumerate([
    ('wardrobe-closet', '魔法衣橱 · 花裙、鞋帽与镜子'),
    ('wardrobe-garden', '花园试衣亭 · 外套、小雨与彩虹'),
    ('wardrobe-ball', '星光舞会 · 礼服、舞鞋与庆祝'),
]):
    im = Image.open(OUT / (name + '.png')).convert('RGB')
    im.thumbnail((586, 330), Image.Resampling.LANCZOS)
    board.paste(im, (i * 600 + 7, 7)); draw.text((i * 600 + 14, 350), label, font=font, fill='#65516a')
board.save(OUT / 'wardrobe-worlds.jpg', quality=93)
frames = []
for file in sorted((OUT / 'wardrobe-frames').glob('*.png')):
    im = Image.open(file).convert('RGB'); im.thumbnail((850, 480), Image.Resampling.LANCZOS); frames.append(im)
if frames: frames[0].save(OUT / 'wardrobe-dance.gif', save_all=True, append_images=frames[1:], duration=125, loop=0, optimize=True)
print('Saved Chapter 5 three-scene board and', len(frames), 'dance frames.')
