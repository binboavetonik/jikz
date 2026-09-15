/**
 * Refusals are behaviour, so they are tested like behaviour (plan §7).
 *
 * Each case is a construct M0 actually found in the wild, and the
 * assertion is that the refusal names the reason — a file that is
 * turned away must say why, or the user has no next step.
 */
import { describe, it, expect } from 'vitest'
import { convert, precheck } from '../src/index'

describe('the hopeless-file pre-check', () => {
  const cases: readonly { readonly name: string; readonly tex: string; readonly marker: string }[] = [
    { name: 'tikz-3dplot', marker: 'tikz-3dplot', tex: String.raw`\tdplotsetmaincoords{60}{110}` },
    { name: '3D coordinate systems', marker: '3D coordinate system', tex: String.raw`\filldraw (xyz spherical cs: radius=1, angle=30);` },
    { name: 'pgfplots', marker: 'pgfplots', tex: String.raw`\begin{axis}[axis lines=center]` },
    { name: 'circuitikz', marker: 'circuitikz', tex: String.raw`\begin{circuitikz}[american voltages]` },
    { name: 'page-relative overlays', marker: 'remember picture / overlay', tex: String.raw`\tikz[remember picture] \node (a) {};` },
  ]

  for (const { name, tex, marker } of cases) {
    it(`refuses ${name} by name`, () => {
      const refusal = precheck(tex)
      expect(refusal?.marker).toBe(marker)
      expect(refusal?.reason.length ?? 0).toBeGreaterThan(20)
      expect(refusal?.line).toBe(1)
    })
  }

  it('overrides decision 2 — a refused file emits nothing at all', () => {
    // The point of the whole pre-check: half a 3D scene rendered
    // confidently in 2D is worse than no output.
    const result = convert(String.raw`
      \tdplotsetmaincoords{60}{110}
      \draw (0,0) -- (1,1);
    `)
    expect(result.refused).toBeDefined()
    expect(result.code).toBeUndefined()
    expect(result.ir).toBeUndefined()
  })

  it('lets an ordinary 2D file through', () => {
    expect(precheck(String.raw`\draw (0,0) -- (1,1);`)).toBeUndefined()
  })

  it('does not trip on a marker that is commented out', () => {
    expect(precheck(String.raw`% \begin{axis} was here
\draw (0,0) -- (1,1);`)).toBeUndefined()
  })

  it('reports the line the marker is on', () => {
    expect(precheck('\\draw (0,0) -- (1,1);\n\\addplot {x};')?.line).toBe(2)
  })
})

describe('decision 2: unsupported statements', () => {
  it('keeps the source and names the reason, per statement', () => {
    const { code, diagnostics } = convert(String.raw`\draw (0,0) -- (1,1);
\node at (2,2) {label};`)
    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0]!.reason).toContain('only \\draw is supported')
    expect(diagnostics[0]!.line).toBe(2)
    // The original survives in the output, where the gap happened.
    expect(code).toContain('// TODO(jikz-tikz)')
    expect(code).toContain('\\node')
  })

  it('carries every statement into the output as a comment', () => {
    const { code } = convert(String.raw`\draw (0,0) -- (1,1);`)
    expect(code).toContain('// \\draw ( 0 , 0 ) -- ( 1 , 1 ) ;')
  })
})
