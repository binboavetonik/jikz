// Default theme plus the Gallery component the landing page (docs/index.md)
// renders. Everything else — sidebar, nav, search, dark mode — is stock.
import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import Gallery from './Gallery.vue'
import './gallery.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('Gallery', Gallery)
  },
} satisfies Theme
