/**
 * Angle marks — pinned against the TikZ `angles` library
 * (`tikzlibraryangles.code.tex`), whose pic splits into `background
 * code` (the filled wedge) and `foreground code` (the stroked arc).
 * The geometry assertions below mirror those two macros directly.
 */
import { describe, it, expect } from 'vitest'
import {
  angleMark,
  rightAngleMark,
  ANGLE_RADIUS_DEFAULT,
  ANGLE_RADIUS_FALLBACK,
  ANGLE_ECCENTRICITY_DEFAULT,
  RIGHT_ANGLE_LABEL_FACTOR,
} from '../../../src/ext/angles'
import { Arc } from '../../../src/geometry/Arc'
import { Path } from '../../../src/path/Path'
import { point } from '../../../src/core/Point'
import { picture } from '../../../src/picture/Picture'

// Screen convention (y down): A due east of B, C due south of B, so
// the ray angles are 0° and 90° and the marked angle is a quarter turn.
const B = point(0, 0)
const A = point(10, 0)
const C = point(0, 10)
const R = 10

function expectPt(p: { x: number; y: number }, x: number, y: number, label = '') {
  expect(p.x, `${label} x`).toBeCloseTo(x, 6)
  expect(p.y, `${label} y`).toBeCloseTo(y, 6)
}

describe('TikZ defaults', () => {
  it('matches angle radius=5mm, expressed in the points jikz counts in', () => {
    // 5mm at 72.27pt/inch — what \pgfmathsetmacro leaves in \tikz@lib@angle@rad.
    expect(ANGLE_RADIUS_DEFAULT).toBeCloseTo(14.226378, 5)
    expect(angleMark(A, B, C).radius).toBeCloseTo(ANGLE_RADIUS_DEFAULT, 6)
  })

  it('matches angle eccentricity=.6 and the right angle 1.4142136 factor', () => {
    expect(ANGLE_ECCENTRICITY_DEFAULT).toBe(0.6)
    expect(RIGHT_ANGLE_LABEL_FACTOR).toBeCloseTo(1.4142136, 6)
  })

  it('falls back to 12 when the radius is not positive, as \\ifdim does', () => {
    expect(ANGLE_RADIUS_FALLBACK).toBe(12)
    expect(angleMark(A, B, C, { radius: 0 }).radius).toBe(12)
    expect(angleMark(A, B, C, { radius: -5 }).radius).toBe(12)
  })
})

describe('angleMark', () => {
  it('reads the ray angles off the vertex and sweeps forwards', () => {
    const m = angleMark(A, B, C, { radius: R })
    expect(m.startAngle).toBeCloseTo(0, 6)
    expect(m.endAngle).toBeCloseTo(90, 6)
    expect(m.sweep).toBeCloseTo(90, 6)
    expectPt(m.vertex, 0, 0, 'vertex')
  })

  it('is not symmetric: swapping the outer arguments marks the other angle', () => {
    // \ifdim\end pt<\start pt → \start-360, so A--B--C and C--B--A are
    // the two angles at B, and together they close the turn.
    const forward = angleMark(A, B, C, { radius: R })
    const reverse = angleMark(C, B, A, { radius: R })
    expect(forward.sweep).toBeCloseTo(90, 6)
    expect(reverse.sweep).toBeCloseTo(270, 6)
    expect(forward.sweep + reverse.sweep).toBeCloseTo(360, 6)
  })

  it('builds the outline as an Arc on the vertex', () => {
    const m = angleMark(A, B, C, { radius: R })
    expect(m.outline).toBeInstanceOf(Arc)
    const a = m.outline as Arc
    expectPt(a.center, 0, 0, 'arc center')
    expect(a.radius).toBe(R)
    expect(a.sweep).toBeCloseTo(90, 6)
    expectPt(a.start, R, 0, 'arc start')
    expectPt(a.end, 0, R, 'arc end')
  })

  it('builds the wedge the way the background macro does', () => {
    // (B.center) -- ++(start:r) arc[start→end, r] -- cycle
    const m = angleMark(A, B, C, { radius: R })
    const d = m.wedge.toSVGPath()
    expect(d).toMatch(/^M 0 0/)
    expect(d).toMatch(/A 10 10 0 0 1/)
    expect(d.trimEnd().endsWith('Z')).toBe(true)
    const pts = m.wedge.allPoints
    expectPt(pts[0]!, 0, 0, 'wedge start = vertex')
    expectPt(pts[1]!, R, 0, 'wedge first side')
  })

  it('sets the large-arc flag once the angle passes a half turn', () => {
    const minor = angleMark(A, B, C, { radius: R })
    const major = angleMark(C, B, A, { radius: R })
    expect(minor.sweep).toBeLessThan(180)
    expect(major.sweep).toBeGreaterThan(180)
    expect(minor.wedge.toSVGPath()).toMatch(/A 10 10 0 0 1/)
    expect(major.wedge.toSVGPath()).toMatch(/A 10 10 0 1 1/)
  })

  it('places the label at eccentricity x radius along the bisector', () => {
    const m = angleMark(A, B, C, { radius: R })
    const d = 0.6 * R
    expectPt(m.labelAt, d * Math.cos(Math.PI / 4), d * Math.sin(Math.PI / 4), 'labelAt')
    expect(Math.hypot(m.labelAt.x, m.labelAt.y)).toBeCloseTo(d, 6)
  })

  it('puts the label on the arc itself at eccentricity 1', () => {
    const m = angleMark(A, B, C, { radius: R, eccentricity: 1 })
    expect(Math.hypot(m.labelAt.x, m.labelAt.y)).toBeCloseTo(R, 6)
  })

  it('reports a zero sweep for co-directional rays, where the Arc cannot', () => {
    // Documented edge: TikZ leaves \start unchanged and draws nothing;
    // jikz's Arc normalizes start == end to a full circle. `sweep` is
    // the field to trust.
    const m = angleMark(A, B, point(20, 0), { radius: R })
    expect(m.sweep).toBeCloseTo(0, 6)
    expect((m.outline as Arc).sweep).toBeCloseTo(360, 6)
  })
})

