import { defineConfig } from 'vite'
import { resolve } from 'path'

/**
 * Builds the demo page (demo/index.html + every example module) as a
 * static app, published next to the docs site at <site>/demo/.
 *
 * The library build lives in vite.config.ts; `npm run dev` still serves
 * this page from source. The docs workflow runs `npm run demo:build`
 * after `docs:build`, writing into VitePress's output directory (which
 * that build empties first), with DEMO_BASE set to the site's base plus
 * `demo/` so hashed asset URLs resolve under GitHub Pages' /jikz/.
 */
export default defineConfig({
  root: resolve(__dirname, 'demo'),
  base: process.env.DEMO_BASE ?? '/demo/',
  resolve: {
    alias: { jikz: resolve(__dirname, 'src/index.ts') },
  },
  build: {
    outDir: resolve(__dirname, 'docs/.vitepress/dist/demo'),
    emptyOutDir: true,
  },
})
