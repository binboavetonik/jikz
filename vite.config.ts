import { defineConfig } from 'vite'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'

export default defineConfig({
  // Lets examples/ import from 'jikz' and resolve to the live source —
  // the demo page tracks the working tree during development. Unused
  // inside src/ itself, so the library build is unaffected.
  resolve: {
    alias: { jikz: resolve(__dirname, 'src/index.ts') },
  },
  plugins: [
    dts({
      include: ['src'],
      // NOTE: rollupTypes must stay OFF. api-extractor drops the
      // `declare module` augmentation in ext/circuits that adds circuit
      // shape names to ShapeRegistry; per-file .d.ts output preserves
      // it (dist/ext/circuits/index.d.ts augments ../../node/Node).
      // scripts/postbuild-dts.mjs then adds .js extensions to the
      // relative specifiers (Node16 resolution) and writes .d.cts twins
      // for the require condition; `npm run check:pkg` verifies both.
      rollupTypes: false,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'Jikz',
      fileName: 'jikz',
    },
  },
})
