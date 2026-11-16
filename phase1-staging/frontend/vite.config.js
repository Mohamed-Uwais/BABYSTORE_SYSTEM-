import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: { manifest: true },
  server: {
    host: process.env.APP_ENV === 'staging' ? '127.0.0.1' : undefined,
    strictPort: process.env.APP_ENV === 'staging',
    ...(process.env.APP_ENV === 'staging' ? { port: 15173 } : {}),
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
