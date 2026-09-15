/**
 * The oracle: interpreting the IR and *running the emitted TypeScript*
 * must produce byte-identical SVG.
 *
 * This is why the IR has two back ends rather than one (plan §2, §7).
 * The printer is the shipped product and the interpreter is the thing
 * that proves it, so any drift between what the converter means and
 * what it writes shows up here, on the commit that causes it, rather
 * than in someone's diagram months later.
 */
import { describe, it, expect } from 'vitest'
import { picture, point, allShapes, type Picture } from 'jikz'
import { convert, interpret } from '../src/index'

/**
 * Run emitted code without a bundler: strip the import line and the
 * `export` keyword, then call `build()` with the bindings injected.
 * The emitted module is a real module; this is only how a test runs
 * one in-process.
 */
function runEmitted(code: string): Picture<typeof allShapes> {
  const body = code.replace(/^import .*$/m, '').replace('export function build', 'function build')
  const factory = new Function('picture', 'point', 'allShapes', `${body}\nreturn build()`)
  return factory(picture, point, allShapes) as Picture<typeof allShapes>
}

const CASES: readonly { readonly name: string; readonly tex: string }[] = [
  { name: 'the M1 slice', tex: String.raw`\draw (0,0) -- (1,1);` },
  { name: 'a multi-segment path', tex: String.raw`\draw (0,0) -- (2,0) -- (2,1) -- (0,1);` },
  { name: 'negative and fractional coordinates', tex: String.raw`\draw (-1.5,0.25) -- (3,-2.75);` },
  {
    name: 'a tikzpicture body with comments',
    tex: String.raw`\begin{tikzpicture}
  % a comment, and a blank line follow

  \draw (0,0) -- (1,0);
  \draw (1,0) -- (1,1);
\end{tikzpicture}`,
  },
  {
    name: 'a file mixing convertible and unsupported statements',
    tex: String.raw`\draw (0,0) -- (1,1);
\node at (2,2) {x};
\draw (1,1) -- (2,0);`,
  },
]

describe('oracle: interpreter and emitted code agree', () => {
  for (const { name, tex } of CASES) {
    it(name, () => {
      const result = convert(tex)
      expect(result.refused, 'should not be refused').toBeUndefined()
      expect(result.ir).toBeDefined()

      const view = { width: 200, height: 200 }
      const fromIr = interpret(result.ir!).toSVG(view)
      const fromCode = runEmitted(result.code!).toSVG(view)

      expect(fromCode).toBe(fromIr)
    })
  }

  it('emits code that still compiles when statements are skipped', () => {
    const result = convert(String.raw`\node at (0,0) {x};`)
    expect(result.code).toContain('TODO(jikz-tikz)')
    // No statements converted, but the module is still valid and runs.
    expect(runEmitted(result.code!).toSVG({ width: 10, height: 10 })).toContain('<svg')
  })
})

describe('the coordinate port', () => {
  it('negates y so a ported figure is not upside-down', () => {
    // TikZ (0,1) is ABOVE (0,0); in screen space that is a smaller y.
    const { ir } = convert(String.raw`\draw (0,0) -- (0,1);`)
    const segments = ir![0]!.kind === 'pen' ? ir![0]!.segments : []
    expect(segments[0]!.y).toBe(0)
    expect(segments[1]!.y).toBeLessThan(0)
  })

  it('scales by the unit, and takes an override', () => {
    const at = (tex: string, unit?: number) => {
      const { ir } = convert(tex, unit === undefined ? {} : { unit })
      return ir![0]!.kind === 'pen' ? ir![0]!.segments[1]! : undefined
    }
    expect(at(String.raw`\draw (0,0) -- (1,0);`)!.x).toBeCloseTo(37.8, 6)
    expect(at(String.raw`\draw (0,0) -- (1,0);`, 10)!.x).toBe(10)
  })

  it('never emits -0', () => {
    const { code } = convert(String.raw`\draw (0,0) -- (1,0);`)
    expect(code).not.toContain('-0)')
    expect(code).not.toContain('-0,')
  })
})
