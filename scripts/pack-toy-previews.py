"""Build a scene review board and a short actual-game animation preview."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/previews'
board = Image.new('RGB', (1800, 400), '#fff7ee')
draw = ImageDraw.Draw(board)
font = ImageFont.truetype(r'C:\Windows\Fonts\msyh.ttc', 24)
for i, (name, label) in enumerate([
    ('toys-room', '惊喜玩具屋 · 唤醒、抱抱与传球'),
    ('toys-station', '齿轮火车站 · 搭桥、开车与载客'),
    ('toys-parade', '彩虹游行街 · 彩带、彩纸与游行'),
]):
    im = Image.open(OUT / (name + '.png')).convert('RGB')
    im.thumbnail((586, 330), Image.Resampling.LANCZOS)
    board.paste(im, (i * 600 + 7, 7))
    draw.text((i * 600 + 14, 350), label, font=font, fill='#65516a')
board.save(OUT / 'toy-worlds.jpg', quality=93)
frames = []
for file in sorted((OUT / 'toy-frames').glob('*.png')):
    im = Image.open(file).convert('RGB')
    im.thumbnail((850, 480), Image.Resampling.LANCZOS)
    frames.append(im)
if frames:
    frames[0].save(OUT / 'toy-parade.gif', save_all=True, append_images=frames[1:], duration=125, loop=0, optimize=True)
print('Saved Chapter 4 three-scene board and', len(frames), 'animation frames.')
