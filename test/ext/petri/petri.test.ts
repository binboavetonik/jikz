/**
 * Petri nets — pinned against `tikzlibrarypetri.code.tex`: its place,
 * transition and token sizes, its pre/post arc styles, and the
 * hard-coded token arrangements `\tikz@def@grow@tokens` lays out for
 * one through nine.
 */
import { describe, it, expect } from 'vitest'
import {
  petriShapes,
  petri,
  petriArcs,
  tokens,
  tokenPositions,
  PLACE_MIN_SIZE,
  TRANSITION_MIN_SIZE,
  TOKEN_SIZE,
  TOKEN_DISTANCE_DEFAULT,
  TOKEN_COLOR_DEFAULT,
  PETRI_INNER_SEP,
  MAX_LAID_OUT_TOKENS,
} from '../../../src/ext/petri'
import { picture } from '../../../src/picture/Picture'
import { point } from '../../../src/core/Point'
import { circle } from '../../../src/geometry/Circle'

const EX = 4.30554
const MM = 72.27 / 25.4
const ORIGIN = point(0, 0)

function expectPt(p: { x: number; y: number }, x: number, y: number, label = '') {
  expect(p.x, `${label} x`).toBeCloseTo(x, 6)
  expect(p.y, `${label} y`).toBeCloseTo(y, 6)
}

describe('TikZ sizes', () => {
  it('carries place 5ex, transition 4mm, token 1ex and distance 1.5ex', () => {
    expect(PLACE_MIN_SIZE).toBeCloseTo(5 * EX, 4)
    expect(TRANSITION_MIN_SIZE).toBeCloseTo(4 * MM, 4)
    expect(TOKEN_SIZE).toBeCloseTo(EX, 4)
    expect(TOKEN_DISTANCE_DEFAULT).toBeCloseTo(1.5 * EX, 4)
  })

  it('fills a token black and never strokes it', () => {
    expect(TOKEN_COLOR_DEFAULT).toBe('#000000')
    expect(tokens(ORIGIN, 1)[0]!.color).toBe('#000000')
  })

  it('sets inner sep to zero on both node styles', () => {
    expect(PETRI_INNER_SEP).toBe(0)
    expect(petri.place().innerSep).toBe(0)
    expect(petri.transition().innerSep).toBe(0)
    expect(petri.place({ innerSep: 3 }).innerSep).toBe(3)
  })
})

describe('petriShapes', () => {
  it('names each kind and lets both size to their text', () => {
    for (const [name, kind] of Object.entries(petriShapes)) {
      expect(kind.kindName).toBe(name)
      expect(kind.textAutoSize).toBe(true)
    }
  })

  it('is a circle and a rectangle underneath, as in TikZ', () => {
    const pic = picture({ shapes: petriShapes })
    pic.node('p', { at: ORIGIN, shape: 'place' })
    pic.node('t', { at: point(100, 0), shape: 'transition' })
    expect(pic.getNode('p')!.shape.type).toBe('circle')
    expect(pic.getNode('t')!.shape.type).toBe('rectangle')
  })

  it('floors a small place and transition at the library minimums', () => {
    const pic = picture({ shapes: petriShapes })
    pic.node('p', { at: ORIGIN, shape: 'place', width: 2, height: 2, minWidth: 0, minHeight: 0 })
    pic.node('t', {
      at: point(100, 0),
      shape: 'transition',
      width: 2,
      height: 2,
      minWidth: 0,
      minHeight: 0,
    })
    expect(pic.getNode('p')!.shape.width).toBeCloseTo(PLACE_MIN_SIZE, 6)
    expect(pic.getNode('t')!.shape.width).toBeCloseTo(TRANSITION_MIN_SIZE, 6)
  })

  it('sizes the same whether named or built', () => {
    const byName = picture({ shapes: petriShapes })
    byName.node('p', { at: ORIGIN, shape: 'place' })
    const byBuilder = picture({ shapes: petriShapes })
    byBuilder.node('p', petri.place({ at: ORIGIN }))
    expect(byBuilder.getNode('p')!.shape.width).toBe(byName.getNode('p')!.shape.width)
  })

  it('lets a bar-shaped transition through, as Petri nets are drawn', () => {
    const pic = picture({ shapes: petriShapes })
    pic.node('t', petri.transition({ at: ORIGIN, width: 12, height: 40 }))
    expect(pic.getNode('t')!.shape.width).toBe(12)
    expect(pic.getNode('t')!.shape.height).toBe(40)
  })

  it('needs the builder for that, since jikz floors a node at 20', () => {
    // jikz's default minimum outranks TikZ's 4mm, so the string route
    // widens a thin bar unless minWidth is lowered by hand.
    const named = picture({ shapes: petriShapes })
    named.node('t', { at: ORIGIN, shape: 'transition', width: 12, height: 40 })
    expect(named.getNode('t')!.shape.width).toBe(20)

    const lowered = picture({ shapes: petriShapes })
    lowered.node('t', { at: ORIGIN, shape: 'transition', width: 12, height: 40, minWidth: 0 })
    expect(lowered.getNode('t')!.shape.width).toBe(12)
  })
})

