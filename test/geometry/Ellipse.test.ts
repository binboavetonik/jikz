import { describe, it, expect } from 'vitest'
import { point } from '../../src/core/Point'
import {
  Ellipse,
  ellipse,
  ellipseFromAxes,
  ellipseFromFoci,
  ellipseInRect,
} from '../../src/geometry/Ellipse'

describe('Ellipse', () => {
  describe('constructor', () => {
    it('creates an ellipse with center and semi-axes', () => {
      const e = new Ellipse({ x: 100, y: 100 }, 50, 30)
      expect(e.center.x).toBe(100)
      expect(e.center.y).toBe(100)
      expect(e.a).toBe(50)
      expect(e.b).toBe(30)
      expect(e.rotation).toBe(0)
    })

    it('takes absolute value of radii', () => {
      const e = ellipse({ x: 0, y: 0 }, -50, -30)
      expect(e.a).toBe(50)
      expect(e.b).toBe(30)
    })

    it('accepts rotation angle', () => {
      const e = ellipse({ x: 0, y: 0 }, 50, 30, 45)
      expect(e.rotation).toBe(45)
    })
  })

  describe('properties', () => {
    it('isCircle returns true when a equals b', () => {
      const circle = ellipse({ x: 0, y: 0 }, 50, 50)
      const notCircle = ellipse({ x: 0, y: 0 }, 50, 30)
      expect(circle.isCircle).toBe(true)
      expect(notCircle.isCircle).toBe(false)
    })

    it('calculates eccentricity correctly', () => {
      // Circle has eccentricity 0
      const circle = ellipse({ x: 0, y: 0 }, 50, 50)
      expect(circle.eccentricity).toBeCloseTo(0)

      // Elongated ellipse has eccentricity approaching 1
      const elongated = ellipse({ x: 0, y: 0 }, 100, 10)
      expect(elongated.eccentricity).toBeGreaterThan(0.9)
    })

    it('calculates area correctly', () => {
      const e = ellipse({ x: 0, y: 0 }, 10, 5)
      expect(e.area).toBeCloseTo(Math.PI * 10 * 5)
    })

    it('calculates foci correctly', () => {
      const e = ellipse({ x: 0, y: 0 }, 5, 3)
      const [f1, f2] = e.foci

      // For a=5, b=3: c = sqrt(25-9) = 4
      // Foci should be at (-4, 0) and (4, 0) for horizontal major axis
      expect(f1.distanceTo({ x: 0, y: 0 })).toBeCloseTo(4)
      expect(f2.distanceTo({ x: 0, y: 0 })).toBeCloseTo(4)
    })
  })

  describe('pointAt', () => {
    it('returns correct cardinal points', () => {
      const e = ellipse({ x: 100, y: 100 }, 50, 30)

      expect(e.east.x).toBeCloseTo(150)
      expect(e.east.y).toBeCloseTo(100)

      expect(e.west.x).toBeCloseTo(50)
      expect(e.west.y).toBeCloseTo(100)

      expect(e.north.x).toBeCloseTo(100)
      expect(e.north.y).toBeCloseTo(130)

      expect(e.south.x).toBeCloseTo(100)
      expect(e.south.y).toBeCloseTo(70)
    })

    it('returns points on rotated ellipse', () => {
      const e = ellipse({ x: 0, y: 0 }, 50, 30, 90)

      // After 90° rotation, east becomes north direction
      const eastPoint = e.pointAt(0)
      expect(eastPoint.x).toBeCloseTo(0)
      expect(eastPoint.y).toBeCloseTo(50)
    })
  })

  describe('containsPoint', () => {
    it('returns true for points on the ellipse', () => {
      const e = ellipse({ x: 0, y: 0 }, 50, 30)

      expect(e.containsPoint({ x: 50, y: 0 })).toBe(true)
      expect(e.containsPoint({ x: 0, y: 30 })).toBe(true)
      expect(e.containsPoint({ x: -50, y: 0 })).toBe(true)
    })

    it('returns false for points not on the ellipse', () => {
      const e = ellipse({ x: 0, y: 0 }, 50, 30)

      expect(e.containsPoint({ x: 0, y: 0 })).toBe(false)
      expect(e.containsPoint({ x: 100, y: 0 })).toBe(false)
    })
  })

  describe('containsPointInside', () => {
    it('returns true for points inside', () => {
      const e = ellipse({ x: 0, y: 0 }, 50, 30)
      expect(e.containsPointInside({ x: 0, y: 0 })).toBe(true)
      expect(e.containsPointInside({ x: 25, y: 10 })).toBe(true)
    })

    it('returns false for points outside', () => {
      const e = ellipse({ x: 0, y: 0 }, 50, 30)
      expect(e.containsPointInside({ x: 100, y: 0 })).toBe(false)
    })
  })

  describe('transforms', () => {
    it('translate moves the center', () => {
      const e = ellipse({ x: 0, y: 0 }, 50, 30)
      const moved = e.translate(10, 20)
      expect(moved.center.x).toBe(10)
      expect(moved.center.y).toBe(20)
      expect(moved.a).toBe(50)
    })

    it('scale changes the radii', () => {
      const e = ellipse({ x: 0, y: 0 }, 50, 30)
      const scaled = e.scale(2)
      expect(scaled.a).toBe(100)
      expect(scaled.b).toBe(60)
    })

    it('rotate changes the rotation', () => {
      const e = ellipse({ x: 0, y: 0 }, 50, 30, 0)
      const rotated = e.rotate(45)
      expect(rotated.rotation).toBe(45)
    })
  })

  describe('toSVGPath', () => {
    it('generates valid SVG path', () => {
      const e = ellipse({ x: 100, y: 100 }, 50, 30)
      const path = e.toSVGPath()

      expect(path).toContain('M')
      expect(path).toContain('A')
      expect(path).toContain('Z')
    })
  })

  describe('bounds', () => {
    it('calculates bounds for axis-aligned ellipse', () => {
      const e = ellipse({ x: 100, y: 100 }, 50, 30)
      const [minX, minY, maxX, maxY] = e.bounds

      expect(minX).toBe(50)
      expect(minY).toBe(70)
      expect(maxX).toBe(150)
      expect(maxY).toBe(130)
    })
  })
})

