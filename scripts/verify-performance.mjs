import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import vm from 'node:vm';

// Validate generated assets and execute the actual production preload script.
const images = JSON.parse(readFileSync('website/src/hero-images.json', 'utf8'));
for (const [original, variants] of Object.entries(images)) {
  const sourceBytes = statSync(`website/public${original}`).size;
  for (const format of ['avif', 'webp']) {
    let previous = 0;
    for (const variant of variants[format]) {
      assert(variant.width > previous && variant.width <= variants.width);
      previous = variant.width;
      assert.equal(statSync(`website/public${variant.src}`).size, variant.bytes);
      assert(variant.bytes < sourceBytes);
    }
  }
}
const html = readFileSync('website/dist/index.html', 'utf8');
const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].find(m => m[1].includes('imageSrcset'))?.[1];
assert(script, 'Missing hero preload');
for (const pathname of ['/', '/shop', '/shop/', '/about', '/blog', '/contact', '/track', '/checkout', '/product/example']) {
  const links = [];
  vm.runInNewContext(script, { location: { pathname }, document: {
    createElement: () => ({}), head: { appendChild: link => links.push(link) },
  } });
  const expected = !pathname.startsWith('/checkout') && !pathname.startsWith('/product/');
  assert.equal(links.length, expected ? 1 : 0, pathname);
  if (expected) {
    assert.equal(links[0].type, 'image/avif');
    assert.equal(links[0].imageSizes, '100vw');
    for (const entry of links[0].imageSrcset.split(', ')) assert(statSync(`website/public${entry.split(' ')[0]}`).isFile());
  }
}
const builds = JSON.parse(readFileSync('scripts/phase2-after.json', 'utf8'));
assert(builds.frontend.initialJsBytes < 500000, 'POS initial JS exceeds 500 KB budget');
assert(builds.website.initialJsBytes < 500000, 'Website initial JS exceeds 500 KB budget');
console.log('Responsive assets, route preloads, and initial JS budgets passed.');