describe('token arrangements', () => {
  it('centres a lone token', () => {
    expectPt(tokenPositions(point(50, 50), 1)[0]!, 50, 50, 'single')
  })

  it('lays two out either side, half a distance apart', () => {
    const [a, b] = tokenPositions(ORIGIN, 2, { distance: 10 })
    expectPt(a!, -5, 0, 'left')
    expectPt(b!, 5, 0, 'right')
  })

  it('stands three in a triangle, point up on a y-down canvas', () => {
    // TikZ's table is y-up: (0,.57), (-.5,-.306025), (.5,-.306025).
    const [top, left, right] = tokenPositions(ORIGIN, 3, { distance: 10 })
    expectPt(top!, 0, -5.7, 'apex')
    expectPt(left!, -5, 3.06025, 'lower left')
    expectPt(right!, 5, 3.06025, 'lower right')
    expect(top!.y).toBeLessThan(left!.y) // the apex really is the top
  })

  it('squares four up', () => {
    const p = tokenPositions(ORIGIN, 4, { distance: 10 })
    expect(p.map((q) => [q.x, q.y])).toEqual([
      [-5, -5],
      [5, -5],
      [-5, 5],
      [5, 5],
    ])
  })

  it('carries the five, six, seven, eight and nine arrangements', () => {
    for (let n = 1; n <= MAX_LAID_OUT_TOKENS; n++) {
      expect(tokenPositions(ORIGIN, n), `${n} tokens`).toHaveLength(n)
    }
    expect(MAX_LAID_OUT_TOKENS).toBe(9)
    // Five is the pentagon: one at the top, none at the centre.
    const five = tokenPositions(ORIGIN, 5, { distance: 10 })
    expectPt(five[0]!, 0, -8.5, 'pentagon apex')
    // Nine is the full three-by-three grid, so its centre is occupied.
    expect(tokenPositions(ORIGIN, 9, { distance: 10 }).some((p) => p.x === 0 && p.y === 0)).toBe(true)
  })

  it('keeps every arrangement balanced left to right', () => {
    for (let n = 1; n <= MAX_LAID_OUT_TOKENS; n++) {
      const p = tokenPositions(point(40, 40), n, { distance: 10 })
      const cx = p.reduce((s, q) => s + q.x, 0) / n
      expect(cx, `${n} tokens x`).toBeCloseTo(40, 6)
    }
  })

  it('carries TikZ\'s two vertically unbalanced arrangements as they are', () => {
    // Most of \tikz@def@grow@tokens balances about the centre, but two
    // entries do not, and they are carried over rather than quietly
    // corrected: three sits at (0,.57) and (±.5,-.306025), slightly
    // top-heavy; eight is two over three over three, clearly
    // bottom-heavy. (The table is also only written to six places, so
    // the pentagon misses balance by about 1e-5.)
    const meanY = (n: number) => {
      const p = tokenPositions(point(40, 40), n, { distance: 10 })
      return p.reduce((s, q) => s + q.y, 0) / n
    }
    for (const n of [1, 2, 4, 5, 6, 7, 9]) {
      expect(meanY(n), `${n} tokens`).toBeCloseTo(40, 3)
    }
    expect(meanY(3), 'three is top-heavy').toBeCloseTo(40 + 0.14017, 4)
    expect(meanY(8), 'eight is bottom-heavy').toBeCloseTo(40 + 1.25, 6)
  })

  it('rings anything past nine, which TikZ has no arrangement for', () => {
    const many = tokenPositions(ORIGIN, 12, { distance: 10 })
    expect(many).toHaveLength(12)
    const radii = many.map((p) => Math.hypot(p.x, p.y))
    for (const r of radii) expect(r).toBeCloseTo(radii[0]!, 6)
  })

  it('has nothing to place for zero or a negative count', () => {
    expect(tokenPositions(ORIGIN, 0)).toEqual([])
    expect(tokenPositions(ORIGIN, -3)).toEqual([])
    expect(tokens(ORIGIN, 0)).toEqual([])
  })
})

