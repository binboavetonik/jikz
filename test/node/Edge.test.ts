import { describe, it, expect } from 'vitest'
import { Edge, edge, arrow, biEdge, bentEdge, toEdge, bendLeft, bendRight, loopEdge } from '../../src/node/Edge'
import { node, rectNode } from '../../src/node/Node'
import { point } from '../../src/core/Point'
import { SVGRenderer } from '../../src/render/SVGRenderer'

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
    it('creates self-loop with high looseness', () => {
      const e = loopEdge(point(50, 50), 'above')
      expect(e.looseness).toBe(5)
      expect(e.from.x).toBe(e.to.x)
      expect(e.from.y).toBe(e.to.y)
    })

    it('loop above goes out left-up and in right-up', () => {
      const e = loopEdge(point(50, 50), 'above')
      expect(e.outAngle).toBe(240)
      expect(e.inAngle).toBe(300)
    })

    it('loop below goes out left-down and in right-down', () => {
      const e = loopEdge(point(50, 50), 'below')
      expect(e.outAngle).toBe(120)
      expect(e.inAngle).toBe(60)
    })

    it('loop left goes out up-left and in down-left', () => {
      const e = loopEdge(point(50, 50), 'left')
      expect(e.outAngle).toBe(210)
      expect(e.inAngle).toBe(150)
    })

    it('loop right goes out up-right and in down-right', () => {
      const e = loopEdge(point(50, 50), 'right')
      expect(e.outAngle).toBe(330)
      expect(e.inAngle).toBe(30)
    })
  })
})