describe('rightAngleMark', () => {
  it('builds the open corner the way the foreground macro does', () => {
    // ([shift={(start:r)}]B) -- ++(end:r) -- ++(start:-r)
    const m = rightAngleMark(A, B, C, { radius: R })
    expect(m.outline).toBeInstanceOf(Path)
    const pts = (m.outline as Path).allPoints
    expect(pts).toHaveLength(3)
    expectPt(pts[0]!, R, 0, 'from')
    expectPt(pts[1]!, R, R, 'corner')
    expectPt(pts[2]!, 0, R, 'to')
    expect((m.outline as Path).isClosed).toBe(false)
  })

  it('closes the wedge through the vertex', () => {
    // (B) -- ++(start:r) -- ++(end:r) -- ++(start:-r) -- cycle
    const m = rightAngleMark(A, B, C, { radius: R })
    const pts = m.wedge.allPoints
    expectPt(pts[0]!, 0, 0, 'vertex')
    expectPt(pts[1]!, R, 0, 'from')
    expectPt(pts[2]!, R, R, 'corner')
    expectPt(pts[3]!, 0, R, 'to')
    expect(m.wedge.isClosed).toBe(true)
  })

  it('pushes the label out by root two so it clears the corner', () => {
    // The whole point of TikZ's 1.4142136: at the default eccentricity
    // the label lands 0.6 of the way to the corner, not to the chord.
    const m = rightAngleMark(A, B, C, { radius: R })
    expectPt(m.labelAt, 6, 6, 'labelAt')
  })

  it('follows the rays into a rhombus when they are not perpendicular', () => {
    // TikZ never checks; the corner is spanned by the two directions.
    const m = rightAngleMark(A, B, point(10, 10), { radius: R })
    expect(m.sweep).toBeCloseTo(45, 6)
    const pts = (m.outline as Path).allPoints
    expectPt(pts[1]!, R + R * Math.cos(Math.PI / 4), R * Math.sin(Math.PI / 4), 'corner')
  })
})

describe('composition with the picture verbs', () => {
  it('draws both pieces with no cast and no renderer changes', () => {
    const m = angleMark(A, B, C, { radius: R })
    const svg = picture()
      .fill(m.wedge, { style: { fill: '#dbeafe' } })
      .draw(m.outline, { style: { stroke: '#2563eb' } })
      .toSVG({ width: 40, height: 40 })
    expect(svg).toContain('#dbeafe')
    expect(svg).toContain('#2563eb')
    expect(svg).toContain('A 10 10 0 0 1')
  })

  it('has no arrow tip on the outline — arrows are edge-only in jikz', () => {
    // TikZ's manual shows `pic ["$\\alpha$", draw, ->] {angle}`; jikz
    // honors arrowEnd on edges only (SVGRenderer.renderEdge), so a bare
    // arc renders unmarked. Pinning the gap so it is noticed if it closes.
    const m = angleMark(A, B, C, { radius: R })
    const svg = picture().draw(m.outline).toSVG({ width: 40, height: 40 })
    expect(svg).not.toContain('marker-end')
  })

  it('accepts node centers, which the TikZ pic cannot refuse either way', () => {
    const m = rightAngleMark({ x: 30, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 30 }, { radius: R })
    expect(m.sweep).toBeCloseTo(90, 6)
  })
})
