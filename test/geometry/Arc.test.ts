import { describe, it, expect } from 'vitest'
import { Arc, arc, arcThrough, arcFromBulge, arcFromRadius } from '../../src/geometry/Arc'
import { point } from '../../src/core/Point'

describe('Arc', () => {
  describe('constructor and factories', () => {
    it('creates an arc from center, radius, and angles', () => {
      const a = new Arc({ x: 0, y: 0 }, 10, 0, 90, false)
      expect(a.center.x).toBe(0)
      expect(a.radius).toBe(10)
      expect(a.startAngle).toBe(0)
      expect(a.endAngle).toBe(90)
      expect(a.clockwise).toBe(false)
    })

    it('arc() factory creates an Arc', () => {
      const a = arc(point(0, 0), 10, 0, 90)
      expect(a).toBeInstanceOf(Arc)
    })

    it('arcThrough() creates arc through 3 points', () => {
      const a = arcThrough(point(10, 0), point(0, 10), point(-10, 0))
      expect(a).not.toBeNull()
      expect(a!.containsPoint(point(10, 0))).toBe(true)
      expect(a!.containsPoint(point(0, 10))).toBe(true)
      expect(a!.containsPoint(point(-10, 0))).toBe(true)
    })

    it('arcThrough() returns null for collinear points', () => {
      const a = arcThrough(point(0, 0), point(5, 0), point(10, 0))
      expect(a).toBeNull()
    })

    it('arcFromRadius() creates arc with specified radius', () => {
      const a = arcFromRadius(point(0, 0), point(10, 0), 10)
      expect(a).not.toBeNull()
      expect(a!.start.x).toBeCloseTo(0)
      expect(a!.end.x).toBeCloseTo(10)
    })

    it('arcFromRadius() returns null for impossible arc', () => {
      const a = arcFromRadius(point(0, 0), point(100, 0), 10)
      expect(a).toBeNull()
    })
  })

  describe('properties', () => {
    it('start and end points are correct', () => {
      const a = arc(point(0, 0), 10, 0, 90)
      expect(a.start.x).toBeCloseTo(10)
      expect(a.start.y).toBeCloseTo(0)
      expect(a.end.x).toBeCloseTo(0)
      expect(a.end.y).toBeCloseTo(10)
    })

    it('midpoint is at t=0.5', () => {
      const a = arc(point(0, 0), 10, 0, 90)
      const mid = a.midpoint
      expect(mid.x).toBeCloseTo(10 * Math.cos(Math.PI / 4))
      expect(mid.y).toBeCloseTo(10 * Math.sin(Math.PI / 4))
    })

    it('sweep calculates correct angle span (CCW)', () => {
      expect(arc(point(0, 0), 10, 0, 90).sweep).toBeCloseTo(90)
      expect(arc(point(0, 0), 10, 0, 270).sweep).toBeCloseTo(270)
      expect(arc(point(0, 0), 10, 270, 90).sweep).toBeCloseTo(180)
    })

    it('sweep calculates correct angle span (CW)', () => {
      expect(arc(point(0, 0), 10, 90, 0, true).sweep).toBeCloseTo(90)
      expect(arc(point(0, 0), 10, 0, 270, true).sweep).toBeCloseTo(90)
    })

    it('length is correct', () => {
      const a = arc(point(0, 0), 10, 0, 90)
      expect(a.length).toBeCloseTo((Math.PI * 10) / 2) // quarter circumference
    })

    it('isFullCircle detects 360 degree arc', () => {
      expect(arc(point(0, 0), 10, 0, 0).isFullCircle).toBe(true)
      expect(arc(point(0, 0), 10, 0, 90).isFullCircle).toBe(false)
    })

    it('circle returns the parent circle', () => {
      const a = arc(point(5, 5), 10, 0, 90)
      expect(a.circle.center.x).toBe(5)
      expect(a.circle.radius).toBe(10)
    })
  })

  describe('point access', () => {
    it('pointAt() interpolates along arc', () => {
      const a = arc(point(0, 0), 10, 0, 90)
      expect(a.pointAt(0).x).toBeCloseTo(10)
      expect(a.pointAt(1).y).toBeCloseTo(10)
    })

    it('angleAt() returns angle at parameter', () => {
      const a = arc(point(0, 0), 10, 0, 90)
      expect(a.angleAt(0)).toBeCloseTo(0)
      expect(a.angleAt(1)).toBeCloseTo(90)
      expect(a.angleAt(0.5)).toBeCloseTo(45)
    })

    it('parameterOfAngle() returns t for angle on arc', () => {
      const a = arc(point(0, 0), 10, 0, 90)
      expect(a.parameterOfAngle(0)).toBeCloseTo(0)
      expect(a.parameterOfAngle(90)).toBeCloseTo(1)
      expect(a.parameterOfAngle(45)).toBeCloseTo(0.5)
    })

    it('parameterOfAngle() returns null for angle not on arc', () => {
      const a = arc(point(0, 0), 10, 0, 90)
      expect(a.parameterOfAngle(180)).toBeNull()
    })
  })

  describe('geometric operations', () => {
    it('containsAngle() checks if angle is within sweep', () => {
      const a = arc(point(0, 0), 10, 0, 90)
      expect(a.containsAngle(45)).toBe(true)
      expect(a.containsAngle(180)).toBe(false)
    })

    it('containsPoint() checks if point is on arc', () => {
      const a = arc(point(0, 0), 10, 0, 90)
      expect(a.containsPoint(a.pointAt(0.5))).toBe(true)
      expect(a.containsPoint(point(-10, 0))).toBe(false) // on circle but not arc
    })

    it('closestPoint() returns nearest point on arc', () => {
      const a = arc(point(0, 0), 10, 0, 90)
      // Point that projects onto the arc
      const closest1 = a.closestPoint(point(20, 0))
      expect(closest1.x).toBeCloseTo(10)
      expect(closest1.y).toBeCloseTo(0)
    })

    it('reverse() swaps direction', () => {
      const a = arc(point(0, 0), 10, 0, 90, false)
      const reversed = a.reverse()
      expect(reversed.startAngle).toBe(90)
      expect(reversed.endAngle).toBe(0)
      expect(reversed.clockwise).toBe(true)
    })

    it('split() divides arc at parameter', () => {
      const a = arc(point(0, 0), 10, 0, 90)
      const [first, second] = a.split(0.5)
      expect(first.startAngle).toBe(0)
      expect(first.endAngle).toBeCloseTo(45)
      expect(second.startAngle).toBeCloseTo(45)
      expect(second.endAngle).toBe(90)
    })

    it('subArc() extracts portion of arc', () => {
      const a = arc(point(0, 0), 10, 0, 90)
      const sub = a.subArc(0.25, 0.75)
      expect(sub.startAngle).toBeCloseTo(22.5)
      expect(sub.endAngle).toBeCloseTo(67.5)
    })
  })

  describe('bounds', () => {
    it('returns correct bounding box for quarter arc', () => {
      const a = arc(point(0, 0), 10, 0, 90)
      const [minX, minY, maxX, maxY] = a.bounds
      expect(minX).toBeCloseTo(0)
      expect(minY).toBeCloseTo(0)
      expect(maxX).toBeCloseTo(10)
      expect(maxY).toBeCloseTo(10)
    })

    it('includes cardinal points when crossed', () => {
      const a = arc(point(0, 0), 10, 45, 135)
      const [minX, minY, maxX, maxY] = a.bounds
      expect(maxY).toBeCloseTo(10) // crosses north
    })
  })

  describe('toSVGPath', () => {
    it('generates valid SVG path data', () => {
      const a = arc(point(0, 0), 10, 0, 90)
      const path = a.toSVGPath()
      expect(path).toContain('M')
      expect(path).toContain('A')
      expect(path).toContain('10') // radius
    })
  })
})
