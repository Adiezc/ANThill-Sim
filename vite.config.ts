import { defineConfig } from 'vite'

// base is set for GitHub Pages project-site hosting; override with BASE_PATH in CI.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: true,
  },
  worker: {
    format: 'es',
  },
})
