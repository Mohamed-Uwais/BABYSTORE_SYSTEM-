"""Package portable design review files; does not deploy or access production."""
from pathlib import Path
import base64
import re

root = Path(__file__).resolve().parent
html = (root / 'index.html').read_text(encoding='utf-8')
css = '\n'.join((root / name).read_text(encoding='utf-8') for name in ['style.css', 'brand.css'])
scripts = ['facets.js', 'category-controls.js', 'app.js']
js = '\n'.join((root / name).read_text(encoding='utf-8') for name in scripts)
for asset in (root / 'assets').iterdir():
    mime = 'font/woff2' if asset.suffix == '.woff2' else 'image/webp'
    data = 'data:' + mime + ';base64,' + base64.b64encode(asset.read_bytes()).decode()
    ref = 'assets/' + asset.name
    html, css, js = html.replace(ref, data), css.replace(ref, data), js.replace(ref, data)
html = re.sub(r'<link rel="stylesheet" href="(?:style|brand)\.css">', '', html)
html = html.replace('</head>', '<style>' + css + '</style></head>')
for name in scripts:
    html = html.replace(f'<script src="{name}"></script>', '')
html = html.replace('</body>', '<script>' + js + '</script></body>')
assert 'assets/' not in html
(root / 'desktop-preview.html').write_text(html, encoding='utf-8')
(root / 'mobile-preview.html').write_text(html.replace('<main id="store">', '<main id="store" class="mobile">'), encoding='utf-8')
print('Rebuilt desktop/mobile portable previews with embedded media, fonts and category controls.')
