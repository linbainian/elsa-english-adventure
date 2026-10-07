"""Inspect public image links from an already selected source page."""
from html.parser import HTMLParser
import urllib.request
from pathlib import Path
from PIL import Image, ImageDraw

class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.href = ''
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'a':
            self.href = attrs.get('href', '')
        if tag == 'img':
            title = attrs.get('alt', '')
            if any(part in title.lower() for part in ['magic creation', 'chibi elsa', 'joyful elsa', 'elsa creating', 'queen pose', 'character pose']):
                print(title, self.href, attrs.get('src', ''), sep=' | ')

url = 'https://pngpix.com/png/elsa-frozen-character-pose-e3pn3lcke6ld737j.html'
parser = Links()
parser.feed(urllib.request.urlopen(url, timeout=20).read().decode())

names = ['elsa-frozen-character-pose-v7dpq12048ljxz0j', 'elsa-frozen-character-pose-3a0ohh8g9mk4os4j', 'elsa-frozen-character-pose-twaq2tlawix5cmtn', 'elsa-frozen-character-pose-lyvkup5y1qlfrzj4', 'elsa-frozen-magic-creation-tb0em2d9k6huucio', 'elsa-creating-snowflake-frozen-7wiikgh56sj9sml4']
out = Path('public/assets/snow/originals')
sheet = Image.new('RGB', (1080, 430), '#e4eafa')
draw = ImageDraw.Draw(sheet)
for i, name in enumerate(names):
    path = out / (name + '-preview.webp')
    urllib.request.urlretrieve('https://pngpix.com/images/thumbnail/' + name + '.webp', path)
    preview = Image.open(path).convert('RGBA')
    preview.thumbnail((170, 385))
    sheet.paste(preview, (i * 180 + (180 - preview.width) // 2, 25), preview)
    draw.text((i * 180 + 8, 407), str(i + 1), fill='#392c54')
sheet.save(out / 'elsa-candidates.jpg')
