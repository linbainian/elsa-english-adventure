"""Arrange captured game frames for review. Does not modify source game art."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/previews'
names = ['body-workshop', 'body-music', 'body-stage', 'family-living', 'family-garden', 'family-studio']
titles = ['水晶洗漱室 · 躲猫猫与泡泡', '泡泡音乐房 · 拍手与脚印', '云朵舞台 · 一起跳身体舞',
          '温暖客厅 · 拥抱与礼物', '蘑菇花园 · 故事与野餐', '星光照相馆 · 留下全家福']
font = ImageFont.truetype(r'C:\Windows\Fonts\msyh.ttc', 22)
sheet = Image.new('RGB', (1800, 780), '#fff8fa')
draw = ImageDraw.Draw(sheet)
for index, name in enumerate(names):
    image = Image.open(OUT / (name + '.png')).convert('RGB').resize((586, 330), Image.Resampling.LANCZOS)
    x, y = index % 3 * 600 + 7, index // 3 * 390 + 8
    sheet.paste(image, (x, y))
    draw.text((x + 8, y + 342), titles[index], font=font, fill='#715482')
sheet.save(OUT / 'theme-worlds.jpg', quality=94)
frames = []
for filename in sorted((OUT / 'family-frames').glob('*.png')):
    image = Image.open(filename).convert('RGB')
    image.thumbnail((760, 430), Image.Resampling.LANCZOS)
    frames.append(image.quantize(colors=192))
if frames:
    frames[0].save(OUT / 'family-magic.gif', save_all=True, append_images=frames[1:], loop=0, duration=120, optimize=True, disposal=2)
print('Saved six scene review board and', len(frames), 'animation frames.')
