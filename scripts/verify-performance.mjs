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
  const expected = ['/shop','/shop/','/about','/blog','/contact','/track'].includes(pathname);
  assert.equal(links.length, expected ? 1 : 0, pathname);
  if (expected) {
    assert.equal(links[0].type, 'image/avif');
    assert.equal(links[0].imageSizes, '100vw');
    for (const entry of links[0].imageSrcset.split(', ')) assert(statSync(`website/public${entry.split(' ')[0]}`).isFile());
  }
}
for(const app of ['frontend','website']){
  const manifest=JSON.parse(readFileSync(`${app}/dist/.vite/manifest.json`,'utf8'));
  const visited=new Set(),files=new Set();
  function visit(key){if(visited.has(key))return;visited.add(key);const chunk=manifest[key];assert(chunk,`Missing ${key}`);files.add(chunk.file);for(const imported of chunk.imports||[])visit(imported);}
  for(const [key,chunk] of Object.entries(manifest))if(chunk.isEntry)visit(key);
  const initialJsBytes=[...files].filter(file=>file.endsWith('.js')).reduce((total,file)=>total+statSync(`${app}/dist/${file}`).size,0);
  assert(initialJsBytes<500000,`${app} initial JS exceeds 500 KB budget`);
  console.log(`${app}: current build initial JS ${initialJsBytes} bytes (static imports included; not browser timing)`);
}
console.log('Responsive assets, route preloads, and initial JS budgets passed.');
