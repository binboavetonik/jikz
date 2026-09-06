import { describe, it, expect } from 'vitest'
import {
  Rectangle,
  rect,
  rectFromCenter,
  rectFromCorners,
  square,
  rectFit,
  rectFromBounds,
} from '../../src/geometry/Rectangle'
import { point } from '../../src/core/Point'

describe('Rectangle', () => {
  describe('constructor and factories', () => {
    it('creates rectangle from position and size', () => {
      const r = new Rectangle(10, 20, 100, 50)
      expect(r.x).toBe(10)
      expect(r.y).toBe(20)
      expect(r.width).toBe(100)
      expect(r.height).toBe(50)
    })

    it('normalizes negative dimensions', () => {
      const r = new Rectangle(100, 50, -50, -30)
      expect(r.x).toBe(50)
      expect(r.y).toBe(20)
      expect(r.width).toBe(50)
      expect(r.height).toBe(30)
    })

    it('rect() factory creates Rectangle', () => {
      const r = rect(0, 0, 100, 50)
      expect(r).toBeInstanceOf(Rectangle)
    })

    it('rectFromCenter() creates from center and size', () => {
      const r = rectFromCenter(point(50, 50), 100, 50)
      expect(r.center.x).toBe(50)
      expect(r.center.y).toBe(50)
      expect(r.width).toBe(100)
    })

    it('rectFromCorners() creates from two corners', () => {
      const r = rectFromCorners(point(0, 0), point(100, 50))
      expect(r.width).toBe(100)
      expect(r.height).toBe(50)
    })

    it('rectFromCorners() handles reversed corners', () => {
      const r = rectFromCorners(point(100, 50), point(0, 0))
      expect(r.x).toBe(0)
      expect(r.y).toBe(0)
      expect(r.width).toBe(100)
    })

    it('square() creates square from center', () => {
      const s = square(point(50, 50), 100)
      expect(s.width).toBe(100)
      expect(s.height).toBe(100)
      expect(s.isSquare).toBe(true)
    })

    it('rectFit() creates bounding rectangle', () => {
      const r = rectFit([point(0, 0), point(100, 50), point(50, 100)])
      expect(r).not.toBeNull()
      expect(r!.x).toBe(0)
      expect(r!.y).toBe(0)
      expect(r!.width).toBe(100)
      expect(r!.height).toBe(100)
    })

    it('rectFit() returns null for empty array', () => {
      expect(rectFit([])).toBeNull()
    })

    it('rectFromBounds() creates from bounds array', () => {
      const r = rectFromBounds([10, 20, 110, 70])
      expect(r.x).toBe(10)
      expect(r.y).toBe(20)
      expect(r.width).toBe(100)
      expect(r.height).toBe(50)
    })
  })

  describe('properties', () => {
    const r = rect(10, 20, 100, 50)

    it('edge properties are correct', () => {
      expect(r.left).toBe(10)
      expect(r.right).toBe(110)
      expect(r.top).toBe(20)
      expect(r.bottom).toBe(70)
    })

    it('area is correct', () => {
      expect(r.area).toBe(5000)
    })

    it('perimeter is correct', () => {
      expect(r.perimeter).toBe(300)
    })

    it('aspectRatio is correct', () => {
      expect(r.aspectRatio).toBe(2)
    })

    it('isSquare detects squares', () => {
      expect(rect(0, 0, 100, 100).isSquare).toBe(true)
      expect(rect(0, 0, 100, 50).isSquare).toBe(false)
    })

    it('isDegenerate detects zero dimensions', () => {
      expect(rect(0, 0, 0, 50).isDegenerate).toBe(true)
      expect(rect(0, 0, 100, 0).isDegenerate).toBe(true)
      expect(rect(0, 0, 100, 50).isDegenerate).toBe(false)
    })
  })

  describe('anchor points', () => {
    const r = rect(0, 0, 100, 50)

    it('center is correct', () => {
      expect(r.center.x).toBe(50)
      expect(r.center.y).toBe(25)
    })

    it('cardinal anchors are at edge centers', () => {
      expect(r.north.x).toBe(50)
      expect(r.north.y).toBe(0)
      expect(r.south.y).toBe(50)
      expect(r.east.x).toBe(100)
      expect(r.west.x).toBe(0)
    })

    it('corner anchors are at corners', () => {
      expect(r.northWest.x).toBe(0)
      expect(r.northWest.y).toBe(0)
      expect(r.southEast.x).toBe(100)
      expect(r.southEast.y).toBe(50)
    })

    it('aliases work correctly', () => {
      expect(r.topLeft).toEqual(r.northWest)
      expect(r.bottomRight).toEqual(r.southEast)
    })

    it('corners returns all four corners', () => {
      const corners = r.corners
      expect(corners).toHaveLength(4)
    })

    it('edges returns all four edges', () => {
      const edges = r.edges
      expect(edges).toHaveLength(4)
    })

    it('anchor() returns the center for "center"', () => {
      expect(r.anchor('center').x).toBe(50)
      expect(r.anchor('center').y).toBe(25)
    })

    it('anchor() uses screen convention (north = visual top, −y)', () => {
      // rect is (0, 0, 100, 50) → center (50, 25), halfW=50, halfH=25.
      // 'north' is the visually-upper edge midpoint (50, 0) — matching
      // Rectangle's `north` getter and TikZ's page semantics.
      expect(r.anchor('north').y).toBe(0)
      expect(r.anchor('south').y).toBe(50)
      expect(r.anchor('east').x).toBe(100)
      expect(r.anchor('west').x).toBe(0)
    })

    it('anchor() returns bounding-box corners for named diagonals', () => {
      // Screen convention: 'north east' = (+halfW, −halfH) from center.
      expect(r.anchor('north east').x).toBe(100)
      expect(r.anchor('north east').y).toBe(0)
      expect(r.anchor('north west').x).toBe(0)
      expect(r.anchor('north west').y).toBe(0)
      expect(r.anchor('south east').x).toBe(100)
      expect(r.anchor('south east').y).toBe(50)
    })

    it('anchor() throws AnchorError for unknown names (strict)', () => {
      // No silent fallback: a typo'd anchor must fail loudly instead of
      // rendering a plausible-looking wrong diagram.
      expect(() => r.anchor('invalid')).toThrowError(/Unknown anchor/)
    })
  })

  describe('point access', () => {
    const r = rect(0, 0, 100, 50)

    it('pointAt() returns relative position', () => {
      expect(r.pointAt(0, 0).x).toBe(0)
      expect(r.pointAt(1, 1).x).toBe(100)
      expect(r.pointAt(0.5, 0.5)).toEqual(r.center)
    })
  })

  describe('geometric operations', () => {
    const r = rect(0, 0, 100, 50)

    it('containsPoint() checks interior', () => {
      expect(r.containsPoint(point(50, 25))).toBe(true)
      expect(r.containsPoint(point(0, 0))).toBe(true) // on boundary
      expect(r.containsPoint(point(150, 25))).toBe(false)
    })

    it('containsPointStrict() excludes boundary', () => {
      expect(r.containsPointStrict(point(50, 25))).toBe(true)
      expect(r.containsPointStrict(point(0, 0))).toBe(false)
    })

    it('containsPointOnBoundary() checks boundary only', () => {
      expect(r.containsPointOnBoundary(point(0, 25))).toBe(true)
      expect(r.containsPointOnBoundary(point(50, 25))).toBe(false)
    })

    it('containsRect() checks rectangle containment', () => {
      expect(r.containsRect(rect(10, 10, 50, 30))).toBe(true)
      expect(r.containsRect(rect(50, 25, 100, 50))).toBe(false)
    })

    it('intersectsRect() checks overlap', () => {
      expect(r.intersectsRect(rect(50, 25, 100, 50))).toBe(true)
      expect(r.intersectsRect(rect(200, 200, 50, 50))).toBe(false)
    })

    it('intersection() returns overlapping region', () => {
      const inter = r.intersection(rect(50, 25, 100, 50))
      expect(inter).not.toBeNull()
      expect(inter!.x).toBe(50)
      expect(inter!.y).toBe(25)
      expect(inter!.width).toBe(50)
      expect(inter!.height).toBe(25)
    })

    it('intersection() returns null for non-overlapping', () => {
      expect(r.intersection(rect(200, 200, 50, 50))).toBeNull()
    })

    it('union() returns bounding box', () => {
      const u = r.union(rect(50, 25, 100, 75))
      expect(u.x).toBe(0)
      expect(u.y).toBe(0)
      expect(u.width).toBe(150)
      expect(u.height).toBe(100)
    })

    it('closestPoint() returns nearest boundary point', () => {
      // Point outside
      const closest1 = r.closestPoint(point(150, 25))
      expect(closest1.x).toBeCloseTo(100)
      expect(closest1.y).toBeCloseTo(25)

      // Point inside
      const closest2 = r.closestPoint(point(5, 25))
      expect(closest2.x).toBeCloseTo(0) // closest to left edge
    })

    it('boundaryPoint() returns point on boundary in direction', () => {
      const bp = r.boundaryPoint(0) // east
      expect(bp.x).toBeCloseTo(100)
      expect(bp.y).toBeCloseTo(25)
    })

    it('boundaryPoint() on a zero-area rectangle returns the center (no NaN)', () => {
      const zero = new Rectangle(50, 50, 0, 0)
      for (const angle of [0, 45, 90, 270]) {
        const bp = zero.boundaryPoint(angle)
        expect(Number.isFinite(bp.x)).toBe(true)
        expect(Number.isFinite(bp.y)).toBe(true)
        expect(bp.x).toBeCloseTo(50)
        expect(bp.y).toBeCloseTo(50)
      }
      // Anchor routing goes through boundaryPoint for cardinal names
      expect(zero.anchor('east').x).toBeCloseTo(50)
      expect(zero.anchor('north').y).toBeCloseTo(50)
    })
  })

  describe('transformations', () => {
    const r = rect(0, 0, 100, 50)

    it('translate() moves rectangle', () => {
      const moved = r.translate(10, 20)
      expect(moved.x).toBe(10)
      expect(moved.y).toBe(20)
    })

    it('scale() scales around center', () => {
      const scaled = r.scale(2)
      expect(scaled.width).toBe(200)
      expect(scaled.center.x).toBe(r.center.x)
    })

    it('scale() with two factors', () => {
      const scaled = r.scale(2, 3)
      expect(scaled.width).toBe(200)
      expect(scaled.height).toBe(150)
    })

    it('scaleAround() scales from point', () => {
      const scaled = r.scaleAround(point(0, 0), 2)
      expect(scaled.x).toBe(0)
      expect(scaled.width).toBe(200)
    })

    it('expand() adds padding', () => {
      const expanded = r.expand(10)
      expect(expanded.x).toBe(-10)
      expect(expanded.width).toBe(120)
    })

    it('expand() with horizontal and vertical', () => {
      const expanded = r.expand(10, 5)
      expect(expanded.width).toBe(120)
      expect(expanded.height).toBe(60)
    })

    it('shrink() removes padding', () => {
      const shrunk = r.shrink(10)
      expect(shrunk.x).toBe(10)
      expect(shrunk.width).toBe(80)
    })
  })

  describe('bounds and equality', () => {
    it('bounds returns correct array', () => {
      const r = rect(10, 20, 100, 50)
      expect(r.bounds).toEqual([10, 20, 110, 70])
    })

    it('equals compares rectangles', () => {
      const r1 = rect(0, 0, 100, 50)
      const r2 = rect(0, 0, 100, 50)
      const r3 = rect(0, 0, 100, 51)
      expect(r1.equals(r2)).toBe(true)
      expect(r1.equals(r3)).toBe(false)
    })
  })
})
