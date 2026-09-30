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
    // Claude Code keeps sibling worktrees under .claude/; their tests
    // are not this checkout's.
    exclude: ['**/node_modules/**', '**/dist/**', '.claude/**'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      reporter: ['text-summary', 'html'],
      reportsDirectory: 'coverage',
    },
  },
})
