from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/previews'
font = ImageFont.truetype(r'C:\Windows\Fonts\msyh.ttc', 24)
for filename, scenes in [
    ('community-worlds', [('community-street', '晨光巴士街 · 水花风车'), ('community-clinic', '泡泡玩偶诊所 · 给小熊盖毯子'), ('community-plaza', '星光感谢广场 · 六位伙伴挥手')]),
    ('welcome-worlds', [('welcome-glade', '认识雪宝 · 谢谢小礼物'), ('welcome-palace', '拜访城堡 · 礼貌打开门'), ('welcome-party', '欢迎派对 · 和朋友合影')]),
]:
    board = Image.new('RGB', (1800, 400), '#fff7ee'); draw = ImageDraw.Draw(board)
    for i, (name, label) in enumerate(scenes):
        im = Image.open(OUT / (name + '.png')).convert('RGB'); im.thumbnail((586, 330), Image.Resampling.LANCZOS)
        board.paste(im, (i * 600 + 7, 7)); draw.text((i * 600 + 14, 350), label, font=font, fill='#65516a')
    board.save(OUT / (filename + '.jpg'), quality=93)
frames = []
for file in sorted((OUT / 'community-frames').glob('*.png')):
    im = Image.open(file).convert('RGB'); im.thumbnail((850, 480), Image.Resampling.LANCZOS); frames.append(im)
if frames: frames[0].save(OUT / 'community-party.gif', save_all=True, append_images=frames[1:], duration=125, loop=0, optimize=True)
print('Saved two in-game scene boards and', len(frames), 'community party frames.')

# Repack the complete asset contact sheet after adding the generated quilt.
assets = ROOT / 'public/assets/community'
contact = Image.new('RGB', (1200, 1300), '#f7f0e5'); draw = ImageDraw.Draw(contact)
for i, name in enumerate(['street', 'clinic', 'plaza']):
    im = Image.open(assets / (name + '.webp')).resize((390, 219), Image.Resampling.LANCZOS)
    contact.paste(im, (i * 400 + 5, 5)); draw.text((i * 400 + 12, 232), name, fill='#554866')
roles = ['bus-driver', 'firefighter', 'police-officer', 'doctor', 'nurse', 'dentist']
for i, name in enumerate(roles + [role + '-wave' for role in roles] + ['bus', 'tooth', 'brush', 'stethoscope', 'pinwheel', 'flower', 'blanket']):
    im = Image.open(assets / (name + '.png')).resize((178, 178), Image.Resampling.LANCZOS)
    x, y = i % 6 * 200 + 10, 270 + i // 6 * 250
    contact.paste(im, (x, y), im); draw.text((x + 8, y + 186), name, fill='#554866')
contact.save(ROOT / 'docs/community-assets-contact.jpg', quality=93)
