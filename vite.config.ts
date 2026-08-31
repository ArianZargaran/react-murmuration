import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The tuning app. The publishable library is built by vite.lib.config.ts.
export default defineConfig({
  plugins: [react()],
  build: { outDir: 'dist-app' },
})
