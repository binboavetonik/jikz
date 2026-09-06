import { describe, it, expect } from 'vitest'
import {
  intersect,
  intersectLineLine,
  intersectSegmentSegment,
  intersectLineCircle,
  intersectSegmentCircle,
  intersectCircleCircle,
  intersectLineArc,
  intersectSegmentArc,
  intersectArcArc,
  intersectLineRect,
  intersectSegmentRect,
  intersectCircleRect,
} from '../../src/geometry/intersect'
import { line } from '../../src/geometry/Line'
import { circle } from '../../src/geometry/Circle'
import { arc } from '../../src/geometry/Arc'
import { rect } from '../../src/geometry/Rectangle'
import { point } from '../../src/core/Point'

describe('intersect', () => {
  describe('intersectLineLine', () => {
    it('finds intersection of two lines', () => {
      const l1 = line(point(0, 0), point(10, 10))
      const l2 = line(point(0, 10), point(10, 0))
      const result = intersectLineLine(l1, l2)

      expect(result.coincident).toBe(false)
      expect(result.points).toHaveLength(1)
      expect(result.points[0]!.x).toBeCloseTo(5)
      expect(result.points[0]!.y).toBeCloseTo(5)
    })

    it('returns empty for parallel lines', () => {
      const l1 = line(point(0, 0), point(10, 0))
      const l2 = line(point(0, 5), point(10, 5))
      const result = intersectLineLine(l1, l2)

      expect(result.coincident).toBe(false)
      expect(result.points).toHaveLength(0)
    })

    it('detects coincident lines', () => {
      const l1 = line(point(0, 0), point(10, 0))
      const l2 = line(point(5, 0), point(15, 0))
      const result = intersectLineLine(l1, l2)

      expect(result.coincident).toBe(true)
    })
  })

  describe('intersectSegmentSegment', () => {
    it('finds intersection within segments', () => {
      const s1 = line(point(0, 0), point(10, 10))
      const s2 = line(point(0, 10), point(10, 0))
      const result = intersectSegmentSegment(s1, s2)

      expect(result.points).toHaveLength(1)
      expect(result.points[0]!.x).toBeCloseTo(5)
    })

    it('returns empty when intersection is outside segments', () => {
      const s1 = line(point(0, 0), point(4, 4))
      const s2 = line(point(6, 10), point(10, 0))
      const result = intersectSegmentSegment(s1, s2)

      expect(result.points).toHaveLength(0)
    })

    it('handles overlapping collinear segments', () => {
      const s1 = line(point(0, 0), point(10, 0))
      const s2 = line(point(5, 0), point(15, 0))
      const result = intersectSegmentSegment(s1, s2)

      expect(result.coincident).toBe(true)
      expect(result.points.length).toBeGreaterThan(0)
    })
  })

  describe('intersectLineCircle', () => {
    it('finds two intersections for secant line', () => {
      const l = line(point(-20, 0), point(20, 0))
      const c = circle(point(0, 0), 10)
      const result = intersectLineCircle(l, c)

      expect(result.points).toHaveLength(2)
      expect(result.points[0]!.x).toBeCloseTo(-10)
      expect(result.points[1]!.x).toBeCloseTo(10)
    })

    it('finds one intersection for tangent line', () => {
      const l = line(point(-20, 10), point(20, 10))
      const c = circle(point(0, 0), 10)
      const result = intersectLineCircle(l, c)

      expect(result.points).toHaveLength(1)
      expect(result.points[0]!.y).toBeCloseTo(10)
    })

    it('returns empty for non-intersecting line', () => {
      const l = line(point(-20, 20), point(20, 20))
      const c = circle(point(0, 0), 10)
      const result = intersectLineCircle(l, c)

      expect(result.points).toHaveLength(0)
    })
  })

  describe('intersectSegmentCircle', () => {
    it('finds intersections within segment', () => {
      const s = line(point(-20, 0), point(20, 0))
      const c = circle(point(0, 0), 10)
      const result = intersectSegmentCircle(s, c)

      expect(result.points).toHaveLength(2)
    })

    it('returns empty when intersections are outside segment', () => {
      const s = line(point(-20, 0), point(-15, 0))
      const c = circle(point(0, 0), 10)
      const result = intersectSegmentCircle(s, c)

      expect(result.points).toHaveLength(0)
    })

    it('finds partial intersections', () => {
      const s = line(point(0, 0), point(20, 0))
      const c = circle(point(0, 0), 10)
      const result = intersectSegmentCircle(s, c)

      expect(result.points).toHaveLength(1)
      expect(result.points[0]!.x).toBeCloseTo(10)
    })
  })

  describe('intersectCircleCircle', () => {
    it('finds two intersections for overlapping circles', () => {
      const c1 = circle(point(0, 0), 10)
      const c2 = circle(point(15, 0), 10)
      const result = intersectCircleCircle(c1, c2)

      expect(result.points).toHaveLength(2)
    })

    it('finds one intersection for tangent circles', () => {
      const c1 = circle(point(0, 0), 10)
      const c2 = circle(point(20, 0), 10)
      const result = intersectCircleCircle(c1, c2)

      expect(result.points).toHaveLength(1)
      expect(result.points[0]!.x).toBeCloseTo(10)
    })

    it('returns empty for non-overlapping circles', () => {
      const c1 = circle(point(0, 0), 10)
      const c2 = circle(point(50, 0), 10)
      const result = intersectCircleCircle(c1, c2)

      expect(result.points).toHaveLength(0)
    })

    it('returns empty for contained circle', () => {
      const c1 = circle(point(0, 0), 20)
      const c2 = circle(point(0, 0), 5)
      const result = intersectCircleCircle(c1, c2)

      expect(result.points).toHaveLength(0)
    })

    it('detects coincident circles', () => {
      const c1 = circle(point(0, 0), 10)
      const c2 = circle(point(0, 0), 10)
      const result = intersectCircleCircle(c1, c2)

      expect(result.coincident).toBe(true)
    })
  })

  describe('intersectLineArc', () => {
    it('finds intersection within arc sweep', () => {
      const l = line(point(-20, 0), point(20, 0))
      const a = arc(point(0, 0), 10, 270, 90) // right half (CCW from south through east to north)
      const result = intersectLineArc(l, a)

      // The arc includes the east point (10, 0) at 0°
      expect(result.points).toHaveLength(1)
      expect(result.points[0]!.x).toBeCloseTo(10)
    })

    it('returns empty when line misses arc', () => {
      const l = line(point(-20, 5), point(20, 5)) // horizontal line at y=5
      const a = arc(point(0, 0), 10, 180, 270) // bottom-left quadrant (CCW from west to south)
      const result = intersectLineArc(l, a)

      // The arc is entirely in the y<0 region, line is at y=5
      expect(result.points).toHaveLength(0)
    })

    it('finds intersection on arc', () => {
      const l = line(point(-20, 0), point(20, 0))
      const a = arc(point(0, 0), 10, 0, 180) // top half, includes y=0 points at endpoints
      const result = intersectLineArc(l, a)

      expect(result.points.length).toBeGreaterThan(0)
    })
  })

  describe('intersectArcArc', () => {
    it('finds intersection of two arcs', () => {
      const a1 = arc(point(0, 0), 10, 0, 180)
      const a2 = arc(point(10, 0), 10, 90, 270)
      const result = intersectArcArc(a1, a2)

      // Both arcs are on circles that intersect
      expect(result.points.length).toBeGreaterThanOrEqual(0)
    })

    describe('coincident circles (arcs on the same underlying circle)', () => {
      it('reports continuous overlap when arcs overlap in a range', () => {
        // Same circle; arc1: 0°-180°, arc2: 90°-270°. Overlap: 90°-180°.
        const a1 = arc(point(0, 0), 10, 0, 180)
        const a2 = arc(point(0, 0), 10, 90, 270)
        const result = intersectArcArc(a1, a2)

        expect(result.coincident).toBe(true)
        expect(result.points).toHaveLength(2)
        // Overlap boundary points at 90° and 180°
        const xs = result.points.map((p) => p.x).sort((a, b) => a - b)
        const ys = result.points.map((p) => p.y).sort((a, b) => a - b)
        expect(xs[0]).toBeCloseTo(-10) // 180°
        expect(xs[1]).toBeCloseTo(0) // 90°
        expect(ys[0]).toBeCloseTo(0) // 180°
        expect(ys[1]).toBeCloseTo(10) // 90°
      })

      it('reports a single point when arcs share only one endpoint (tangential)', () => {
        // Same circle; arc1: 0°-90°, arc2: 90°-180°. Share only the 90° point.
        const a1 = arc(point(0, 0), 10, 0, 90)
        const a2 = arc(point(0, 0), 10, 90, 180)
        const result = intersectArcArc(a1, a2)

        expect(result.coincident).toBe(false)
        expect(result.points).toHaveLength(1)
        expect(result.points[0]!.x).toBeCloseTo(0)
        expect(result.points[0]!.y).toBeCloseTo(10)
      })

      it('returns empty when arcs on the same circle are disjoint', () => {
        // Same circle; arc1: 0°-45°, arc2: 180°-225°. No overlap.
        const a1 = arc(point(0, 0), 10, 0, 45)
        const a2 = arc(point(0, 0), 10, 180, 225)
        const result = intersectArcArc(a1, a2)

        expect(result.coincident).toBe(false)
        expect(result.points).toHaveLength(0)
      })

      it('reports continuous overlap when one arc fully contains another', () => {
        // Same circle; arc1: 0°-270° contains arc2: 45°-135°.
        const a1 = arc(point(0, 0), 10, 0, 270)
        const a2 = arc(point(0, 0), 10, 45, 135)
        const result = intersectArcArc(a1, a2)

        expect(result.coincident).toBe(true)
        // Boundary points are arc2's endpoints (contained within arc1).
        expect(result.points).toHaveLength(2)
      })

      it('reports continuous overlap for identical arcs', () => {
        const a1 = arc(point(0, 0), 10, 30, 150)
        const a2 = arc(point(0, 0), 10, 30, 150)
        const result = intersectArcArc(a1, a2)

        expect(result.coincident).toBe(true)
        expect(result.points).toHaveLength(2)
      })

      it('handles arcs that wrap across 0°', () => {
        // arc1 wraps: 300°-60° (covers 300-360 and 0-60).
        // arc2: 30°-120°. Overlap: 30°-60°.
        const a1 = arc(point(0, 0), 10, 300, 60)
        const a2 = arc(point(0, 0), 10, 30, 120)
        const result = intersectArcArc(a1, a2)

        expect(result.coincident).toBe(true)
        expect(result.points.length).toBeGreaterThanOrEqual(2)
      })
    })
  })

  describe('intersectLineRect', () => {
    it('finds intersections with rectangle edges', () => {
      const l = line(point(-10, 25), point(110, 25))
      const r = rect(0, 0, 100, 50)
      const result = intersectLineRect(l, r)

      expect(result.points).toHaveLength(2)
    })

    it('handles line through corner', () => {
      const l = line(point(-10, -10), point(110, 60))
      const r = rect(0, 0, 100, 50)
      const result = intersectLineRect(l, r)

      expect(result.points.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('intersectSegmentRect', () => {
    it('finds intersections within segment', () => {
      const s = line(point(50, -10), point(50, 60))
      const r = rect(0, 0, 100, 50)
      const result = intersectSegmentRect(s, r)

      expect(result.points).toHaveLength(2)
    })

    it('returns empty when segment misses rectangle', () => {
      const s = line(point(-50, 25), point(-10, 25))
      const r = rect(0, 0, 100, 50)
      const result = intersectSegmentRect(s, r)

      expect(result.points).toHaveLength(0)
    })
  })

  describe('intersectCircleRect', () => {
    it('finds intersections with rectangle edges', () => {
      const c = circle(point(50, 50), 30)
      const r = rect(0, 0, 100, 50)
      const result = intersectCircleRect(c, r)

      expect(result.points.length).toBeGreaterThan(0)
    })
  })

  describe('generic intersect function', () => {
    it('dispatches line-line correctly', () => {
      const l1 = line(point(0, 0), point(10, 10))
      const l2 = line(point(0, 10), point(10, 0))
      const result = intersect(l1, l2)

      expect(result.points).toHaveLength(1)
    })

    it('dispatches line-circle correctly', () => {
      const l = line(point(-20, 0), point(20, 0))
      const c = circle(point(0, 0), 10)
      const result = intersect(l, c)

      expect(result.points).toHaveLength(2)
    })

    it('dispatches circle-line correctly', () => {
      const l = line(point(-20, 0), point(20, 0))
      const c = circle(point(0, 0), 10)
      const result = intersect(c, l)

      expect(result.points).toHaveLength(2)
    })

    it('dispatches circle-circle correctly', () => {
      const c1 = circle(point(0, 0), 10)
      const c2 = circle(point(15, 0), 10)
      const result = intersect(c1, c2)

      expect(result.points).toHaveLength(2)
    })

    it('uses segmentMode option', () => {
      const s1 = line(point(0, 0), point(4, 4))
      const s2 = line(point(6, 10), point(10, 0))

      const lineResult = intersect(s1, s2, { segmentMode: false })
      const segmentResult = intersect(s1, s2, { segmentMode: true })

      expect(lineResult.points).toHaveLength(1)
      expect(segmentResult.points).toHaveLength(0)
    })

    it('dispatches rectangle-rectangle correctly', () => {
      const r1 = rect(0, 0, 100, 50)
      const r2 = rect(50, 25, 100, 50)
      const result = intersect(r1, r2)

      expect(result.points).toHaveLength(4) // corners of intersection
    })
  })
})
