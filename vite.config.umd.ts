import { defineConfig } from 'vite'
import { resolve } from 'path'

// The single-file UMD build for <script> tags and the root `require`
// condition. Kept apart from vite.config.ts (see the note there): it
// runs second, into the same dist/, and must not empty it.
export default defineConfig({
  build: {
    emptyOutDir: false,
    sourcemap: false,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'Jikz',
      formats: ['umd'],
      fileName: () => 'jikz.umd.cjs',
    },
  },
})
