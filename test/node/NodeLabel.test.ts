/**
 * TikZ-style node labels: `label=<spec>:<text>`.
 *
 * `labelPoint()` places a label on the node's (outer-sep-expanded)
 * boundary and pushes it outward by `distance` plus half the label's
 * measured extent along the placement ray — so `distance` is a
 * border-to-border gap, never a center offset.
 */
import { describe, it, expect } from 'vitest'
import {
  Node,
  DEFAULT_LABEL_DISTANCE,
  DEFAULT_LABEL_FONT_SIZE,
  type NodeOptions,
} from '../../src/node/Node'
import { point } from '../../src/core/Point'
import { measureText } from '../../src/text/measureText'
import { allShapes } from '../../src/geometry/shapes'
const SHAPES = allShapes

describe('Node labels', () => {
  const mkNode = (extra: Partial<NodeOptions> = {}) =>
    new Node({
      at: point(100, 100),
      shape: SHAPES['circle'],
      width: 60,
      height: 60,
      text: 'A',
      ...extra,
    })

  it('defaults to north with the default distance', () => {
    const n = mkNode()
    const m = measureText('foo', { fontSize: DEFAULT_LABEL_FONT_SIZE })
    const p = n.labelPoint({ text: 'foo' })
    expect(p.x).toBeCloseTo(100)
    expect(p.y).toBeCloseTo(100 - (30 + DEFAULT_LABEL_DISTANCE + m.height / 2))
  })

  it('places east labels right of the boundary by gap + half label width', () => {
    const n = mkNode()
    const m = measureText('foo', { fontSize: DEFAULT_LABEL_FONT_SIZE })
    const p = n.labelPoint({ text: 'foo', at: 'east' })
    expect(p.x).toBeCloseTo(100 + 30 + DEFAULT_LABEL_DISTANCE + m.width / 2)
    expect(p.y).toBeCloseTo(100)
  })

  it('per-label distance overrides the node default', () => {
    const n = mkNode()
    const m = measureText('foo', { fontSize: DEFAULT_LABEL_FONT_SIZE })
    const p = n.labelPoint({ text: 'foo', distance: 10 })
    expect(p.y).toBeCloseTo(100 - (30 + 10 + m.height / 2))
  })

  it('node-wide labelDistance applies when the label omits distance', () => {
    const n = mkNode({ labelDistance: 12 })
    const m = measureText('foo', { fontSize: DEFAULT_LABEL_FONT_SIZE })
    const p = n.labelPoint({ text: 'foo' })
    expect(p.y).toBeCloseTo(100 - (30 + 12 + m.height / 2))
  })

  it('outerSep widens the boundary the gap is measured from', () => {
    const n = mkNode({ outerSep: 5 })
    const m = measureText('foo', { fontSize: DEFAULT_LABEL_FONT_SIZE })
    const p = n.labelPoint({ text: 'foo' })
    // radius 30 + outerSep 5 = 35 to the anchor, then gap + half height
    expect(p.y).toBeCloseTo(100 - (35 + DEFAULT_LABEL_DISTANCE + m.height / 2))
  })

  it('numeric angles use the screen convention: 270 ≡ north', () => {
    const n = mkNode()
    const numeric = n.labelPoint({ text: 'foo', at: 270 })
    const named = n.labelPoint({ text: 'foo', at: 'north' })
    expect(numeric.x).toBeCloseTo(named.x)
    expect(numeric.y).toBeCloseTo(named.y)
  })

  it('aliases work: ne ≡ north east', () => {
    const n = mkNode()
    const alias = n.labelPoint({ text: 'foo', at: 'ne' })
    const full = n.labelPoint({ text: 'foo', at: 'north east' })
    expect(alias.x).toBeCloseTo(full.x)
    expect(alias.y).toBeCloseTo(full.y)
  })

  it('a center label sits on the node center', () => {
    const n = mkNode()
    const p = n.labelPoint({ text: 'foo', at: 'center' })
    expect(p.x).toBeCloseTo(100)
    expect(p.y).toBeCloseTo(100)
  })

  it('label font size drives the measurement', () => {
    const n = mkNode()
    const m = measureText('foo', { fontSize: 20 })
    const p = n.labelPoint({ text: 'foo', style: { fontSize: 20 } })
    expect(p.y).toBeCloseTo(100 - (30 + DEFAULT_LABEL_DISTANCE + m.height / 2))
  })

  it('moveTo and resize preserve labels and labelDistance', () => {
    const labels = [{ text: 'foo', at: 'north' as const }]
    const n = mkNode({ labels, labelDistance: 9 })
    const moved = n.moveTo(point(0, 0))
    const resized = n.resize(100, 100)
    expect(moved.labels).toEqual(labels)
    expect(moved.labelDistance).toBe(9)
    expect(resized.labels).toEqual(labels)
    expect(resized.labelDistance).toBe(9)
  })

  it('labels survive the pre-constructed-shape path', () => {
    const base = mkNode({ labels: [{ text: 'foo' }] })
    const movedShape = base.shape.moveTo(point(200, 200))
    const n = new Node({ shape: movedShape, labels: [{ text: 'bar' }] })
    const p = n.labelPoint({ text: 'bar' })
    expect(p.y).toBeLessThan(200) // north of the new center
    expect(n.labels).toHaveLength(1)
  })

  it('zero-size anchor node: label still pushes along the placement angle', () => {
    // The invisible-anchor idiom — TikZ's `\\draw ... node[right] {x}`.
    // Anchor coincides with center, so the push must come from the
    // angle, not from a center→anchor ray.
    const n = new Node({
      at: point(230, 50),
      shape: SHAPES['rectangle'],
      width: 0,
      height: 0,
      minWidth: 0,
      minHeight: 0,
    })
    const m = measureText('foo', { fontSize: DEFAULT_LABEL_FONT_SIZE })
    const p = n.labelPoint({ text: 'foo', at: 'east' })
    expect(p.x).toBeCloseTo(230 + DEFAULT_LABEL_DISTANCE + m.width / 2)
    expect(p.y).toBeCloseTo(50)
  })
})