describe('factory functions', () => {
  describe('ellipse', () => {
    it('creates an ellipse', () => {
      const e = ellipse({ x: 0, y: 0 }, 50, 30)
      expect(e).toBeInstanceOf(Ellipse)
    })
  })

  describe('ellipseFromAxes', () => {
    it('creates ellipse from center and axis endpoints', () => {
      const center = point(0, 0)
      const majorEnd = point(50, 0)  // a = 50
      const minorEnd = point(0, 30)  // b = 30

      const e = ellipseFromAxes(center, majorEnd, minorEnd)
      expect(e.a).toBeCloseTo(50)
      expect(e.b).toBeCloseTo(30)
    })
  })

  describe('ellipseFromFoci', () => {
    it('creates ellipse from foci and point on ellipse', () => {
      // For an ellipse with a=5, b=3, c=4
      // Foci at (-4, 0) and (4, 0)
      const f1 = point(-4, 0)
      const f2 = point(4, 0)
      const p = point(5, 0)  // Point on ellipse at (a, 0)

      const e = ellipseFromFoci(f1, f2, p)
      expect(e.center.x).toBeCloseTo(0)
      expect(e.center.y).toBeCloseTo(0)
      expect(e.a).toBeCloseTo(5)
      expect(e.b).toBeCloseTo(3)
    })
  })

  describe('ellipseInRect', () => {
    it('creates ellipse inscribed in rectangle', () => {
      const e = ellipseInRect(0, 0, 100, 60)
      expect(e.center.x).toBe(50)
      expect(e.center.y).toBe(30)
      expect(e.a).toBe(50)
      expect(e.b).toBe(30)
    })
  })
})
