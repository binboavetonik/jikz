import { describe, it, expect } from 'vitest'
import { point } from '../../src/core/Point'
import { bezierControlPoints } from '../../src/path/bezier'

describe('bezierControlPoints', () => {
  it('with no routing keys sits the control points on the chord (straight)', () => {
    const [c1, c2] = bezierControlPoints(point(0, 0), point(100, 0))
    expect(c1.x).toBeCloseTo(33, 0)
    expect(c1.y).toBeCloseTo(0)
    expect(c2.x).toBeCloseTo(67, 0)
    expect(c2.y).toBeCloseTo(0)
  })

  it('bend left curves up (left of east travel) and bend right curves down', () => {
    const [l1] = bezierControlPoints(point(0, 0), point(100, 0), { bend: 'left' })
    const [r1] = bezierControlPoints(point(0, 0), point(100, 0), { bend: 'right' })
    // Positive bend = left of travel = counterclockwise on screen = up.
    expect(l1.y).toBeLessThan(0)
    expect(r1.y).toBeGreaterThan(0)
  })

  it("bend 'left' equals a numeric +30 bend (TikZ default)", () => {
    const a = bezierControlPoints(point(0, 0), point(100, 0), { bend: 'left' })
    const b = bezierControlPoints(point(0, 0), point(100, 0), { bend: 30 })
    expect(a[0].x).toBeCloseTo(b[0].x, 5)
    expect(a[0].y).toBeCloseTo(b[0].y, 5)
    expect(a[1].x).toBeCloseTo(b[1].x, 5)
    expect(a[1].y).toBeCloseTo(b[1].y, 5)
  })

  it('out/in angles place control points along those directions', () => {
    const [c1, c2] = bezierControlPoints(point(0, 0), point(100, 0), { out: 90, in: 90 })
    // out: 90 = south (down) from the start
    expect(c1.x).toBeCloseTo(0, 5)
    expect(c1.y).toBeCloseTo(40, 0)
    // in: 90 = arrives heading south, so the control point is 180° round = north (up) from the end
    expect(c2.x).toBeCloseTo(100, 5)
    expect(c2.y).toBeCloseTo(-40, 0)
  })

  it('out alone defaults in to the straight arrival direction', () => {
    const [c1, c2] = bezierControlPoints(point(0, 0), point(100, 0), { out: 90 })
    expect(c1.y).toBeGreaterThan(0)
    // straight arrival: control point on the chord, 40px back from the end
    expect(c2.x).toBeCloseTo(60, 0)
    expect(c2.y).toBeCloseTo(0)
  })

  it('looseness scales the control-point distance', () => {
    const [near] = bezierControlPoints(point(0, 0), point(100, 0), { out: 90, looseness: 1 })
    const [far] = bezierControlPoints(point(0, 0), point(100, 0), { out: 90, looseness: 2 })
    expect(near.y).toBeCloseTo(40, 0)
    expect(far.y).toBeCloseTo(80, 0)
  })

  it('outLooseness / inLooseness override looseness per side', () => {
    const [c1, c2] = bezierControlPoints(point(0, 0), point(100, 0), {
      out: 90,
      in: 90,
      looseness: 2,
      outLooseness: 3,
      inLooseness: 1,
    })
    expect(c1.y).toBeCloseTo(120, 0) // 100 * 3 * 0.4
    expect(c2.y).toBeCloseTo(-40, 0) // 100 * 1 * 0.4
  })

  it('a zero-length chord uses a nominal length so loops open', () => {
    const [c1] = bezierControlPoints(point(10, 10), point(10, 10), { out: 0 })
    const dist = Math.hypot(c1.x - 10, c1.y - 10)
    expect(dist).toBeCloseTo(16, 0) // 40 * 1 * 0.4
  })
})