describe('Node label frame', () => {
  // 60×20 rect rotated 90° → visually 20 wide × 60 tall: visual top at
  // (100, 70), visual right midpoint at (110, 100).
  const rotated = () =>
    new Node({
      at: point(100, 100),
      shape: SHAPES['rectangle'],
      width: 60,
      height: 20,
      rotate: 90,
    })

  it("default 'local': labels ride the rotation (TikZ transform shape)", () => {
    const p = rotated().labelPoint({ text: 'x', at: 'north' })
    expect(p.x).toBeGreaterThan(110) // pushed past the visual right edge
    expect(p.y).toBeCloseTo(100, 6)
  })

  it("'screen': 'north' is always the visual top of the rotated shape", () => {
    const p = rotated().labelPoint({ text: 'x', at: 'north', frame: 'screen' })
    expect(p.x).toBeCloseTo(100, 6)
    expect(p.y).toBeLessThan(70) // pushed above the visual top border
  })

  it("'screen' named spec === numeric anchor at the same angle", () => {
    const n = rotated()
    const named = n.labelPoint({ text: 'x', at: 'north', frame: 'screen' })
    const numeric = n.labelPoint({ text: 'x', at: 270, frame: 'screen' })
    expect(named.x).toBeCloseTo(numeric.x, 6)
    expect(named.y).toBeCloseTo(numeric.y, 6)
  })

  it('unrotated node: both frames coincide for compass directions', () => {
    const n = new Node({
      at: point(100, 100),
      shape: SHAPES['circle'],
      width: 60,
      height: 60,
    })
    const local = n.labelPoint({ text: 'x', at: 'north', frame: 'local' })
    const screen = n.labelPoint({ text: 'x', at: 'north', frame: 'screen' })
    expect(local.x).toBeCloseTo(screen.x, 6)
    expect(local.y).toBeCloseTo(screen.y, 6)
  })
})
