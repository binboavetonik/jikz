import { describe, it, expect } from 'vitest'
import { Point, point, polar, origin } from '../../src/core/Point'
import { EPSILON } from '../../src/utils/math'

describe('Point', () => {
  describe('constructor and factory', () => {
    it('creates a point with x and y coordinates', () => {
      const p = new Point(3, 4)
      expect(p.x).toBe(3)
      expect(p.y).toBe(4)
    })

    it('point() factory creates a Point', () => {
      const p = point(3, 4)
      expect(p).toBeInstanceOf(Point)
      expect(p.x).toBe(3)
      expect(p.y).toBe(4)
    })

    it('origin is (0, 0)', () => {
      expect(origin.x).toBe(0)
      expect(origin.y).toBe(0)
    })
  })

  describe('polar()', () => {
    it('creates a point from polar coordinates', () => {
      const p = polar(0, 10)
      expect(p.x).toBeCloseTo(10)
      expect(p.y).toBeCloseTo(0)
    })

    it('handles 90 degrees', () => {
      const p = polar(90, 10)
      expect(p.x).toBeCloseTo(0)
      expect(p.y).toBeCloseTo(10)
    })

    it('handles 45 degrees', () => {
      const p = polar(45, Math.SQRT2)
      expect(p.x).toBeCloseTo(1)
      expect(p.y).toBeCloseTo(1)
    })

    it('supports radians unit option', () => {
      const p = polar(Math.PI / 2, 10, { unit: 'rad' })
      expect(p.x).toBeCloseTo(0)
      expect(p.y).toBeCloseTo(10)
    })
  })

  describe('basic operations', () => {
    it('add() with Point', () => {
      const a = point(1, 2)
      const b = point(3, 4)
      const c = a.add(b)
      expect(c.x).toBe(4)
      expect(c.y).toBe(6)
    })

    it('add() with coordinates', () => {
      const a = point(1, 2)
      const c = a.add(3, 4)
      expect(c.x).toBe(4)
      expect(c.y).toBe(6)
    })

    it('sub() with Point', () => {
      const a = point(5, 7)
      const b = point(2, 3)
      const c = a.sub(b)
      expect(c.x).toBe(3)
      expect(c.y).toBe(4)
    })

    it('sub() with coordinates', () => {
      const a = point(5, 7)
      const c = a.sub(2, 3)
      expect(c.x).toBe(3)
      expect(c.y).toBe(4)
    })

    it('scale() uniform', () => {
      const p = point(3, 4).scale(2)
      expect(p.x).toBe(6)
      expect(p.y).toBe(8)
    })

    it('scale() non-uniform', () => {
      const p = point(3, 4).scale(2, 3)
      expect(p.x).toBe(6)
      expect(p.y).toBe(12)
    })

    it('neg() negates coordinates', () => {
      const p = point(3, -4).neg()
      expect(p.x).toBe(-3)
      expect(p.y).toBe(4)
    })
  })

  describe('properties', () => {
    it('length is distance from origin', () => {
      expect(point(3, 4).length).toBe(5)
      expect(point(0, 0).length).toBe(0)
      expect(point(1, 0).length).toBe(1)
    })

    it('angle is in degrees', () => {
      expect(point(1, 0).angle).toBeCloseTo(0)
      expect(point(0, 1).angle).toBeCloseTo(90)
      expect(point(-1, 0).angle).toBeCloseTo(180)
      expect(point(0, -1).angle).toBeCloseTo(270)
      expect(point(1, 1).angle).toBeCloseTo(45)
    })

    it('normalize() returns unit vector', () => {
      const p = point(3, 4).normalize()
      expect(p.length).toBeCloseTo(1)
      expect(p.x).toBeCloseTo(0.6)
      expect(p.y).toBeCloseTo(0.8)
    })

    it('normalize() handles zero vector', () => {
      const p = point(0, 0).normalize()
      expect(p.x).toBe(0)
      expect(p.y).toBe(0)
    })
  })

  describe('relations', () => {
    it('distanceTo() calculates distance', () => {
      const a = point(0, 0)
      const b = point(3, 4)
      expect(a.distanceTo(b)).toBe(5)
    })

    it('angleTo() calculates angle in degrees', () => {
      const a = point(0, 0)
      expect(a.angleTo(point(1, 0))).toBeCloseTo(0)
      expect(a.angleTo(point(0, 1))).toBeCloseTo(90)
      expect(a.angleTo(point(-1, 0))).toBeCloseTo(180)
      expect(a.angleTo(point(0, -1))).toBeCloseTo(270)
    })

    it('equals() compares with epsilon', () => {
      const a = point(1, 2)
      const b = point(1 + EPSILON / 2, 2 - EPSILON / 2)
      const c = point(1.1, 2)
      expect(a.equals(b)).toBe(true)
      expect(a.equals(c)).toBe(false)
    })
  })

  describe('TikZ features', () => {
    it('toward() interpolates between points', () => {
      const a = point(0, 0)
      const b = point(10, 0)
      expect(a.toward(b, 0).x).toBe(0)
      expect(a.toward(b, 1).x).toBe(10)
      expect(a.toward(b, 0.5).x).toBe(5)
      expect(a.toward(b, 0.25).x).toBe(2.5)
    })

    it('towardByDistance() moves by fixed distance', () => {
      const a = point(0, 0)
      const b = point(10, 0)
      expect(a.towardByDistance(b, 3).x).toBeCloseTo(3)
      expect(a.towardByDistance(b, 10).x).toBeCloseTo(10)
    })

    it('towardByDistance() handles same point', () => {
      const a = point(5, 5)
      const result = a.towardByDistance(a, 10)
      expect(result.x).toBe(5)
      expect(result.y).toBe(5)
    })

    it('midpoint() returns halfway point', () => {
      const a = point(0, 0)
      const b = point(10, 10)
      const mid = a.midpoint(b)
      expect(mid.x).toBe(5)
      expect(mid.y).toBe(5)
    })

    it('project() projects onto a line', () => {
      const p = point(5, 5)
      const lineStart = point(0, 0)
      const lineEnd = point(10, 0)
      const proj = p.project(lineStart, lineEnd)
      expect(proj.x).toBeCloseTo(5)
      expect(proj.y).toBeCloseTo(0)
    })

    it('project() handles degenerate line', () => {
      const p = point(5, 5)
      const linePoint = point(2, 3)
      const proj = p.project(linePoint, linePoint)
      expect(proj.x).toBe(2)
      expect(proj.y).toBe(3)
    })

    it('horAt() returns point with x from this, y from other (TikZ |-)', () => {
      const a = point(10, 20)
      const b = point(30, 40)
      const c = a.horAt(b)
      expect(c.x).toBe(10)
      expect(c.y).toBe(40)
    })

    it('verAt() returns point with x from other, y from this (TikZ -|)', () => {
      const a = point(10, 20)
      const b = point(30, 40)
      const c = a.verAt(b)
      expect(c.x).toBe(30)
      expect(c.y).toBe(20)
    })
  })

  describe('transforms', () => {
    it('rotate() rotates around origin', () => {
      const p = point(1, 0)
      const r90 = p.rotate(90)
      expect(r90.x).toBeCloseTo(0)
      expect(r90.y).toBeCloseTo(1)

      const r180 = p.rotate(180)
      expect(r180.x).toBeCloseTo(-1)
      expect(r180.y).toBeCloseTo(0)
    })

    it('rotate() supports radians', () => {
      const p = point(1, 0)
      const rotated = p.rotate(Math.PI / 2, { unit: 'rad' })
      expect(rotated.x).toBeCloseTo(0)
      expect(rotated.y).toBeCloseTo(1)
    })

    it('rotateAround() rotates around a center', () => {
      const p = point(2, 0)
      const center = point(1, 0)
      const rotated = p.rotateAround(center, 90)
      expect(rotated.x).toBeCloseTo(1)
      expect(rotated.y).toBeCloseTo(1)
    })

    it('reflect() reflects across a line', () => {
      const p = point(1, 1)
      const lineStart = point(0, 0)
      const lineEnd = point(10, 0)
      const reflected = p.reflect(lineStart, lineEnd)
      expect(reflected.x).toBeCloseTo(1)
      expect(reflected.y).toBeCloseTo(-1)
    })

    it('transform() applies a matrix', () => {
      const p = point(1, 0)
      // 90 degree rotation matrix
      const cos = 0
      const sin = 1
      const matrix: readonly [number, number, number, number, number, number] = [
        cos,
        sin,
        -sin,
        cos,
        0,
        0,
      ]
      const transformed = p.transform(matrix)
      expect(transformed.x).toBeCloseTo(0)
      expect(transformed.y).toBeCloseTo(1)
    })
  })

  describe('utilities', () => {
    it('toObject() returns plain object', () => {
      const obj = point(3, 4).toObject()
      expect(obj).toEqual({ x: 3, y: 4 })
    })

    it('toArray() returns tuple', () => {
      const arr = point(3, 4).toArray()
      expect(arr).toEqual([3, 4])
    })

    it('toString() returns formatted string', () => {
      expect(point(3, 4).toString()).toBe('(3, 4)')
    })
  })

  describe('immutability', () => {
    it('all operations return new Point instances', () => {
      const original = point(1, 2)
      const added = original.add(1, 1)
      const scaled = original.scale(2)
      const rotated = original.rotate(90)

      expect(original.x).toBe(1)
      expect(original.y).toBe(2)
      expect(added).not.toBe(original)
      expect(scaled).not.toBe(original)
      expect(rotated).not.toBe(original)
    })
  })

  describe('chainability', () => {
    it('operations can be chained', () => {
      const result = point(0, 0)
        .add(10, 0)
        .rotate(90)
        .scale(2)
        .add(5, 5)

      expect(result.x).toBeCloseTo(5)
      expect(result.y).toBeCloseTo(25)
    })
  })
})
