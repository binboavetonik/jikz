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
    },
    rollupOptions: {
      output: [
        // ES build keeps one file per source module. Together with
        // `"sideEffects": false` in package.json this is what lets a
        // consumer's bundler drop everything they don't import — a
        // single-file bundle would keep every top-level statement it
        // cannot prove pure (presets, lookup tables, class statics).
        {
          format: 'es',
          preserveModules: true,
          preserveModulesRoot: 'src',
          entryFileNames: '[name].js',
        },
        // UMD stays a single file for <script> consumers and require().
        {
          format: 'umd',
          name: 'Jikz',
          entryFileNames: 'jikz.umd.cjs',
        },
      ],
    },
  },
})
