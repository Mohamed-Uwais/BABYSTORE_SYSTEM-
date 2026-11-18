import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync,existsSync} from 'node:fs';
import config from '../vite.config.js';
const manifest=JSON.parse(readFileSync(new URL('../src/hero-images.json',import.meta.url),'utf8'));
const script=config.plugins.find(plugin=>plugin.name==='hero-preload').transformIndexHtml()[0].children;
function preload(pathname){
  const links=[];
  vm.runInNewContext(script,{location:{pathname},document:{createElement:()=>({}),head:{appendChild:link=>links.push(link)}}});
  return links;
}
test('dynamic homepage, product and article routes do not preload an unrelated hero',()=>{
  for(const route of ['/','/product/example','/blog/example','/checkout'])assert.equal(preload(route).length,0,route);
});
test('fixed route preload uses the same AVIF candidates and sizes as its HeroImage',()=>{
  for(const page of ['shop','about','blog','contact','track']){
    const [link]=preload(`/${page}`);
    const variants=manifest[`/images/hero/hero-${page}.jpg`].avif;
    assert.equal(link.imageSrcset,variants.map(item=>`${item.src} ${item.width}w`).join(', '));
    assert.equal(link.imageSizes,'100vw');assert.equal(link.type,'image/avif');assert.equal(link.as,'image');
    for(const item of variants)assert.ok(existsSync(new URL(`../public${item.src}`,import.meta.url)),item.src);
    assert.equal(preload(`/${page}/`).length,1);
  }
});
