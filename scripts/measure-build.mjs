import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

// Run both builds with --manifest first. Counts static imports, not just entry files.
const result = {};
for (const app of ['frontend', 'website']) {
  const dist = join(app, 'dist');
  const manifest = JSON.parse(readFileSync(join(dist, '.vite/manifest.json')));
  const seen = new Set();
  function visit(key) {
    if (seen.has(key)) return;
    seen.add(key);
    for (const child of manifest[key].imports || []) visit(child);
  }
  for (const [key, chunk] of Object.entries(manifest)) if (chunk.isEntry) visit(key);
  const initial = [...new Set([...seen].map(key => manifest[key].file))];
  const css = [...new Set([...seen].flatMap(key => manifest[key].css || []))];
  const bytes = files => files.reduce((sum, file) => sum + statSync(join(dist, file)).size, 0);
  const gzip = files => files.reduce((sum, file) => sum + gzipSync(readFileSync(join(dist, file))).length, 0);
  result[app] = {
    initialJsBytes: bytes(initial), initialJsGzipBytes: gzip(initial),
    initialCssBytes: bytes(css), initialCssGzipBytes: gzip(css),
    totalJsBytes: bytes(readdirSync(join(dist, 'assets')).filter(f => f.endsWith('.js')).map(f => `assets/${f}`)),
    initialFiles: initial,
  };
  result[app].routes = {};
  for (const key of Object.keys(manifest).filter(key => key.startsWith('src/pages/'))) {
    seen.clear();
    visit(key);
    const files = [...new Set([...initial, ...[...seen].map(k => manifest[k].file)])];
    result[app].routes[key] = { jsBytes: bytes(files), jsGzipBytes: gzip(files) };
  }
}
const json = JSON.stringify(result, null, 2) + '\n';
if (process.argv[2]) writeFileSync(process.argv[2], json);
console.log(json);
