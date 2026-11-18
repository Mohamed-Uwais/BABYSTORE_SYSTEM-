import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Preload only fixed route heroes. The homepage hero is POS-managed and may be
// replaced, reordered or hidden, so its image cannot be predicted in static HTML.
function heroPreload() {
  return {
    name: 'hero-preload',
    transformIndexHtml() {
      const images = JSON.parse(readFileSync(new URL('./src/hero-images.json', import.meta.url), 'utf8'));
      const routes = { '/shop': 'hero-shop', '/about': 'hero-about', '/blog': 'hero-blog', '/contact': 'hero-contact', '/track': 'hero-track' };
      const sets = Object.fromEntries(Object.entries(routes).map(([route, name]) => [route,
        images[`/images/hero/${name}.jpg`].avif.map(v => `${v.src} ${v.width}w`).join(', ')]));
      return [{ tag: 'script', injectTo: 'head', children: `(()=>{const sets=${JSON.stringify(sets)};const srcset=sets[location.pathname.replace(/\\/$/,'')||'/'];if(!srcset)return;const link=document.createElement('link');link.rel='preload';link.as='image';link.type='image/avif';link.imageSrcset=srcset;link.imageSizes='100vw';link.fetchPriority='high';document.head.appendChild(link)})()` }];
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), heroPreload()],
  build: { manifest: true },
  server: {
    headers: {'X-Robots-Tag':'noindex, nofollow'},
    fs: { allow: [fileURLToPath(new URL('.', import.meta.url)), fileURLToPath(new URL('../shared', import.meta.url))] },
    host: process.env.APP_ENV === 'staging' ? '127.0.0.1' : undefined,
    strictPort: process.env.APP_ENV === 'staging',
    ...(process.env.APP_ENV === 'staging' ? { port: 15174 } : {}),
    ...(process.env.APP_ENV === 'staging' ? {} : { port: 5174 }),
    proxy: {
      '/api': {
        target: process.env.APP_ENV === 'staging' ? 'http://127.0.0.1:15001' : 'http://localhost:5001',
        changeOrigin: true,
      },
      '/uploads': {
        target: process.env.APP_ENV === 'staging' ? 'http://127.0.0.1:15001' : 'http://localhost:5001',
        changeOrigin: true,
      },
    },
  },
})
