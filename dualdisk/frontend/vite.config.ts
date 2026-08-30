import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Only the production build needs the /static/ prefix, to match FastAPI's
  // static file mount. The dev server serves pages at the root so that
  // client-side routes (e.g. /pair) resolve without a router basename.
  base: command === 'build' ? '/static/' : '/',
  build: {
    outDir: '../src/dualdisk/static',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8000',
    },
  },
}))