describe('tokens', () => {
  it('sizes each dot at half the token size', () => {
    expect(tokens(ORIGIN, 1)[0]!.radius).toBeCloseTo(TOKEN_SIZE / 2, 6)
    expect(tokens(ORIGIN, 1, { size: 9 })[0]!.radius).toBe(4.5)
  })

  it('takes per-token colours, TikZ\'s colored tokens', () => {
    const t = tokens(ORIGIN, 3, { colors: ['#ff0000', '#00ff00'], color: '#333333' })
    expect(t.map((x) => x.color)).toEqual(['#ff0000', '#00ff00', '#333333'])
  })

  it('takes per-token labels, TikZ\'s structured tokens', () => {
    const t = tokens(ORIGIN, 3, { labels: ['x', 'y'] })
    expect(t.map((x) => x.text)).toEqual(['x', 'y', undefined])
  })

  it('draws as ordinary fills over a place', () => {
    const at = point(60, 70)
    const pic = picture({ shapes: petriShapes })
    pic.node('p1', petri.place({ at }), { style: { stroke: '#334155', fill: '#ffffff' } })
    for (const t of tokens(at, 2)) {
      pic.fill(circle(t.center, t.radius), { style: { fill: t.color } })
    }
    const svg = pic.toSVG({ width: 140, height: 140 })
    // Two paints, as the rule requires: the place is a stroked node
    // path, the tokens are separate filled circles on top of it.
    expect(svg.match(/<circle/g)).toHaveLength(2)
    expect(svg.match(/<path/g)).toHaveLength(1)
    expect(svg).toContain('#000000')
  })
})

describe('arc styles', () => {
  it('points pre into the transition and post away from it', () => {
    expect(petriArcs.pre.arrowStart).toBe('to')
    expect(petriArcs.pre.arrowEnd).toBe('none')
    expect(petriArcs.post.arrowEnd).toBe('to')
    expect(petriArcs.preAndPost.arrowStart).toBe('to')
    expect(petriArcs.preAndPost.arrowEnd).toBe('to')
  })

  it('shortens by a point at whichever end carries a tip', () => {
    expect(petriArcs.pre.shortenStart).toBe(1)
    expect(petriArcs.post.shortenEnd).toBe(1)
    expect(petriArcs.preAndPost.shortenStart).toBe(1)
    expect(petriArcs.preAndPost.shortenEnd).toBe(1)
  })

  it('hands straight to edge()', () => {
    const pic = picture({ shapes: petriShapes })
    pic.node('p', petri.place({ at: ORIGIN }))
    pic.node('t', petri.transition({ at: point(80, 0) }))
    pic.edge('p', 't', petriArcs.post)
    expect(pic.toSVG({ width: 140, height: 60 })).toContain('marker-end')
  })
})
