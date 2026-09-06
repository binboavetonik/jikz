import { describe, it, expect } from 'vitest'
import {
  Circle,
  circle,
  circleFromCenterAndPoint,
  circleFromDiameter,
  circleThrough,
  circleEnclosing2,
  circleEnclosing3,
} from '../../src/geometry/Circle'
import { point } from '../../src/core/Point'

describe('Circle', () => {
  describe('constructor and factories', () => {
    it('creates a circle from center and radius', () => {
      const c = new Circle({ x: 10, y: 20 }, 5)
      expect(c.center.x).toBe(10)
      expect(c.center.y).toBe(20)
      expect(c.radius).toBe(5)
    })

    it('circle() factory creates a Circle', () => {
      const c = circle(point(0, 0), 10)
      expect(c).toBeInstanceOf(Circle)
      expect(c.radius).toBe(10)
    })

    it('circleFromCenterAndPoint() calculates radius', () => {
      const c = circleFromCenterAndPoint(point(0, 0), point(3, 4))
      expect(c.radius).toBe(5)
    })

    it('circleFromDiameter() uses diameter endpoints', () => {
      const c = circleFromDiameter(point(0, 0), point(10, 0))
      expect(c.center.x).toBe(5)
      expect(c.radius).toBe(5)
    })

    it('circleThrough() creates circumcircle of 3 points', () => {
      // Right triangle at origin
      const c = circleThrough(point(0, 0), point(10, 0), point(0, 10))
      expect(c).not.toBeNull()
      expect(c!.center.x).toBeCloseTo(5)
      expect(c!.center.y).toBeCloseTo(5)
      expect(c!.radius).toBeCloseTo(5 * Math.SQRT2)
    })

    it('circleThrough() returns null for collinear points', () => {
      const c = circleThrough(point(0, 0), point(5, 0), point(10, 0))
      expect(c).toBeNull()
    })

    it('circleEnclosing2() creates diameter circle', () => {
      const c = circleEnclosing2(point(0, 0), point(10, 0))
      expect(c.center.x).toBe(5)
      expect(c.radius).toBe(5)
    })

    it('circleEnclosing3() creates minimum enclosing circle', () => {
      const c = circleEnclosing3(point(0, 0), point(10, 0), point(5, 5))
      expect(c).not.toBeNull()
      // All three points should be on or inside the circle
      expect(c.containsPointInside(point(0, 0))).toBe(true)
      expect(c.containsPointInside(point(10, 0))).toBe(true)
      expect(c.containsPointInside(point(5, 5))).toBe(true)
    })
  })

  describe('properties', () => {
    it('diameter is 2 * radius', () => {
      expect(circle(point(0, 0), 5).diameter).toBe(10)
    })

    it('circumference is 2 * PI * radius', () => {
      expect(circle(point(0, 0), 1).circumference).toBeCloseTo(2 * Math.PI)
    })

    it('area is PI * radius^2', () => {
      expect(circle(point(0, 0), 1).area).toBeCloseTo(Math.PI)
    })

    it('isDegenerate detects zero radius', () => {
      expect(circle(point(0, 0), 0).isDegenerate).toBe(true)
      expect(circle(point(0, 0), 1).isDegenerate).toBe(false)
    })
  })

  describe('point access', () => {
    const c = circle(point(0, 0), 10)

    it('pointAt() returns point at angle', () => {
      const p0 = c.pointAt(0)
      expect(p0.x).toBeCloseTo(10)
      expect(p0.y).toBeCloseTo(0)

      const p90 = c.pointAt(90)
      expect(p90.x).toBeCloseTo(0)
      expect(p90.y).toBeCloseTo(10)
    })

    it('angleOf() returns angle of point', () => {
      expect(c.angleOf(point(10, 0))).toBeCloseTo(0)
      expect(c.angleOf(point(0, 10))).toBeCloseTo(90)
    })

    it('cardinal points are correct', () => {
      expect(c.north.y).toBeCloseTo(10)
      expect(c.south.y).toBeCloseTo(-10)
      expect(c.east.x).toBeCloseTo(10)
      expect(c.west.x).toBeCloseTo(-10)
    })

    it('diagonal points are correct', () => {
      const diag = 10 * Math.cos(Math.PI / 4)
      expect(c.northeast.x).toBeCloseTo(diag)
      expect(c.northeast.y).toBeCloseTo(diag)
    })
  })

  describe('geometric operations', () => {
    const c = circle(point(0, 0), 10)

    it('containsPoint() checks if on circle boundary', () => {
      expect(c.containsPoint(point(10, 0))).toBe(true)
      expect(c.containsPoint(point(0, 10))).toBe(true)
      expect(c.containsPoint(point(5, 0))).toBe(false)
    })

    it('containsPointInside() checks if inside or on boundary', () => {
      expect(c.containsPointInside(point(10, 0))).toBe(true)
      expect(c.containsPointInside(point(5, 0))).toBe(true)
      expect(c.containsPointInside(point(15, 0))).toBe(false)
    })

    it('distanceToPoint() returns signed distance', () => {
      expect(c.distanceToPoint(point(15, 0))).toBeCloseTo(5)
      expect(c.distanceToPoint(point(5, 0))).toBeCloseTo(-5)
      expect(c.distanceToPoint(point(10, 0))).toBeCloseTo(0)
    })

    it('closestPoint() returns nearest point on circle', () => {
      const closest = c.closestPoint(point(20, 0))
      expect(closest.x).toBeCloseTo(10)
      expect(closest.y).toBeCloseTo(0)
    })

    it('closestPoint() handles center point', () => {
      const closest = c.closestPoint(point(0, 0))
      expect(closest.x).toBeCloseTo(10) // defaults to east
    })

    it('tangentsFrom() returns two points for external point', () => {
      const tangents = c.tangentsFrom(point(20, 0))
      expect(tangents).toHaveLength(2)
    })

    it('tangentsFrom() returns one point for point on circle', () => {
      const tangents = c.tangentsFrom(point(10, 0))
      expect(tangents).toHaveLength(1)
    })

    it('tangentsFrom() returns empty for internal point', () => {
      const tangents = c.tangentsFrom(point(5, 0))
      expect(tangents).toHaveLength(0)
    })
  })

  describe('transformations', () => {
    const c = circle(point(0, 0), 10)

    it('translate() moves circle', () => {
      const moved = c.translate(5, 5)
      expect(moved.center.x).toBe(5)
      expect(moved.center.y).toBe(5)
      expect(moved.radius).toBe(10)
    })

    it('scale() scales radius', () => {
      const scaled = c.scale(2)
      expect(scaled.radius).toBe(20)
    })

    it('scaleAround() scales from point', () => {
      const scaled = c.scaleAround(point(10, 0), 2)
      expect(scaled.center.x).toBeCloseTo(-10)
      expect(scaled.radius).toBe(20)
    })
  })

  describe('bounds', () => {
    it('returns correct bounding box', () => {
      const c = circle(point(10, 20), 5)
      const [minX, minY, maxX, maxY] = c.bounds
      expect(minX).toBe(5)
      expect(minY).toBe(15)
      expect(maxX).toBe(15)
      expect(maxY).toBe(25)
    })
  })

  describe('equals', () => {
    it('compares circles correctly', () => {
      const c1 = circle(point(0, 0), 10)
      const c2 = circle(point(0, 0), 10)
      const c3 = circle(point(1, 0), 10)
      expect(c1.equals(c2)).toBe(true)
      expect(c1.equals(c3)).toBe(false)
    })
  })
})
