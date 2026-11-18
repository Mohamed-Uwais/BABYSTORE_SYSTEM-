import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import React from 'react';
import {renderToString} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import {HelmetProvider} from 'react-helmet-async';

test('homepage executes its real components, including WhyLittora, without undefined hooks',async()=>{
  // Component execution only: this does not simulate viewport observation or
  // claim browser/visual acceptance. Effects and network requests do not run.
  const previousWindow=globalThis.window;
  globalThis.window={location:{search:'',hostname:'127.0.0.1'},addEventListener(){},removeEventListener(){}};
  const server=await createServer({root:fileURLToPath(new URL('..',import.meta.url)),
    server:{middlewareMode:true,hmr:false,watch:null},optimizeDeps:{noDiscovery:true,include:[]}});
  try{
    const {default:Home}=await server.ssrLoadModule('/src/pages/Home.jsx');
    const html=renderToString(React.createElement(HelmetProvider,{},
      React.createElement(MemoryRouter,{},React.createElement(Home))));
    assert.match(html,/Our Story/);
    assert.match(html,/Little essentials/);
    const {DEFAULTS}=await server.ssrLoadModule('../shared/websiteContentDefaults.mjs');
    const originalMotion=DEFAULTS.appearance.motion;
    const {Reveal}=await server.ssrLoadModule('/src/components/StoreMotion.jsx');
    const normalReveal=renderToString(React.createElement(Reveal,{},'Section content'));
    assert.match(normalReveal,/opacity:0/);
    assert.match(normalReveal,/translateY\(24px\)/);
    try{
      DEFAULTS.appearance.motion='enhanced';
      const enhancedHtml=renderToString(React.createElement(HelmetProvider,{},
        React.createElement(MemoryRouter,{},React.createElement(Home))));
      assert.match(enhancedHtml,/hero-backplate/);
      assert.match(enhancedHtml,/brand-seal/);
      DEFAULTS.appearance.motion='none';
      const staticReveal=renderToString(React.createElement(Reveal,{},'Section content'));
      assert.doesNotMatch(staticReveal,/opacity:0|translateY\(24px\)/);
      const reducedHtml=renderToString(React.createElement(HelmetProvider,{},
        React.createElement(MemoryRouter,{},React.createElement(Home))));
      const story=reducedHtml.slice(reducedHtml.indexOf('id="story"'),reducedHtml.indexOf('id="testimonials"'));
      assert.match(story,/Our Story/);
      assert.doesNotMatch(story,/opacity:0|🍼|✨/,'motion-off story must be visible without floating decorations');
      assert.doesNotMatch(reducedHtml,/hero-backplate|brand-seal/);
    }finally{DEFAULTS.appearance.motion=originalMotion;}
    const {default:SEO}=await server.ssrLoadModule('/src/components/SEO.jsx');
    window.location.hostname='littora.lk';
    for(const noIndex of [false,true]){
      const context={};
      const markup=renderToString(React.createElement(HelmetProvider,{context},React.createElement(SEO,{path:'/product/example',noIndex})));
      assert.match(markup,new RegExp(noIndex?'content="noindex, nofollow"':'content="index, follow"'));
    }
  }finally{
    await server.close();
    if(previousWindow===undefined)delete globalThis.window;
    else globalThis.window=previousWindow;
  }
});
