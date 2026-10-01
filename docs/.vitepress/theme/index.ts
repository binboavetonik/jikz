// Default theme plus the Gallery component the landing page (docs/index.md)
// renders. Everything else — sidebar, nav, search, dark mode — is stock.
import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import Gallery from './Gallery.vue'
import { installMath } from './math'
import 'katex/dist/katex.min.css'
import './gallery.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('Gallery', Gallery)
    // Before any example renders: `$...$` labels need a renderer
    // injected, and the gallery's pictures are not ours to build.
    installMath()
  },
} satisfies Theme
