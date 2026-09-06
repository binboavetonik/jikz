import { defineConfig } from 'vite'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [
    dts({
      include: ['src'],
      // NOTE: rollupTypes must stay OFF. api-extractor drops the
      // `declare module` augmentation in ext/circuits that adds circuit
      // shape names to ShapeRegistry; per-file .d.ts output preserves
      // it (dist/ext/circuits/index.d.ts augments ../../node/Node).
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
