import fs from 'node:fs/promises';
import path from 'node:path';

// Read public, observed source pages and preserve untouched downloads for visual selection.
const out = path.resolve('docs/art-source/elsa-candidates');
await fs.mkdir(out, { recursive: true });
const candidates = [
  ['travel-83', 'https://pngpix.com/png/frozen-2-elsa-adventure-png-83-790nirxx2n2uhzn9.html'],
  ['travel-ayn', 'https://pngpix.com/png/frozen-2-elsa-adventure-png-ayn13-dfqh4i6mkhsfnwcs.html'],
  ['travel-mro', 'https://pngpix.com/png/frozen-2-elsa-adventure-png-mro3-s60kilc14p0sscwc.html'],
  ['white-gown', 'https://pngpix.com/png/elsain-white-gown-frozen-1wl23s6fzbuvn78u.html'],
  ['elegant', 'https://pngpix.com/png/elegant-animated-princess-elsa-xynk03m1ogkaqgr8.html'],
];
const records = [];
for (const [name, page] of candidates) {
  try {
    const response = await fetch(page, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error('Page HTTP ' + response.status);
    const html = await response.text();
    await fs.writeFile(path.join(out, name + '.html'), html);
    const tags = [...html.matchAll(/<img\b[^>]*>/gi)].map(match => match[0]);
    const tag = tags.find(tag => tag.includes('/images/hd/'));
    const src = tag?.match(/\bsrc="([^"]+)"/i)?.[1];
    if (!src) throw new Error('No full-resolution image on source page');
    const image = new URL(src.replaceAll('&amp;', '&'), page).href;
    const file = name + path.extname(new URL(image).pathname);
    const media = await fetch(image, { signal: AbortSignal.timeout(30_000) });
    if (!media.ok || !media.headers.get('content-type')?.startsWith('image/')) throw new Error('Image HTTP ' + media.status);
    const data = Buffer.from(await media.arrayBuffer());
    await fs.writeFile(path.join(out, file), data);
    const record = { name, page, image, file, bytes: data.length, role: 'Candidate, not yet shipped',
      rights: 'Disney character; source site footer states personal use only. User-authorized personal game. Not treated as CC0.' };
    records.push(record);
    console.log(name + ': downloaded ' + data.length + ' bytes');
  } catch (error) {
    records.push({ name, page, error: error.message });
    console.log(name + ': ' + error.message);
  }
}
await fs.writeFile(path.join(out, 'source-records.json'), JSON.stringify(records, null, 2) + '\n');
