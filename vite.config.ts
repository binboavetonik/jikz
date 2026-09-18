import { defineConfig } from 'vite'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'
import { jikzAliases } from './scripts/aliases'

export default defineConfig({
  // Lets examples/ import from 'jikz' and resolve to the live source —
  // the demo page tracks the working tree during development. Unused
  // inside src/ itself, so the library build is unaffected.
  resolve: {
    alias: jikzAliases(__dirname),
  },
  plugins: [
    dts({
      include: ['src'],
      // NOTE: rollupTypes stays OFF. Per-file declarations mirror the
      // per-module ES build below, so a consumer's bundler and editor see
      // the same module graph, and scripts/postbuild-dts.mjs relies on
      // that layout.
      // scripts/postbuild-dts.mjs then adds .js extensions to the
      // relative specifiers (Node16 resolution) and writes .d.cts twins
      // for the require condition; `npm run check:pkg` verifies both.
      rollupTypes: false,
    }),
  ],
  build: {
    // Ship JS sourcemaps next to each module so consumers get readable
    // stack traces (the .d.ts.map files only cover types). Maps carry
    // mappings only — the sources they point at are the shipped `src/`
    // tree (see "files" in package.json), not a second embedded copy.
    sourcemap: true,
    lib: {
      // Every subpath in package.json `exports` is an entry here. With
      // preserveModules a pure re-export barrel is folded into its
      // importers and never written, so a subpath that is not an entry
      // has no file to resolve to.
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        'ext/circuits/index': resolve(__dirname, 'src/ext/circuits/index.ts'),
        'ext/gates/index': resolve(__dirname, 'src/ext/gates/index.ts'),
        'ext/dataviz/index': resolve(__dirname, 'src/ext/dataviz/index.ts'),
        'ext/petri/index': resolve(__dirname, 'src/ext/petri/index.ts'),
        'layout/index': resolve(__dirname, 'src/layout/index.ts'),
        'render/presets': resolve(__dirname, 'src/render/presets.ts'),
      },
      formats: ['es', 'cjs'],
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
          sourcemapExcludeSources: true,
        },
        // CommonJS, one file per module, for the `require` condition of
        // the subpath exports (`@ozan.e/jikz/circuits` …). The root
        // `require` keeps resolving to the UMD file, which is built by
        // vite.config.umd.ts: Rollup's name deconfliction leaks between
        // a preserved-modules output and a single-file one in the same
        // build, so the two cannot share a config.
        {
          format: 'cjs',
          preserveModules: true,
          preserveModulesRoot: 'src',
          entryFileNames: '[name].cjs',
          exports: 'named',
          sourcemap: false,
        },
      ],
    },
  },
})
