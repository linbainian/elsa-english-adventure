"""Encode actual browser screenshots as review GIFs; no game-art generation or editing."""
from pathlib import Path
from PIL import Image
root = Path(__file__).resolve().parents[1] / 'docs/previews'
for name in ['collect', 'cast']:
    frames = []
    for path in sorted((root / 'frames').glob(name + '-*.png')):
        image = Image.open(path).convert('RGB')
        image.resize((760, round(image.height * 760 / image.width)), Image.Resampling.LANCZOS)
        image.thumbnail((760, 430), Image.Resampling.LANCZOS)
        frames.append(image.quantize(colors=192, method=Image.Quantize.MEDIANCUT))
    if not frames:
        raise RuntimeError('Missing recorded browser frames for ' + name)
    frames[0].save(root / ('snow-' + name + '.gif'), save_all=True, append_images=frames[1:], duration=115, loop=0, optimize=False)
    print(name, len(frames), 'frames')
