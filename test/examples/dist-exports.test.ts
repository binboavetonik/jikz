/**
 * Stale-dist guard.
 *
 * Examples import from 'jikz', which dev/test aliases to src/ — the
 * LIVE source. A published user gets dist/index.js instead. If dist
 * predates a public API an example uses, that example breaks for end
 * users with `SyntaxError: does not provide an export named '…'`.
 *
 * This test requires every value import used by any examples/*.ts
 * module to exist in the built bundle. Skipped when dist/ hasn't been
 * built (CI). Type-only imports (`import type`, inline `type X`) are
 * erased at compile time and correctly ignored.
 *
 * Origin: reported 2026-08-31 — circuit cards failed for users because
 * dist was built before registerCircuits existed. Rewritten 2026-09-03
 * when the inline demo strings became real modules in examples/.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..')
const EXAMPLES_DIR = join(ROOT, 'examples')
const DIST_BUNDLE = join(ROOT, 'dist/index.js')

/** Named exports of the built ES bundle (handles `x as y` aliases). */
function bundleExports(bundleSource: string): Set<string> {
  const names = new Set<string>()
  const re = /export\s*\{([\s\S]*?)\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(bundleSource)) !== null) {
    for (const part of m[1]!.split(',')) {
      const alias = part.trim().match(/\bas\s+(\w+)$/)
      const name = (alias ? alias[1] : part.trim())!
      if (name) names.add(name)
    }
  }
  return names
}

/** Built file each `jikz[/subpath]` specifier resolves to. */
const BUNDLE_OF: Record<string, string> = {
  jikz: 'dist/index.js',
  'jikz/circuits': 'dist/ext/circuits/index.js',
  'jikz/gates': 'dist/ext/gates/index.js',
  'jikz/dataviz': 'dist/ext/dataviz/index.js',
  'jikz/petri': 'dist/ext/petri/index.js',
  'jikz/layout': 'dist/layout/index.js',
  'jikz/styles': 'dist/render/presets.js',
}

/** Value (non-type) named imports from 'jikz' and its subpaths, per specifier. */
function jikzValueImports(code: string): { spec: string; name: string }[] {
  const out: { spec: string; name: string }[] = []
  const re = /import\s*\{([^}]+)\}\s*from\s*'(jikz(?:\/[a-z]+)?)'/g
  let m: RegExpExecArray | null
  while ((m = re.exec(code)) !== null) {
    for (const part of m[1]!.split(',')) {
      const name = part.trim()
      if (name && !name.startsWith('type ')) out.push({ spec: m[2]!, name })
    }
  }
  return out
}

const exampleFiles = readdirSync(EXAMPLES_DIR)
  .filter((f) => f.endsWith('.ts') && f !== 'manifest.ts')

describe('built bundle satisfies every example import', () => {
  it('finds the example modules', () => {
    expect(exampleFiles.length).toBeGreaterThanOrEqual(43)
  })

  it.skipIf(!existsSync(DIST_BUNDLE))(
    'the built entry of every jikz subpath exports every name the examples import from it',
    () => {
      const exportsOf = new Map<string, Set<string>>()
      for (const [spec, file] of Object.entries(BUNDLE_OF)) {
        exportsOf.set(spec, bundleExports(readFileSync(join(ROOT, file), 'utf8')))
      }
      const missing: string[] = []
      for (const file of exampleFiles) {
        const code = readFileSync(join(EXAMPLES_DIR, file), 'utf8')
        for (const { spec, name } of jikzValueImports(code)) {
          const exports = exportsOf.get(spec)
          if (!exports) missing.push(`${file}: unknown specifier '${spec}'`)
          else if (!exports.has(name)) missing.push(`${file}: ${name} from '${spec}'`)
        }
      }
      expect(
        missing,
        `dist/ is stale — these example imports are missing from the build. Run \`npm run build\`.\n  ${missing.join('\n  ')}`
      ).toEqual([])
    }
  )
})
