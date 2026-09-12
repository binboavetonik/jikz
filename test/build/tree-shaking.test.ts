/**
 * Tree-shaking guard.
 *
 * package.json declares `"sideEffects": false`, which promises bundlers
 * that importing any module of this package has no observable effect
 * beyond its exports — so anything a consumer doesn't import can be
 * dropped. That promise is only true because the built-in shape, arrow
 * tip and decoration registries fill their tables on FIRST USE
 * (`ensureBuiltins()` in geometry/registry, render/ArrowTip and
 * path/PathDecorations), not at import time.
 *
 * This test bundles small imports with esbuild against the live source
 * and asserts the output stays small. If someone reintroduces an
 * import-time side effect (a top-level `registerX(...)`, a module-level
 * mutation of shared state), esbuild will still tree-shake — but
 * consumers' bundlers, trusting `sideEffects: false`, may then DROP
 * that side effect and break `shape: 'star'` at runtime. The lazy
 * registry tests in test/render/LazyBuiltins.test.ts guard that half.
 */
import { describe, it, expect } from 'vitest'
import { build } from 'esbuild'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..')

async function bundle(named: string): Promise<{ bytes: number; code: string }> {
  const first = named.split(',')[0]!.trim()
  const result = await build({
    stdin: {
      contents: `import { ${named} } from './src/index.ts'\nconsole.log(${first})\n`,
      resolveDir: ROOT,
      loader: 'ts',
    },
    bundle: true,
    minify: true,
    format: 'esm',
    write: false,
    logLevel: 'silent',
  })
  const code = result.outputFiles[0]!.text
  return { bytes: Buffer.byteLength(code), code }
}

describe('package is tree-shakeable', () => {
  it('a bare geometry import does not drag in the renderer or the shape registry', async () => {
    const { bytes, code } = await bundle('point, circle, intersectLineCircle')
    // ~5 kB today; the unshaken library is ~150 kB. Generous headroom so
    // ordinary growth of the geometry package doesn't trip it.
    expect(bytes, `bundle is ${bytes} bytes`).toBeLessThan(40_000)
    expect(code).not.toContain('Unknown shape type')
    expect(code).not.toContain('foreignObject')
  })

  it('`point` alone is a few kilobytes', async () => {
    const { bytes } = await bundle('point')
    expect(bytes, `bundle is ${bytes} bytes`).toBeLessThan(8_000)
  })

  it('picture() still carries the full shape registry (string lookup needs it)', async () => {
    const { code } = await bundle('picture, point')
    expect(code).toContain('Unknown shape type')
    expect(code).toContain('circle split')
  })
})
