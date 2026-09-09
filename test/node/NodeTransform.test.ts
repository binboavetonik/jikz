/**
 * Node transform features: geometric rotation (`rotate`), anchor-based
 * placement (`at` + `anchor`), and typographic text anchors
 * ('base'/'mid' family).
 */
import { describe, it, expect } from 'vitest'
import { Node, rectNode } from '../../src/node/Node'
import { edge } from '../../src/node/Edge'
import { point } from '../../src/core/Point'
import { rectFromCenter } from '../../src/geometry/Rectangle'
import { Rotated } from '../../src/geometry/Rotated'
import { isTextAnchor } from '../../src/core/Anchor'
import { SVGRenderer } from '../../src/render/SVGRenderer'

function expectPt(p: { x: number; y: number }, x: number, y: number, label = '') {
  expect(p.x, `${label} x`).toBeCloseTo(x, 6)
  expect(p.y, `${label} y`).toBeCloseTo(y, 6)
}

describe('node({ rotate }) — geometric rotation', () => {
  // Unrotated: 80×40 at (100,100); bounds [60,80]–[140,120].
  // Rotated 90° cw: visual 40×80; bounds [80,60]–[120,140].
  const n = rectNode({ at: point(100, 100), width: 80, height: 40, rotate: 90 })

  it('wraps the shape in Rotated and records the angle', () => {
    expect(n.shape).toBeInstanceOf(Rotated)
    expect(n.rotate).toBe(90)
  })

  it('named anchors rotate WITH the shape (TikZ semantics)', () => {
    // Unrotated north (100,80) rotated 90° cw about (100,100) → (120,100):
    // the node's north point sits on the visual RIGHT.
    expectPt(n.anchor('north'), 120, 100, 'north')
    expectPt(n.anchor('east'), 100, 140, 'east')
    expectPt(n.anchor('south'), 80, 100, 'south')
    expectPt(n.anchor('west'), 100, 60, 'west')
  })

  it('numeric anchors are absolute screen directions', () => {
    // Absolute east (0°) of the rotated (tall) rect: (120,100).
    expectPt(n.anchor(0), 120, 100, 'anchor(0)')
    expectPt(n.anchor(90), 100, 140, 'anchor(90)')
    expectPt(n.anchor('270deg'), 100, 60, "anchor('270deg')")
  })

  it('bounds/width/height describe the rotated AABB', () => {
    expect(n.bounds).toEqual([80, 60, 120, 140])
    expect(n.width).toBeCloseTo(40, 6)
    expect(n.height).toBeCloseTo(80, 6)
  })

  it('hit-testing follows the rotated outline', () => {
    expect(n.contains(point(120, 100))).toBe(true) // on visual east edge
    expect(n.contains(point(130, 100))).toBe(false) // outside the tall rect
    expect(n.contains(point(100, 130))).toBe(true) // inside (visual south half)
  })

  it('toSVGPath returns rotated outline data', () => {
    // Unrotated path starts at top-left (60,80) → rotated 90° cw → (120,60).
    expect(n.toSVGPath()).toBe('M 120 60 L 120 140 L 80 140 L 80 60 Z')
  })

  it('edge auto-attachment hits the rotated border', () => {
    // An edge leaving toward a point due EAST must attach at the
    // visual east border (120,100), not the rotated named-anchor frame.
    // (The point end is a raw coordinate, so `to` stays (200,100).)
    const e = edge(n, point(200, 100))
    expectPt(e.from, 120, 100, 'edge start')
  })

  it('center is invariant under rotation', () => {
    expectPt(n.center, 100, 100, 'center')
  })

  it('moveTo preserves the rotation without double-wrapping', () => {
    const moved = n.moveTo(point(200, 200))
    expect(moved.rotate).toBe(90)
    expect(moved.shape).toBeInstanceOf(Rotated)
    expect((moved.shape as Rotated).base).not.toBeInstanceOf(Rotated)
    expectPt(moved.anchor('north'), 220, 200, 'moved north')
  })

  it('rotates a pre-constructed Shape instance too', () => {
    const custom = new Node({
      shape: rectFromCenter(point(100, 100), 80, 40),
      rotate: 90,
    })
    expectPt(custom.anchor('north'), 120, 100, 'north')
  })
})

describe('node({ at, anchor }) — placement by anchor (TikZ at + anchor=)', () => {
  it('places the named anchor at `at` instead of the center', () => {
    const n = rectNode({
      at: point(100, 100),
      width: 80,
      height: 40,
      anchor: 'north west',
    })
    expectPt(n.anchor('north west'), 100, 100, 'north west')
    expectPt(n.center, 140, 120, 'center')
  })

  it('places the ROTATED anchor at `at` when combined with rotate', () => {
    // rotate 90° cw: 'north' maps to the visual east edge midpoint,
    // 20px right of center. Placing it at (100,100) → center (80,100).
    const n = rectNode({
      at: point(100, 100),
      width: 80,
      height: 40,
      rotate: 90,
      anchor: 'north',
    })
    expectPt(n.anchor('north'), 100, 100, 'north')
    expectPt(n.center, 80, 100, 'center')
  })

  it('defaults to center placement when anchor is omitted', () => {
    const n = rectNode({ at: point(100, 100), width: 80, height: 40 })
    expectPt(n.center, 100, 100, 'center')
  })
})

