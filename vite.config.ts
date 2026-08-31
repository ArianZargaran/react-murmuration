import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The tuning app. The publishable library is built by vite.lib.config.ts.
export default defineConfig({
  plugins: [react()],
  // Set BASE_PATH when the studio is served from a subpath, which is what a
  // GitHub Pages project site does: BASE_PATH=/react-murmuration/ npm run build
  base: process.env.BASE_PATH ?? '/',
  build: { outDir: 'dist-app' },
})
