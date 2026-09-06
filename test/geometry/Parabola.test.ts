import { describe, it, expect } from 'vitest'
import { point } from '../../src/core/Point'
import {
  Parabola,
  parabola,
  parabolaFromFocus,
  parabolaThrough,
  parabolaBend,
  parabolaFromCoefficient,
} from '../../src/geometry/Parabola'

describe('Parabola', () => {
  describe('constructor', () => {
    it('creates a parabola with vertex and focal length', () => {
      const p = new Parabola({ x: 0, y: 0 }, 2)
      expect(p.vertex.x).toBe(0)
      expect(p.vertex.y).toBe(0)
      expect(p.focalLength).toBe(2)
      expect(p.rotation).toBe(0)
    })

    it('accepts rotation angle', () => {
      const p = parabola({ x: 0, y: 0 }, 2, 90)
      expect(p.rotation).toBe(90)
    })
  })

  describe('properties', () => {
    it('calculates focus correctly', () => {
      // Upward-opening parabola with p=2: focus at (0, 2)
      const p = parabola({ x: 0, y: 0 }, 2, 0)
      expect(p.focus.x).toBeCloseTo(0)
      expect(p.focus.y).toBeCloseTo(2)
    })

    it('calculates focus for rotated parabola', () => {
      // Right-opening parabola (rotation=90) with p=2: focus at (2, 0)
      const p = parabola({ x: 0, y: 0 }, 2, 90)
      expect(p.focus.x).toBeCloseTo(2)
      expect(p.focus.y).toBeCloseTo(0)
    })

    it('calculates directrix point correctly', () => {
      const p = parabola({ x: 0, y: 0 }, 2, 0)
      expect(p.directrixPoint.x).toBeCloseTo(0)
      expect(p.directrixPoint.y).toBeCloseTo(-2)
    })

    it('calculates coefficient correctly', () => {
      // a = 1/(4p)
      const p = parabola({ x: 0, y: 0 }, 2, 0)
      expect(p.coefficient).toBeCloseTo(1/8)
    })

    it('calculates latus rectum correctly', () => {
      const p = parabola({ x: 0, y: 0 }, 2, 0)
      expect(p.latusRectum).toBe(8)
    })
  })

  describe('pointAtX', () => {
    it('returns vertex at x=0', () => {
      const p = parabola({ x: 0, y: 0 }, 2, 0)
      const pt = p.pointAtX(0)
      expect(pt.x).toBeCloseTo(0)
      expect(pt.y).toBeCloseTo(0)
    })

    it('returns correct point for x=2', () => {
      // y = x²/(4p) = 4/(4*2) = 0.5
      const p = parabola({ x: 0, y: 0 }, 2, 0)
      const pt = p.pointAtX(2)
      expect(pt.x).toBeCloseTo(2)
      expect(pt.y).toBeCloseTo(0.5)
    })
  })

  describe('pointAtT', () => {
    it('returns vertex at t=0', () => {
      const p = parabola({ x: 0, y: 0 }, 2, 0)
      const pt = p.pointAtT(0)
      expect(pt.x).toBeCloseTo(0)
      expect(pt.y).toBeCloseTo(0)
    })

    it('returns correct point for t=1', () => {
      // x = 2pt = 4, y = pt² = 2
      const p = parabola({ x: 0, y: 0 }, 2, 0)
      const pt = p.pointAtT(1)
      expect(pt.x).toBeCloseTo(4)
      expect(pt.y).toBeCloseTo(2)
    })
  })

  describe('getPoints', () => {
    it('returns array of points', () => {
      const p = parabola({ x: 0, y: 0 }, 2, 0)
      const points = p.getPoints(-2, 2, 10)
      expect(points.length).toBe(11)
    })
  })

  describe('containsPoint', () => {
    it('returns true for points on the parabola', () => {
      const p = parabola({ x: 0, y: 0 }, 2, 0)

      // vertex
      expect(p.containsPoint({ x: 0, y: 0 })).toBe(true)

      // y = x²/(4*2) = x²/8
      expect(p.containsPoint({ x: 4, y: 2 })).toBe(true)
    })

    it('returns false for points not on the parabola', () => {
      const p = parabola({ x: 0, y: 0 }, 2, 0)
      expect(p.containsPoint({ x: 1, y: 1 })).toBe(false)
    })
  })

  describe('transforms', () => {
    it('translate moves the vertex', () => {
      const p = parabola({ x: 0, y: 0 }, 2, 0)
      const moved = p.translate(10, 20)
      expect(moved.vertex.x).toBe(10)
      expect(moved.vertex.y).toBe(20)
    })

    it('scale changes the focal length', () => {
      const p = parabola({ x: 0, y: 0 }, 2, 0)
      const scaled = p.scale(2)
      expect(scaled.focalLength).toBe(4)
    })

    it('rotate changes the rotation', () => {
      const p = parabola({ x: 0, y: 0 }, 2, 0)
      const rotated = p.rotate(45)
      expect(rotated.rotation).toBe(45)
    })
  })

  describe('toSVGPath', () => {
    it('generates valid SVG path', () => {
      const p = parabola({ x: 0, y: 0 }, 2, 0)
      const path = p.toSVGPath(-2, 2, 10)

      expect(path).toContain('M')
      expect(path).toContain('L')
    })
  })

  describe('tangentAtT', () => {
    it('returns horizontal tangent at vertex', () => {
      const p = parabola({ x: 0, y: 0 }, 2, 0)
      const tangent = p.tangentAtT(0)

      // At t=0, tangent should be horizontal (along x-axis) for upward parabola
      expect(tangent.y).toBeCloseTo(0)
      expect(Math.abs(tangent.x)).toBeCloseTo(1)
    })
  })
})