describe("text anchors ('base'/'mid' family)", () => {
  // Deterministic metrics backend, Helvetica widths (1/1000 em):
  // 'Hello' = H722 + e556 + l222 + l222 + o556 = 2278 → 31.892 wide at
  // 14px, 17.5 high (14 × 1.25); +2×4 innerSep → 39.892 × 25.5. em = 14.
  const n = new Node({ text: 'Hello', at: point(100, 100) })

  it('isTextAnchor recognizes the family and rejects cardinals', () => {
    expect(isTextAnchor('base')).toBe(true)
    expect(isTextAnchor('mid east')).toBe(true)
    expect(isTextAnchor(' Base ')).toBe(true)
    expect(isTextAnchor('north')).toBe(false)
    expect(isTextAnchor(30)).toBe(false)
  })

  it('base sits ~0.3em below center; mid ~0.05em below center', () => {
    // baseline = cy − 8.75 + 0.925×14 = cy + 4.2; mid = baseline − 3.5.
    expectPt(n.anchor('base'), 100, 104.2, 'base')
    expectPt(n.anchor('mid'), 100, 100.7, 'mid')
  })

  it('base east/west take the border x at baseline height', () => {
    // Border x = 100 ± 39.892/2.
    expectPt(n.anchor('base east'), 119.946, 104.2, 'base east')
    expectPt(n.anchor('base west'), 80.054, 104.2, 'base west')
    expectPt(n.anchor('mid east'), 119.946, 100.7, 'mid east')
  })

  it('multi-line text: base is the LAST line baseline', () => {
    const m = new Node({ text: 'a\nb', at: point(100, 100) })
    // textH = 35, lines = 2, em = 14: baseline = cy − 17.5 + 17.5 + 12.95.
    expectPt(m.anchor('base'), 100, 112.95, 'base')
  })

  it('text anchors rotate with the node', () => {
    const r = new Node({ text: 'Hello', at: point(100, 100), rotate: 90 })
    // (100, 104.2) rotated 90° cw about (100,100) → (95.8, 100).
    const b = r.anchor('base')
    expectPt(b, 95.8, 100, 'rotated base')
  })

  it('textless nodes return the center for text anchors', () => {
    const empty = rectNode({ at: point(50, 50), width: 40, height: 20 })
    expectPt(empty.anchor('base'), 50, 50, 'base')
  })

  it('edges can target text anchors', () => {
    const e = edge(point(0, 0), n, { toAnchor: 'base' })
    expectPt(e.to, 100, 104.2, 'edge to base')
  })
})

describe('labels on rotated nodes', () => {
  // 80×40 at (100,100), rotated 90° cw → visual 40×80, borders at
  // x∈[80,120], y∈[60,140]. Label 'X' at font 12: Helvetica X = 667/1000
  // → 8.004 × 15 measured; default gap 4 → push = 4 + 8.004/2 = 8.002
  // along the push direction.
  const mk = (label: import('../../src/node/Node').NodeLabel) =>
    rectNode({
      at: point(100, 100),
      width: 80,
      height: 40,
      rotate: 90,
      labels: [label],
    })

  it("label at 'north' follows the rotation: pushed to the visual east", () => {
    const n = mk({ text: 'X' }) // default at: 'north'
    // Rotated north anchor: (120,100); push dir east; 4 + 8.004/2 = 8.002.
    expectPt(n.labelPoint(n.labels[0]!), 128.002, 100, 'label north')
  })

  it('numeric label angles rotate with the node too', () => {
    const n = mk({ text: 'X', at: 270 }) // local 270° = north → east
    expectPt(n.labelPoint(n.labels[0]!), 128.002, 100, 'label 270')
  })

  it("label at 'south' lands on the visual west", () => {
    const n = mk({ text: 'X', at: 'south' })
    // Rotated south anchor: (80,100); push dir west → 80 − 8.002.
    expectPt(n.labelPoint(n.labels[0]!), 71.998, 100, 'label south')
  })

  it("label at 'center' stays at the center (rotation-invariant)", () => {
    const n = mk({ text: 'X', at: 'center' })
    expectPt(n.labelPoint(n.labels[0]!), 100, 100, 'label center')
  })

  it('outerSep gap is measured from the outer border, rotated', () => {
    const n = rectNode({
      at: point(100, 100),
      width: 80,
      height: 40,
      rotate: 90,
      outerSep: 5,
      labels: [{ text: 'X' }],
    })
    // Local outer border north: (100,75) → rotated → (125,100); +7.3.
    expectPt(n.labelPoint(n.labels[0]!), 133.002, 100, 'label outerSep')
  })

  it('unrotated labels are unchanged', () => {
    const n = rectNode({
      at: point(100, 100),
      width: 80,
      height: 40,
      labels: [{ text: 'X' }],
    })
    // north (100,80); push up; 4 + 15/2 = 11.5.
    expectPt(n.labelPoint(n.labels[0]!), 100, 68.5, 'label north')
  })

  it('text anchors are rejected as label positions with a clear error', () => {
    const n = mk({ text: 'X', at: 'base' })
    expect(() => n.labelPoint(n.labels[0]!)).toThrowError(/text anchor/)
  })
})

describe('rotated node rendering', () => {
  it('shape path is pre-rotated; text gets a rotate transform group', () => {
    const r = new SVGRenderer()
    const n = rectNode({
      at: point(100, 100),
      width: 80,
      height: 40,
      text: 'R',
      rotate: 90,
    })
    r.renderNode(n)
    const svg = r.toSVG({ width: 200, height: 200 })

    // Rotated outline in absolute coordinates…
    expect(svg).toContain('M 120 60 L 120 140 L 80 140 L 80 60 Z')
    // …and the text wrapped in a rotation transform.
    expect(svg).toContain('transform="rotate(90 100 100)"')
  })

  it('unrotated nodes render no transform group', () => {
    const r = new SVGRenderer()
    r.renderNode(rectNode({ at: point(100, 100), width: 80, height: 40, text: 'R' }))
    expect(r.toSVG({ width: 200, height: 200 })).not.toContain('rotate(')
  })
})
