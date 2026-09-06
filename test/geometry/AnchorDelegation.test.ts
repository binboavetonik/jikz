/**
 * Shape ↔ helper delegation tests.
 *
 * The primitive shapes delegate anchor resolution to the shared
 * `anchorOn*` calculators in core/Anchor — the single source of truth.
 * These tests pin that relationship so the per-shape inline
 * reimplementations that used to drift (corner fast-paths, alias
 * handling, degenerate guards) cannot silently re-grow.
 *
 * Diamond is the exception that proves the rule: it inherits Polygon's
 * generic ray–edge intersection rather than delegating, so comparing it
 * against `anchorOnDiamond` cross-validates two INDEPENDENT
 * implementations of the same math (closed-form L1 scaling vs.
 * ray–polygon intersection).
 */
import { describe, it, expect } from 'vitest'
import {
  anchorOnRect,
  anchorOnCircle,
  anchorOnEllipse,
  anchorOnDiamond,
  type AnchorSpec,
} from '../../src/core/Anchor'
import { rectFromCenter } from '../../src/geometry/Rectangle'
import { circle } from '../../src/geometry/Circle'
import { Ellipse } from '../../src/geometry/Ellipse'
import { diamond } from '../../src/geometry/Diamond'
import type { Point } from '../../src/core/Point'

/**
 * Spec matrix: named cardinals, all alias forms, numeric angles
 * (including negative and >360), and string numerics.
 */
const SPECS: AnchorSpec[] = [
  'center',
  'c',
  'north',
  'south',
  'east',
  'west',
  'north east',
  'ne',
  'northeast',
  'north west',
  'nw',
  'northwest',
  'south east',
  'se',
  'southeast',
  'south west',
  'sw',
  'southwest',
  'n',
  's',
  'e',
  'w',
  0,
  30,
  45,
  90,
  135,
  180,
  225,
  270,
  315,
  -45,
  720,
  '30deg',
  '270',
]

function expectSamePoint(a: Point, b: Point, label: string) {
  expect(a.x, `${label}: x`).toBeCloseTo(b.x, 8)
  expect(a.y, `${label}: y`).toBeCloseTo(b.y, 8)
}

describe('Rectangle.anchor delegates to anchorOnRect', () => {
  const center = { x: 100, y: 60 }
  // Non-square on purpose: corner-vs-ray distinction only shows when
  // width ≠ height.
  const rect = rectFromCenter(center, 80, 40)

  it('matches the helper across the spec matrix', () => {
    for (const spec of SPECS) {
      expectSamePoint(
        rect.anchor(spec),
        anchorOnRect(center, 80, 40, spec),
        `anchor(${JSON.stringify(spec)})`
      )
    }
  })

  it('boundaryPoint matches the helper for numeric angles', () => {
    for (const angle of [0, 17, 45, 90, 123, 180, 250, 270, 315, 359]) {
      expectSamePoint(
        rect.boundaryPoint(angle),
        anchorOnRect(center, 80, 40, angle),
        `boundaryPoint(${angle})`
      )
    }
  })

  it('corner aliases all resolve to the literal corner, not the ray hit', () => {
    const corner = rect.anchor('north east')
    for (const alias of ['ne', 'northeast', 'NE', ' North East ']) {
      expectSamePoint(rect.anchor(alias), corner, `alias ${alias}`)
    }
    // The 315° ray hits the top edge of a wide rect, NOT the corner —
    // the corner fast-path is what keeps named corners correct.
    expect(corner.x).toBeCloseTo(140, 8)
    expect(corner.y).toBeCloseTo(40, 8)
    expect(rect.anchor(315).y).toBeCloseTo(40, 8) // top edge…
    expect(rect.anchor(315).x).toBeLessThan(140) // …but left of the corner
  })

  it('degenerate zero-area rectangle anchors to its center', () => {
    const deg = rectFromCenter(center, 0, 0)
    for (const spec of SPECS) {
      expectSamePoint(
        deg.anchor(spec),
        anchorOnRect(center, 0, 0, spec),
        `degenerate anchor(${JSON.stringify(spec)})`
      )
    }
  })
})

describe('Circle.anchor delegates to anchorOnCircle', () => {
  const center = { x: 50, y: 50 }
  const c = circle(center, 25)

  it('matches the helper across the spec matrix', () => {
    for (const spec of SPECS) {
      expectSamePoint(
        c.anchor(spec),
        anchorOnCircle(center, 25, spec),
        `anchor(${JSON.stringify(spec)})`
      )
    }
  })
})

describe('Ellipse.anchor delegates to anchorOnEllipse', () => {
  const center = { x: 10, y: 20 }

  it('axis-aligned: matches the helper across the spec matrix', () => {
    const e = new Ellipse(center, 40, 20)
    for (const spec of SPECS) {
      expectSamePoint(
        e.anchor(spec),
        anchorOnEllipse(center, 40, 20, spec),
        `anchor(${JSON.stringify(spec)})`
      )
    }
  })

  it('rotated: passes rotation through to the helper', () => {
    const e = new Ellipse(center, 40, 20, 30)
    for (const spec of SPECS) {
      expectSamePoint(
        e.anchor(spec),
        anchorOnEllipse(center, 40, 20, spec, 30),
        `rotated anchor(${JSON.stringify(spec)})`
      )
    }
  })

  it('rotation actually changes anchors (regression guard)', () => {
    const flat = new Ellipse(center, 40, 20)
    const spun = new Ellipse(center, 40, 20, 45)
    // 45° on a 2:1 ellipse is well off-axis; rotation must move the point.
    expect(flat.anchor(45).distanceTo(spun.anchor(45))).toBeGreaterThan(1)
  })
})

describe('Diamond (Polygon ray-intersection) cross-validates anchorOnDiamond', () => {
  const center = { x: 100, y: 100 }
  const d = diamond(center, 80, 40)

  it('two independent implementations agree across the spec matrix', () => {
    for (const spec of SPECS) {
      expectSamePoint(
        d.anchor(spec),
        anchorOnDiamond(center, 80, 40, spec),
        `anchor(${JSON.stringify(spec)})`
      )
    }
  })
})
