import { defineConfig } from 'vitest/config'
import { jikzAliases } from './scripts/aliases'

export default defineConfig({
  resolve: {
    // Examples import from 'jikz' and its subpaths; in tests that means
    // the live source.
    alias: jikzAliases(__dirname),
  },
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      reporter: ['text-summary', 'html'],
      reportsDirectory: 'coverage',
    },
  },
})
