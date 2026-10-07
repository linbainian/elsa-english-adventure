"""Fetch the two selected public full-body poses, recording their source pages."""
from html.parser import HTMLParser
from pathlib import Path
import json
import urllib.request

class MainImage(HTMLParser):
    def __init__(self):
        super().__init__()
        self.url = None
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        src = attrs.get('src', '')
        if tag == 'img' and '/images/hd/' in src and self.url is None:
            self.url = 'https://pngpix.com' + src if src.startswith('/') else src

out = Path('public/assets/snow/originals')
records = []
for pose, slug in [('cheer', 'elsa-frozen-character-pose-v7dpq12048ljxz0j'), ('cast', 'elsa-creating-snowflake-frozen-7wiikgh56sj9sml4')]:
    page = 'https://pngpix.com/png/' + slug + '.html'
    parser = MainImage()
    parser.feed(urllib.request.urlopen(page, timeout=20).read().decode())
    if not parser.url:
        raise RuntimeError('No main image found on ' + page)
    path = out / ('elsa-' + pose + '.webp')
    urllib.request.urlretrieve(parser.url, path)
    records.append({'pose': pose, 'page': page, 'image': parser.url, 'original': str(path), 'rights': 'Disney character/render; public source download for the user-authorized personal prototype. Not represented as CC0.'})
(out / 'elsa-sources.json').write_text(json.dumps(records, indent=2), encoding='utf8')
print(json.dumps(records, indent=2))