describe('factory functions', () => {
  describe('parabola', () => {
    it('creates a parabola', () => {
      const p = parabola({ x: 0, y: 0 }, 2)
      expect(p).toBeInstanceOf(Parabola)
    })
  })

  describe('parabolaFromFocus', () => {
    it('creates parabola from vertex and focus', () => {
      const p = parabolaFromFocus({ x: 0, y: 0 }, { x: 0, y: 2 })
      expect(p.focalLength).toBeCloseTo(2)
      expect(p.focus.x).toBeCloseTo(0)
      expect(p.focus.y).toBeCloseTo(2)
    })

    it('calculates correct rotation for horizontal focus', () => {
      const p = parabolaFromFocus({ x: 0, y: 0 }, { x: 2, y: 0 })
      expect(p.focus.x).toBeCloseTo(2)
      expect(p.focus.y).toBeCloseTo(0)
    })
  })

  describe('parabolaThrough', () => {
    it('creates parabola through three points', () => {
      // y = x² passes through (0,0), (1,1), (-1,1)
      const p = parabolaThrough({ x: 0, y: 0 }, { x: 1, y: 1 }, { x: -1, y: 1 })
      expect(p).not.toBeNull()
      if (p) {
        expect(p.vertex.x).toBeCloseTo(0)
        expect(p.vertex.y).toBeCloseTo(0)
      }
    })

    it('returns null for collinear points', () => {
      const p = parabolaThrough({ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 })
      expect(p).toBeNull()
    })
  })

  describe('parabolaBend (TikZ style)', () => {
    it('creates parabola from start, bend, and end', () => {
      const p = parabolaBend({ x: 0, y: 0 }, { x: 1, y: 2 }, { x: 2, y: 0 })
      expect(p).not.toBeNull()
    })
  })

  describe('parabolaFromCoefficient', () => {
    it('creates y = ax² parabola', () => {
      // y = 0.5x² means a = 0.5, so p = 1/(4*0.5) = 0.5
      const p = parabolaFromCoefficient(0.5)
      expect(p.coefficient).toBeCloseTo(0.5)
    })

    it('handles negative coefficient (opens down)', () => {
      const p = parabolaFromCoefficient(-1)
      expect(p.rotation).toBe(180)
    })
  })
})
