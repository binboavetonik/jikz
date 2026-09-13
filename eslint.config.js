// Correctness-focused lint. Formatting is deliberately NOT enforced here:
// the codebase has a consistent hand style (no semicolons, single quotes,
// 2-space indent — see .editorconfig) and a formatter would rewrite most
// files. Type-aware rules come from `tsc --strict` (noUnusedLocals etc.),
// so this config only adds what the compiler cannot see.
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist/', 'docs/.vitepress/', 'docs/api/', 'node_modules/', 'scripts/', 'etc/', 'implementation-plans/'] },
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts', 'test/**/*.ts', 'examples/**/*.ts'],
    rules: {
      // tsc already reports unused locals/params; keep one source of truth.
      '@typescript-eslint/no-unused-vars': 'off',
      // `{}` is used intentionally as "no options" in the shape registry types.
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
  {
    files: ['test/**/*.ts'],
    rules: {
      // Tests deliberately feed invalid input (`applyPreset('unknown' as any)`).
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
)
