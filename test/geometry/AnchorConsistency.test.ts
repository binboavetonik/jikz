/**
 * Cross-shape anchor consistency tests.
 *
 * Guards the screen convention documented in README / ANCHOR_ANGLES:
 *   - `north` is the VISUAL top of a shape (smaller y in y-down space)
 *   - `south` the visual bottom, `east`/`west` the visual right/left
 *   - aliases ('n', 's', 'e', 'w', 'ne', …) resolve identically to
 *     their full names
 *
 * Written after the 2026-08 anchor-convention fix: complex shapes used
 * to pass math-convention angles to boundaryPoint (90° for north),
 * which put 'north' BELOW center on star/cloud/signal/arrow/… shapes.
 */
import { describe, it, expect } from 'vitest'
import { Node, SHAPE_TYPES, type ShapeType } from '../../src/node/Node'

const EPS = 1e-6

function makeNode(shape: ShapeType): Node {
  return new Node({
    shape,
    at: { x: 100, y: 100 },
    width: 80,
    height: 60,
    text: 'X',
  })
}

describe('anchor compass consistency (all SHAPE_TYPES)', () => {
  it.each(SHAPE_TYPES)('%s: north is at or above center', (shape) => {
    const n = makeNode(shape)
    expect(n.anchor('north').y).toBeLessThanOrEqual(n.center.y + EPS)
  })

  it.each(SHAPE_TYPES)('%s: south is at or below center', (shape) => {
    const n = makeNode(shape)
    expect(n.anchor('south').y).toBeGreaterThanOrEqual(n.center.y - EPS)
  })

  it.each(SHAPE_TYPES)('%s: east is at or right of center', (shape) => {
    const n = makeNode(shape)
    expect(n.anchor('east').x).toBeGreaterThanOrEqual(n.center.x - EPS)
  })

  it.each(SHAPE_TYPES)('%s: west is at or left of center', (shape) => {
    const n = makeNode(shape)
    expect(n.anchor('west').x).toBeLessThanOrEqual(n.center.x + EPS)
  })

  it.each(SHAPE_TYPES)('%s: north is above south', (shape) => {
    const n = makeNode(shape)
    expect(n.anchor('north').y).toBeLessThanOrEqual(n.anchor('south').y + EPS)
  })

  it.each(SHAPE_TYPES)('%s: west is left of east', (shape) => {
    const n = makeNode(shape)
    expect(n.anchor('west').x).toBeLessThanOrEqual(n.anchor('east').x + EPS)
  })
})

describe('anchor alias equivalence (all SHAPE_TYPES)', () => {
  const aliases: [string, string][] = [
    ['n', 'north'],
    ['s', 'south'],
    ['e', 'east'],
    ['w', 'west'],
    ['ne', 'north east'],
    ['nw', 'north west'],
    ['se', 'south east'],
    ['sw', 'south west'],
    ['c', 'center'],
  ]

  it.each(SHAPE_TYPES)('%s: aliases match full names', (shape) => {
    const n = makeNode(shape)
    for (const [alias, full] of aliases) {
      const a = n.anchor(alias)
      const b = n.anchor(full)
      expect(a.x, `${shape}: ${alias}.x vs ${full}.x`).toBeCloseTo(b.x, 6)
      expect(a.y, `${shape}: ${alias}.y vs ${full}.y`).toBeCloseTo(b.y, 6)
    }
  })
})

describe('diagonal anchors sit between cardinals', () => {
  it.each(SHAPE_TYPES)('%s: north east is right-and-up', (shape) => {
    const n = makeNode(shape)
    const ne = n.anchor('north east')
    expect(ne.x).toBeGreaterThanOrEqual(n.center.x - EPS)
    expect(ne.y).toBeLessThanOrEqual(n.center.y + EPS)
  })

  // Ellipse callout anchors live on the body ellipse, which shifts upward
  // to make room for the south pointer — its 'south west' body point can
  // sit a hair above the node center. Legitimate callout geometry, not a
  // convention violation, so it is exempt from the strict diagonal check.
  const SW_STRICT = SHAPE_TYPES.filter((s) => s !== 'ellipse callout')

  it.each(SW_STRICT)('%s: south west is left-and-down', (shape) => {
    const n = makeNode(shape)
    const sw = n.anchor('south west')
    expect(sw.x).toBeLessThanOrEqual(n.center.x + EPS)
    expect(sw.y).toBeGreaterThanOrEqual(n.center.y - EPS)
  })

  it('ellipse callout: south west is left and near center height', () => {
    const n = makeNode('ellipse callout')
    const sw = n.anchor('south west')
    expect(sw.x).toBeLessThanOrEqual(n.center.x + EPS)
    expect(Math.abs(sw.y - n.center.y)).toBeLessThan(n.height / 2)
  })
})

describe('regression: star north/south (2026-08 inversion bug)', () => {
  it('star north is the top tip, south is the bottom valley', () => {
    const n = new Node({
      shape: 'star',
      at: { x: 100, y: 100 },
      width: 40,
      height: 40,
    })
    // A 5-point star has a tip at the visual top; north must be above center.
    expect(n.anchor('north').y).toBeLessThan(n.center.y)
    expect(n.anchor('south').y).toBeGreaterThan(n.center.y)
    // Numeric anchors follow the screen convention too: 270 = north.
    const numeric = n.anchor(270)
    const named = n.anchor('north')
    expect(numeric.x).toBeCloseTo(named.x, 6)
    expect(numeric.y).toBeCloseTo(named.y, 6)
  })
})
