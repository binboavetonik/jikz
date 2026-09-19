/** `tikz(pic)` — the product. */
import { describe, it, expect } from 'vitest'
import { picture, allShapes, cm, point, JikzError, type Picture } from 'jikz'
import { tikz, tikzPicture } from '../src/index'

function fresh(): Picture<typeof allShapes> {
  return picture({ shapes: allShapes, frame: 'math', unit: cm(1) })
}

describe('tikz(pic)', () => {
  it('puts statements into the picture, in the picture\'s frame', () => {
    const pic = fresh()
    const t = tikz(pic)
    t`\draw (0,0) -- (1,1);`
    const svg = pic.toSVG({ width: 100, height: 100 })
    const hand = fresh().pen().moveTo(0, 0).lineTo(1, 1)
    void hand
    const ref = fresh()
    ref.pen().moveTo(0, 0).lineTo(1, 1)
    expect(svg).toBe(ref.toSVG({ width: 100, height: 100 }))
  })

  it('declares names the picture can use, and uses the picture\'s names', () => {
    const pic = fresh()
    pic.node('a', { at: point(0, 0), text: 'a' })
    const t = tikz(pic)
    t`\node[draw] (b) at (2,0) {b};`
    t`\draw[->] (a) -- (b);`
    expect(() => pic.resolve('b')).not.toThrow()
    expect(pic.toSVG({ width: 100, height: 100 })).toContain('marker')
  })

  it('splices ${} as numbers, points and raw text', () => {
    const pic = fresh()
    const t = tikz(pic)
    const p = point(1, 2)
    const w = 3
    t`\draw (0,0) -- ${p} -- (${w},0) ${'-- cycle'};`
    const ref = fresh()
    ref.pen().moveTo(0, 0).lineTo(1, 2).lineTo(3, 0).close()
    expect(pic.toSVG({ width: 100, height: 100 })).toBe(ref.toSVG({ width: 100, height: 100 }))
  })

  it('throws on a construct it cannot lower, naming line and column', () => {
    const t = tikz(fresh())
    let error: unknown
    try {
      t`\draw (0,0) -- (1,1);
  \pic at (0,0) {angle};`
    } catch (e) {
      error = e
    }
    expect(error).toBeInstanceOf(JikzError)
    expect((error as JikzError).code).toBe('unsupported')
    expect((error as JikzError).message).toContain('line 2:3')
    expect((error as JikzError).message).toContain('\\pic')
  })

  it('throws on an unknown key rather than dropping it', () => {
    const t = tikz(fresh())
    expect(() => t`\draw[decorate] (0,0) -- (1,1);`).toThrow(/unknown path key "decorate"/)
  })

  it('reports a syntax error with its position', () => {
    const t = tikz(fresh())
    expect(() => t`\draw (0,0) -- (1,1)`).toThrow(/line 1:\d+: missing ";"/)
  })

  it('works inside a scope', () => {
    const pic = fresh()
    pic.scope({ scale: 2 }, (s) => {
      tikz(s)`\draw (0,0) -- (1,0);`
    })
    const ref = fresh()
    ref.scope({ scale: 2 }, (s) => {
      s.pen().moveTo(0, 0).lineTo(1, 0)
    })
    expect(pic.toSVG({ width: 100, height: 100 })).toBe(ref.toSVG({ width: 100, height: 100 }))
  })

  it('names anonymous nodes uniquely across calls on one picture', () => {
    const pic = fresh()
    const t = tikz(pic)
    t`\node at (0,0) {a};`
    t`\node at (1,0) {b};`
    expect(() => pic.resolve('tikz-1')).not.toThrow()
    expect(() => pic.resolve('tikz-2')).not.toThrow()
  })

  it('takes a plain string too', () => {
    const pic = fresh()
    tikz(pic).source('\\draw (0,0) -- (1,1);')
    expect(pic.toSVG({ width: 100, height: 100 })).toContain('<path')
  })
})

describe('tikz(pic) results and tikzPicture (M4)', () => {
  it('returns the names a call registered, in order', () => {
    const pic = fresh()
    const t = tikz(pic)
    const { names } = t`\node (a) at (0,0) {a}; \draw (1,0) coordinate (c) -- (2,0) node (n) {n}; \node at (3,0) {anon};`
    expect(names).toEqual(['a', 'c', 'n', 'tikz-1'])
    for (const n of names) expect(() => pic.resolve(n)).not.toThrow()
  })

  it('tikzPicture builds a whole picture from an environment, options included', () => {
    const pic = tikzPicture`\begin{tikzpicture}[>=stealth, every node/.style={draw}]
  \node (a) at (0,0) {a};
  \node (b) at (2,0) {b};
  \draw[->] (a) -- (b);
\end{tikzpicture}`
    const svg = pic.toSVG({ width: 200, height: 200 })
    expect(svg).toContain('marker')
    expect(pic.resolve('b').x).toBeCloseTo(2 * cm(1))
  })

  it('tikzPicture takes a bare body and a unit', () => {
    const pic = tikzPicture.source(String.raw`\coordinate (p) at (1,1);`, { unit: 10 })
    expect(pic.resolve('p')).toEqual(point(10, -10))
  })

  it('tikzPicture refuses what the pre-check refuses', () => {
    expect(() => tikzPicture.source(String.raw`\begin{axis} \addplot {x}; \end{axis}`)).toThrow(JikzError)
  })

  it('a \\clip applies to the rest of the call', () => {
    const pic = fresh()
    tikz(pic)`\clip (0,0) rectangle (1,1); \draw (-1,-1) -- (2,2);`
    expect(pic.toSVG({ width: 200, height: 200 })).toContain('clip-path')
  })
})
