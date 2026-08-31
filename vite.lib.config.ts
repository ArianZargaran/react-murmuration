import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Library build. The app build lives in vite.config.ts and writes to dist-app;
// this one writes the publishable package to dist.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    lib: {
      entry: 'src/index.ts',
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'index.mjs' : 'index.cjs'),
    },
    rollupOptions: {
      // React is the consumer's, never bundled — two copies of React in one app
      // is what produces the invalid-hook-call error.
      external: ['react', 'react-dom', 'react/jsx-runtime'],
    },
  },
})
