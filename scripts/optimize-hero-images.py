"""Regenerate responsive assets without altering the source photographs. Requires Pillow with AVIF/WebP."""
from pathlib import Path
from PIL import Image, ImageOps
import hashlib
import json

root = Path(__file__).resolve().parents[1]
source = root / 'website/public/images/hero'
target = source / 'optimized'
target.mkdir(exist_ok=True)
manifest = {}
for path in sorted(source.glob('*.jpg')):
    with Image.open(path) as original:
        image = ImageOps.exif_transpose(original).convert('RGB')
        variants = {'width': image.width, 'height': image.height}
        for fmt, quality in [('webp', 78), ('avif', 60)]:
            entries = []
            for width in sorted(set(min(w, image.width) for w in (640, 960, 1440, 1920))):
                resized = image.resize((width, round(image.height * width / image.width)), Image.Resampling.LANCZOS)
                from io import BytesIO
                buffer = BytesIO()
                resized.save(buffer, format=fmt.upper(), quality=quality)
                data = buffer.getvalue()
                digest = hashlib.sha256(data).hexdigest()[:12]
                name = f'{path.stem}-{width}-{digest}.{fmt}'
                (target / name).write_bytes(data)
                entries.append({'src': f'/images/hero/optimized/{name}', 'width': width, 'bytes': len(data)})
            variants[fmt] = entries
        manifest[f'/images/hero/{path.name}'] = variants
        print(path.name, path.stat().st_size, '->', variants['avif'][-1]['bytes'], flush=True)
(root / 'website/src/hero-images.json').write_text(json.dumps(manifest, indent=2) + '\n')
