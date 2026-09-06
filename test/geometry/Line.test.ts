import { describe, it, expect } from 'vitest'
import { Line, line, lineFromAngle, horizontalLine, verticalLine } from '../../src/geometry/Line'
import { point } from '../../src/core/Point'

describe('Line', () => {
  describe('constructor and factories', () => {
    it('creates a line from two points', () => {
      const l = new Line({ x: 0, y: 0 }, { x: 10, y: 0 })
      expect(l.start.x).toBe(0)
      expect(l.end.x).toBe(10)
    })

    it('line() factory creates a Line', () => {
      const l = line(point(0, 0), point(10, 10))
      expect(l).toBeInstanceOf(Line)
    })

    it('lineFromAngle() creates from angle and length', () => {
      const l = lineFromAngle({ x: 0, y: 0 }, 0, 10)
      expect(l.end.x).toBeCloseTo(10)
      expect(l.end.y).toBeCloseTo(0)
    })

    it('lineFromAngle() handles 45 degrees', () => {
      const l = lineFromAngle({ x: 0, y: 0 }, 45, Math.SQRT2)
      expect(l.end.x).toBeCloseTo(1)
      expect(l.end.y).toBeCloseTo(1)
    })

    it('horizontalLine() creates horizontal line', () => {
      const l = horizontalLine({ x: 50, y: 25 }, 100)
      expect(l.start.x).toBe(0)
      expect(l.end.x).toBe(100)
      expect(l.start.y).toBe(25)
      expect(l.end.y).toBe(25)
    })

    it('verticalLine() creates vertical line', () => {
      const l = verticalLine({ x: 25, y: 50 }, 100)
      expect(l.start.y).toBe(0)
      expect(l.end.y).toBe(100)
      expect(l.start.x).toBe(25)
      expect(l.end.x).toBe(25)
    })
  })

  describe('properties', () => {
    it('direction is end - start', () => {
      const l = line(point(0, 0), point(10, 5))
      expect(l.direction.x).toBe(10)
      expect(l.direction.y).toBe(5)
    })

    it('unitDirection has length 1', () => {
      const l = line(point(0, 0), point(10, 0))
      expect(l.unitDirection.length).toBeCloseTo(1)
      expect(l.unitDirection.x).toBeCloseTo(1)
    })

    it('normal is perpendicular to direction', () => {
      const l = line(point(0, 0), point(10, 0))
      expect(l.normal.x).toBeCloseTo(0)
      expect(l.normal.y).toBeCloseTo(10)
    })

    it('length is correct', () => {
      const l = line(point(0, 0), point(3, 4))
      expect(l.length).toBe(5)
    })

    it('angle is correct', () => {
      expect(line(point(0, 0), point(10, 0)).angle).toBeCloseTo(0)
      expect(line(point(0, 0), point(0, 10)).angle).toBeCloseTo(90)
      expect(line(point(0, 0), point(-10, 0)).angle).toBeCloseTo(180)
    })

    it('midpoint is halfway', () => {
      const l = line(point(0, 0), point(10, 10))
      expect(l.midpoint.x).toBe(5)
      expect(l.midpoint.y).toBe(5)
    })

    it('isDegenerate detects zero-length lines', () => {
      expect(line(point(5, 5), point(5, 5)).isDegenerate).toBe(true)
      expect(line(point(0, 0), point(1, 0)).isDegenerate).toBe(false)
    })
  })

  describe('parametric access', () => {
    it('at(t) interpolates along line', () => {
      const l = line(point(0, 0), point(10, 0))
      expect(l.at(0).x).toBe(0)
      expect(l.at(1).x).toBe(10)
      expect(l.at(0.5).x).toBe(5)
      expect(l.at(2).x).toBe(20) // extends beyond
    })

    it('atDistance() returns point at fixed distance', () => {
      const l = line(point(0, 0), point(10, 0))
      expect(l.atDistance(5).x).toBeCloseTo(5)
    })

    it('parameterOf() returns t for point on line', () => {
      const l = line(point(0, 0), point(10, 0))
      expect(l.parameterOf(point(5, 0))).toBeCloseTo(0.5)
      expect(l.parameterOf(point(0, 0))).toBeCloseTo(0)
      expect(l.parameterOf(point(10, 0))).toBeCloseTo(1)
    })

    it('parameterOf() returns null for point not on line', () => {
      const l = line(point(0, 0), point(10, 0))
      expect(l.parameterOf(point(5, 5))).toBeNull()
    })
  })

  describe('geometric operations', () => {
    it('projectPoint() projects onto infinite line', () => {
      const l = line(point(0, 0), point(10, 0))
      const projected = l.projectPoint(point(5, 10))
      expect(projected.x).toBeCloseTo(5)
      expect(projected.y).toBeCloseTo(0)
    })

    it('distanceToPoint() returns perpendicular distance', () => {
      const l = line(point(0, 0), point(10, 0))
      expect(l.distanceToPoint(point(5, 10))).toBeCloseTo(10)
    })

    it('distanceToPointSegment() returns distance to segment', () => {
      const l = line(point(0, 0), point(10, 0))
      // Point projects onto segment
      expect(l.distanceToPointSegment(point(5, 10))).toBeCloseTo(10)
      // Point projects outside segment
      expect(l.distanceToPointSegment(point(-5, 0))).toBeCloseTo(5)
    })

    it('containsPoint() checks if on infinite line', () => {
      const l = line(point(0, 0), point(10, 0))
      expect(l.containsPoint(point(5, 0))).toBe(true)
      expect(l.containsPoint(point(20, 0))).toBe(true) // extended
      expect(l.containsPoint(point(5, 1))).toBe(false)
    })

    it('containsPointSegment() checks if on segment', () => {
      const l = line(point(0, 0), point(10, 0))
      expect(l.containsPointSegment(point(5, 0))).toBe(true)
      expect(l.containsPointSegment(point(20, 0))).toBe(false)
    })

    it('perpendicularThrough() creates perpendicular line', () => {
      const l = line(point(0, 0), point(10, 0))
      const perp = l.perpendicularThrough(point(5, 5))
      expect(l.isPerpendicularTo(perp)).toBe(true)
    })

    it('perpendicularBisector() bisects the segment', () => {
      const l = line(point(0, 0), point(10, 0))
      const bisector = l.perpendicularBisector()
      expect(bisector.containsPoint(l.midpoint)).toBe(true)
      expect(l.isPerpendicularTo(bisector)).toBe(true)
    })

    it('parallel() creates parallel line at offset', () => {
      const l = line(point(0, 0), point(10, 0))
      const p = l.parallel(5)
      expect(l.isParallelTo(p)).toBe(true)
      expect(p.start.y).toBeCloseTo(5)
    })

    it('extend() extends line at both ends', () => {
      const l = line(point(0, 0), point(10, 0))
      const extended = l.extend(5, 10)
      expect(extended.start.x).toBeCloseTo(-5)
      expect(extended.end.x).toBeCloseTo(20)
    })

    it('reverse() swaps start and end', () => {
      const l = line(point(0, 0), point(10, 0))
      const reversed = l.reverse()
      expect(reversed.start.x).toBe(10)
      expect(reversed.end.x).toBe(0)
    })

    it('isParallelTo() detects parallel lines', () => {
      const l1 = line(point(0, 0), point(10, 0))
      const l2 = line(point(0, 5), point(10, 5))
      const l3 = line(point(0, 0), point(10, 10))
      expect(l1.isParallelTo(l2)).toBe(true)
      expect(l1.isParallelTo(l3)).toBe(false)
    })

    it('isPerpendicularTo() detects perpendicular lines', () => {
      const l1 = line(point(0, 0), point(10, 0))
      const l2 = line(point(0, 0), point(0, 10))
      const l3 = line(point(0, 0), point(10, 10))
      expect(l1.isPerpendicularTo(l2)).toBe(true)
      expect(l1.isPerpendicularTo(l3)).toBe(false)
    })
  })

  describe('bounds', () => {
    it('returns correct bounding box', () => {
      const l = line(point(5, 10), point(15, 30))
      const [minX, minY, maxX, maxY] = l.bounds
      expect(minX).toBe(5)
      expect(minY).toBe(10)
      expect(maxX).toBe(15)
      expect(maxY).toBe(30)
    })
  })
})
