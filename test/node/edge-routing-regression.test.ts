/**
 * Regression tests for edge-routing bugs found in the 2026-09 audit:
 *
 *  1. bendAngle alone must promote the edge to bezier routing —
 *     previously only out/in did, so `edge(a, b, { bendAngle: 35 })`
 *     rendered as a straight line (visible in the edge-routing demo:
 *     the "bend left" edge was straight).
 *
 *  2. Self-loops must not collapse: control distances scale with the
 *     endpoint distance, which is 0 for a self-edge — the loop
 *     degenerated to a zero-length path. A nominal chord keeps
 *     looseness meaningful (TikZ's loop opens regardless of chord).
 */
import { describe, it, expect } from 'vitest'
import { Edge } from '../../src/node/Edge'
import { point } from '../../src/core/Point'

describe('edge routing regressions', () => {
  it('bendAngle promotes to bezier routing and bends left of travel', () => {
    const e = new Edge(point(0, 100), point(100, 100), { bendAngle: 45 })
    expect(e.routing).toBe('bezier')
    const d = e.toSVGPath()
    expect(d).toContain('C') // a curve, not "L"
    // Traveling east (+x), bend left = counterclockwise = up-screen:
    // control points must lie ABOVE the chord (y < 100).
    const [cp1, cp2] = e.controlPoints
    expect(cp1.y).toBeLessThan(100)
    expect(cp2.y).toBeLessThan(100)
  })

  it('negative bendAngle bends right of travel', () => {
    const e = new Edge(point(0, 100), point(100, 100), { bendAngle: -45 })
    const [cp1, cp2] = e.controlPoints
    expect(cp1.y).toBeGreaterThan(100)
    expect(cp2.y).toBeGreaterThan(100)
  })

  it('self-loop does not collapse to a point', () => {
    const e = new Edge(point(360, 60), point(360, 60), {
      out: 240,
      in: 300,
      looseness: 5,
    })
    const [cp1, cp2] = e.controlPoints
    // Control points must be off the shared endpoint — a visible loop.
    expect(cp1.distanceTo(point(360, 60))).toBeGreaterThan(10)
    expect(cp2.distanceTo(point(360, 60))).toBeGreaterThan(10)
    expect(e.toSVGPath()).not.toMatch(/C 360 60, 360 60,/)
  })

  it('straight edges without curve options stay straight', () => {
    const e = new Edge(point(0, 0), point(10, 10), {})
    expect(e.routing).toBe('straight')
    expect(e.toSVGPath()).toBe('M 0 0 L 10 10')
  })
})
