import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    // Examples import from 'jikz'; in tests that means the live source.
    alias: { jikz: resolve(__dirname, 'src/index.ts') },
  },
  test: {
    globals: true,
    environment: 'node',
  },
})
