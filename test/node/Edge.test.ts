import { describe, it, expect } from 'vitest'
import { Edge, edge, arrow, biEdge, bentEdge, toEdge, bendLeft, bendRight, loopEdge, LOOP_ANGLES } from '../../src/node/Edge'
import { node, rectNode } from '../../src/node/Node'
import { point } from '../../src/core/Point'
import { SVGRenderer } from '../../src/render/SVGRenderer'
import { allShapes } from '../../src/geometry/shapes'
const SHAPES = allShapes

describe('Edge', () => {
  describe('constructor and factories', () => {
    it('creates edge between two points', () => {
      const e = new Edge(point(0, 0), point(100, 0))
      expect(e.from.x).toBe(0)
      expect(e.to.x).toBe(100)
    })

    it('edge() factory creates an Edge', () => {
      const e = edge(point(0, 0), point(100, 100))
      expect(e).toBeInstanceOf(Edge)
    })

    it('arrow() creates edge with arrow at end', () => {
      const e = arrow(point(0, 0), point(100, 0))
      expect(e.arrowEnd).toBe('stealth')
    })

    it('biEdge() creates bidirectional edge', () => {
      const e = biEdge(point(0, 0), point(100, 0))
      expect(e.arrowStart).toBe('stealth')
      expect(e.arrowEnd).toBe('stealth')
    })

    it('bentEdge() creates curved edge', () => {
      const e = bentEdge(point(0, 0), point(100, 0), 30)
      expect(e.routing).toBe('bezier')
      expect(e.bendAngle).toBe(30)
    })
  })

  describe('edge between nodes', () => {
    const n1 = rectNode({ at: point(0, 0), width: 60, height: 40 })
    const n2 = rectNode({ at: point(150, 0), width: 60, height: 40 })

    it('auto-calculates anchors toward each other', () => {
      const e = edge(n1, n2)
      // From node 1's east to node 2's west
      expect(e.from.x).toBeCloseTo(30) // n1's east anchor
      expect(e.to.x).toBeCloseTo(120) // n2's west anchor
    })

    it('uses specified anchors', () => {
      const e = edge(n1, n2, { fromAnchor: 'north', toAnchor: 'south' })
      expect(e.from.y).toBeCloseTo(-20) // n1's north (visual top)
      expect(e.to.y).toBeCloseTo(20) // n2's south (visual bottom)
    })

    // ─────────────────────────────────────────────────────────────────
    // Stage 3: 'auto' vs 'center' — make defaults mean what they say.
    //
    // Before: fromAnchor defaulted to 'center', and resolveAnchor silently
    // treated 'center' as 'auto' (boundary-along-ray). Users had no way
    // to ask for the literal center.
    //
    // After: the default is 'auto', which boundary-resolves exactly as
    // before. 'center' now returns the actual center point.
    // ─────────────────────────────────────────────────────────────────

    it("default fromAnchor/toAnchor is 'auto'", () => {
      const e = edge(n1, n2)
      expect(e.fromAnchor).toBe('auto')
      expect(e.toAnchor).toBe('auto')
    })

    it("explicit 'auto' matches default behavior", () => {
      const defaulted = edge(n1, n2)
      const explicit = edge(n1, n2, { fromAnchor: 'auto', toAnchor: 'auto' })
      expect(explicit.from.x).toBeCloseTo(defaulted.from.x)
      expect(explicit.to.x).toBeCloseTo(defaulted.to.x)
    })

    it("'center' returns the literal center, not the auto-boundary", () => {
      // n1 is at (0, 0) — its center is (0, 0). With 'center' now
      // meaning center, the edge starts at the origin (inside the node),
      // not on the east boundary.
      const e = edge(n1, n2, { fromAnchor: 'center', toAnchor: 'center' })
      expect(e.from.x).toBeCloseTo(0)
      expect(e.from.y).toBeCloseTo(0)
      expect(e.to.x).toBeCloseTo(150)
      expect(e.to.y).toBeCloseTo(0)
    })

    it("'auto' boundary-terminates between off-axis nodes", () => {
      // Diagonal placement: the from-point should land on n1's boundary
      // along the ray toward n2's center, not at n1's east.
      const a = rectNode({ at: point(0, 0), width: 60, height: 40 })
      const b = rectNode({ at: point(100, 100), width: 60, height: 40 })
      const e = edge(a, b)
      // From-point lies on n1's rectangle boundary (bounds: [-30, -20, 30, 20])
      const [minX, minY, maxX, maxY] = a.bounds
      const onBoundary =
        Math.abs(e.from.x - minX) < 1e-6 ||
        Math.abs(e.from.x - maxX) < 1e-6 ||
        Math.abs(e.from.y - minY) < 1e-6 ||
        Math.abs(e.from.y - maxY) < 1e-6
      expect(onBoundary).toBe(true)
      // And points toward b's center.
      const towardB = Math.atan2(100 - 0, 100 - 0) * 180 / Math.PI
      const actual = Math.atan2(e.from.y - 0, e.from.x - 0) * 180 / Math.PI
      expect(actual).toBeCloseTo(towardB, 1)
    })
  })

  describe('properties', () => {
    const e = edge(point(0, 0), point(100, 0))

    it('start and end apply shortening', () => {
      const e2 = edge(point(0, 0), point(100, 0), { shortenStart: 10, shortenEnd: 10 })
      expect(e2.start.x).toBeCloseTo(10)
      expect(e2.end.x).toBeCloseTo(90)
    })

    it('length is distance from start to end', () => {
      expect(e.length).toBeCloseTo(100)
    })

    it('midpoint is at t=0.5', () => {
      expect(e.midpoint.x).toBeCloseTo(50)
      expect(e.midpoint.y).toBeCloseTo(0)
    })

    it('angle is direction in degrees', () => {
      expect(e.angle).toBeCloseTo(0)

      const e2 = edge(point(0, 0), point(0, 100))
      expect(e2.angle).toBeCloseTo(90)
    })
  })

  describe('pointAt', () => {
    it('returns points along straight path', () => {
      const e = edge(point(0, 0), point(100, 0))

      expect(e.pointAt(0).x).toBeCloseTo(0)
      expect(e.pointAt(0.5).x).toBeCloseTo(50)
      expect(e.pointAt(1).x).toBeCloseTo(100)
    })

    it('handles horizontal-vertical routing', () => {
      const e = edge(point(0, 0), point(100, 50), { routing: 'horizontal-vertical' })

      expect(e.pointAt(0).x).toBeCloseTo(0)
      expect(e.pointAt(0).y).toBeCloseTo(0)
      expect(e.pointAt(1).x).toBeCloseTo(100)
      expect(e.pointAt(1).y).toBeCloseTo(50)

      // Midpoint should be on the corner
      const mid = e.pointAt(0.5)
      expect(mid.x).toBeGreaterThan(0)
    })

    it('handles vertical-horizontal routing', () => {
      const e = edge(point(0, 0), point(100, 50), { routing: 'vertical-horizontal' })

      const mid = e.pointAt(0.5)
      expect(mid.y).toBeGreaterThan(0)
    })

    it('handles bezier routing', () => {
      const e = edge(point(0, 0), point(100, 0), { routing: 'bezier', bendAngle: 30 })

      const mid = e.pointAt(0.5)
      expect(mid.x).toBeCloseTo(50, 0)
      // With bend, midpoint should be offset from straight line
      expect(mid.y).not.toBeCloseTo(0)
    })
  })

  describe('tangentAt', () => {
    it('returns tangent angle along path', () => {
      const e = edge(point(0, 0), point(100, 0))
      expect(e.tangentAt(0.5)).toBeCloseTo(0)

      const e2 = edge(point(0, 0), point(0, 100))
      expect(e2.tangentAt(0.5)).toBeCloseTo(90)
    })
  })

  describe('waypoints', () => {
    it('returns two points for straight edge', () => {
      const e = edge(point(0, 0), point(100, 0))
      expect(e.waypoints).toHaveLength(2)
    })

    it('returns three points for orthogonal routing', () => {
      const e = edge(point(0, 0), point(100, 50), { routing: 'horizontal-vertical' })
      expect(e.waypoints).toHaveLength(3)
    })
  })

  describe('labelPoint', () => {
    it('returns point offset from path', () => {
      const e = edge(point(0, 0), point(100, 0), { labelPos: 0.5, labelOffset: 10 })
      const lp = e.labelPoint
      expect(lp.x).toBeCloseTo(50)
      // Left of travel (TikZ auto=left); for an eastward edge that's
      // visually above the line, i.e. negative y on screen.
      expect(lp.y).toBeCloseTo(-10)
    })
  })

  describe('toSVGPath', () => {
    it('generates line path for straight edge', () => {
      const e = edge(point(0, 0), point(100, 0))
      const path = e.toSVGPath()
      expect(path).toContain('M')
      expect(path).toContain('L')
    })

    it('generates polyline for orthogonal routing', () => {
      const e = edge(point(0, 0), point(100, 50), { routing: 'horizontal-vertical' })
      const path = e.toSVGPath()
      expect(path.match(/L/g)).toHaveLength(2) // two L commands
    })

    it('generates curve for bezier routing', () => {
      const e = edge(point(0, 0), point(100, 0), { routing: 'bezier' })
      const path = e.toSVGPath()
      expect(path).toContain('C') // cubic bezier command
    })
  })

  describe('arrow markers', () => {
    it('arrowMarkerId returns consistent ID', () => {
      expect(Edge.arrowMarkerId('stealth')).toBe('arrow-stealth')
      expect(Edge.arrowMarkerId('latex')).toBe('arrow-latex')
    })

    it('arrowMarkerDef generates SVG marker', () => {
      const def = Edge.arrowMarkerDef('stealth')
      expect(def).toContain('<marker')
      expect(def).toContain('arrow-stealth')
      expect(def).toContain('</marker>')
    })

    it('returns empty string for none arrow', () => {
      const def = Edge.arrowMarkerDef('none')
      expect(def).toBe('')
    })
  })

  describe('control points', () => {
    it('bent edge has non-collinear control points', () => {
      const e = bentEdge(point(0, 0), point(100, 0), 45)
      const [cp1, cp2] = e.controlPoints

      // Control points should be offset from the straight line
      expect(cp1.y).not.toBeCloseTo(0)
      expect(cp2.y).not.toBeCloseTo(0)
    })

    it('straight bezier has collinear control points', () => {
      const e = edge(point(0, 0), point(100, 0), { routing: 'bezier', bendAngle: 0 })
      const [cp1, cp2] = e.controlPoints

      expect(cp1.y).toBeCloseTo(0)
      expect(cp2.y).toBeCloseTo(0)
    })
  })

  describe('TikZ-style out/in angles', () => {
    it('out angle sets direction leaving start point', () => {
      // out=90 means leaving going upward
      const e = edge(point(0, 0), point(100, 0), { out: 90, in: 90 })
      const [cp1] = e.controlPoints

      // Control point should be above start point
      expect(cp1.y).toBeGreaterThan(0)
    })

    it('in angle sets direction arriving at end point', () => {
      // in=90 means the path arrives moving upward (coming from below)
      // So the control point is placed in the opposite direction (below the end point)
      const e = edge(point(0, 0), point(100, 0), { out: 90, in: 90 })
      const [, cp2] = e.controlPoints

      // Control point should be below end point (in + 180 = 270 = downward)
      expect(cp2.y).toBeLessThan(0)
    })

    it('specifying out/in automatically uses bezier routing', () => {
      const e = edge(point(0, 0), point(100, 0), { out: 45, in: 135 })
      expect(e.routing).toBe('bezier')
    })

    it('toEdge factory creates edge with out/in', () => {
      const e = toEdge(point(0, 0), point(100, 0), 45, 135)
      expect(e.outAngle).toBe(45)
      expect(e.inAngle).toBe(135)
      expect(e.routing).toBe('bezier')
    })

    it('outLooseness and inLooseness control individual control point distances', () => {
      const e1 = edge(point(0, 0), point(100, 0), { out: 90, in: 90, looseness: 1 })
      const e2 = edge(point(0, 0), point(100, 0), { out: 90, in: 90, outLooseness: 2, inLooseness: 0.5 })

      const [cp1_1] = e1.controlPoints
      const [cp1_2, cp2_2] = e2.controlPoints

      // outLooseness=2 should make first control point further away
      expect(Math.abs(cp1_2.y)).toBeGreaterThan(Math.abs(cp1_1.y))
    })
  })

  describe('bendLeft and bendRight', () => {
    it('bendLeft curves to the left', () => {
      const e = bendLeft(point(0, 0), point(100, 0), 30)
      expect(e.bendAngle).toBe(30)
      expect(e.routing).toBe('bezier')

      // Left of an eastward path = visually above = negative y on screen
      const mid = e.pointAt(0.5)
      expect(mid.y).toBeLessThan(0)
    })

    it('bendRight curves to the right', () => {
      const e = bendRight(point(0, 0), point(100, 0), 30)
      expect(e.bendAngle).toBe(-30)
      expect(e.routing).toBe('bezier')

      // Right of an eastward path = visually below = positive y on screen
      const mid = e.pointAt(0.5)
      expect(mid.y).toBeGreaterThan(0)
    })

    it('uses default angle of 30 degrees', () => {
      const e = bendLeft(point(0, 0), point(100, 0))
      expect(e.bendAngle).toBe(30)
    })
  })

  describe('TikZ-style arrow specs', () => {
    it("'->' puts a 'to' tip at the end", () => {
      const e = edge(point(0, 0), point(100, 0), { arrowEnd: '->' })
      expect(e.arrowEnd).toBe('to')
      expect(e.arrowStart).toBe('none')
    })

    it("'<-' redistributes the tip to the start (TikZ \\draw[<-])", () => {
      const e = edge(point(0, 0), point(100, 0), { arrowEnd: '<-' })
      expect(e.arrowStart).toBe('to')
      expect(e.arrowEnd).toBe('none')
    })

    it("'<->' tips both ends", () => {
      const e = edge(point(0, 0), point(100, 0), { arrowEnd: '<->' })
      expect(e.arrowStart).toBe('to')
      expect(e.arrowEnd).toBe('to')
    })

    it('renders marker references for -> spec', () => {
      const r = new SVGRenderer()
      r.renderEdge(edge(point(0, 0), point(100, 0), { arrowEnd: '->' }))
      const svg = r.toSVG({ width: 120, height: 20 })
      expect(svg).toContain('marker-end="url(#arrow-to-000000)"')
    })
  })

  describe('loopEdge', () => {
    const A = node({ at: point(100, 100), shape: SHAPES['circle'], width: 40, height: 40 })

    it('creates a self-loop with loop looseness', () => {
      const e = loopEdge(point(50, 50), 'above')
      expect(e.looseness).toBe(5)
      // A bare point has no boundary, so both ends coincide.
      expect(e.from.x).toBe(e.to.x)
      expect(e.from.y).toBe(e.to.y)
    })

    // Angles are TikZ's `loop <dir>` mapped into the screen convention
    // (0° = east, clockwise). Both control points must land on the named
    // side — that is what makes the loop bulge there.
    it.each([
      ['above', 300, 60],
      ['below', 120, 240],
      ['left', 210, 330],
      ['right', 30, 150],
    ] as const)('loop %s uses out=%i, in=%i', (dir, out, inAngle) => {
      const e = loopEdge(A, dir)
      expect(e.outAngle).toBe(out)
      expect(e.inAngle).toBe(inAngle)
    })

    it.each([
      ['above', (p: { x: number; y: number }) => p.y < 100],
      ['below', (p: { x: number; y: number }) => p.y > 100],
      ['left', (p: { x: number; y: number }) => p.x < 100],
      ['right', (p: { x: number; y: number }) => p.x > 100],
    ] as const)('loop %s puts both control points on that side', (dir, onSide) => {
      const [c1, c2] = loopEdge(A, dir).controlPoints
      expect(onSide(c1)).toBe(true)
      expect(onSide(c2)).toBe(true)
    })

    it('anchors both ends on the node boundary, not at one fixed point', () => {
      // The regression: 'auto' resolved via the ray toward the other
      // endpoint, which for a self-edge is atan2(0, 0) = 0 — so every
      // loop started AND ended on the east boundary whichever way it
      // bulged.
      const e = loopEdge(A, 'above')
      expect(e.from.x).not.toBeCloseTo(e.to.x)
      for (const p of [e.from, e.to]) {
        expect(Math.hypot(p.x - 100, p.y - 100)).toBeCloseTo(20, 6) // on the circle
        expect(p.y).toBeLessThan(100) // on the top half
      }
    })

    it('never dips inside the node it loops on', () => {
      for (const dir of ['above', 'below', 'left', 'right'] as const) {
        const e = loopEdge(A, dir)
        const [c1, c2] = e.controlPoints
        let min = Infinity
        for (let i = 0; i <= 100; i++) {
          const t = i / 100
          const u = 1 - t
          const x = u ** 3 * e.from.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t ** 3 * e.to.x
          const y = u ** 3 * e.from.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t ** 3 * e.to.y
          min = Math.min(min, Math.hypot(x - 100, y - 100))
        }
        expect(min).toBeGreaterThanOrEqual(20 - 1e-6)
      }
    })
  })

  describe('self-edges', () => {
    const A = node({ at: point(100, 100), shape: SHAPES['circle'], width: 40, height: 40 })

    it('draws a visible loop instead of a zero-length path', () => {
      const e = new Edge(A, A)
      expect(e.routing).toBe('bezier')
      expect(e.length).toBeGreaterThan(0)
      expect(e.outAngle).toBe(LOOP_ANGLES.above.out)
      expect(e.inAngle).toBe(LOOP_ANGLES.above.in)
    })

    it('honors an explicit loop direction', () => {
      const e = new Edge(A, A, { loop: 'right' })
      expect(e.outAngle).toBe(LOOP_ANGLES.right.out)
      expect(e.from.x).toBeGreaterThan(100)
    })

    it('lets explicit out/in beat the loop default', () => {
      const e = new Edge(A, A, { out: 10, in: 20 })
      expect(e.outAngle).toBe(10)
      expect(e.inAngle).toBe(20)
    })

    it('lets an explicit looseness beat the loop default', () => {
      expect(new Edge(A, A, { looseness: 2 }).looseness).toBe(2)
      expect(new Edge(A, A).looseness).toBe(5)
    })

    it('treats two distinct nodes on the same centre as a self-edge', () => {
      const B = node({ at: point(100, 100), shape: SHAPES['circle'], width: 40, height: 40 })
      expect(new Edge(A, B).routing).toBe('bezier')
    })

    it('leaves ordinary edges alone', () => {
      const B = node({ at: point(200, 100), shape: SHAPES['circle'], width: 40, height: 40 })
      const e = new Edge(A, B)
      expect(e.routing).toBe('straight')
      expect(e.looseness).toBe(1)
      expect(e.outAngle).toBeUndefined()
    })

    it('respects an explicit anchor rather than the loop direction', () => {
      const e = new Edge(A, A, { loop: 'above', fromAnchor: 'south' })
      expect(e.from.y).toBeCloseTo(120) // south boundary, not the top
    })
  })

  describe('bend points', () => {
    it('renders a polyline through the bend points', () => {
      const e = edge(point(0, 0), point(100, 0), {
        bendPoints: [point(30, 20), point(70, -20)],
      })
      expect(e.bendPoints).toHaveLength(2)
      expect(e.toSVGPath()).toBe('M 0 0 L 30 20 L 70 -20 L 100 0')
    })

    it('exposes waypoints as start, bends, end', () => {
      const e = edge(point(0, 0), point(100, 0), {
        bendPoints: [point(50, 10)],
      })
      expect(e.waypoints.map((p) => [p.x, p.y])).toEqual([
        [0, 0],
        [50, 10],
        [100, 0],
      ])
    })

    it('computes pointAt along the polyline', () => {
      const e = edge(point(0, 0), point(100, 0), {
        bendPoints: [point(50, 100)],
      })
      // First segment is √(50²+100²) ≈ 111.8; second equal. Halfway lands
      // exactly at the bend point.
      const mid = e.pointAt(0.5)
      expect(mid.x).toBeCloseTo(50)
      expect(mid.y).toBeCloseTo(100)
    })

    it('aims auto endpoints at the first/last bend point', () => {
      const n1 = rectNode({ at: point(0, 0), width: 20, height: 20 })
      const n2 = rectNode({ at: point(100, 0), width: 20, height: 20 })
      const e = edge(n1, n2, { bendPoints: [point(50, 50)] })
      // from anchor aims at the first bend (down-right), to at the last
      // bend (down-left relative to n2).
      expect(e.from.y).toBeGreaterThan(0)
      expect(e.to.y).toBeGreaterThan(0)
    })
  })
})
