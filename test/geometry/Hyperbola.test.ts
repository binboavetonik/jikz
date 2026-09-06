import { describe, it, expect } from 'vitest'
import { point } from '../../src/core/Point'
import {
  Hyperbola,
  hyperbola,
  hyperbolaFromFoci,
  hyperbolaFromFociAndPoint,
  hyperbolaFromEccentricity,
  rectangularHyperbola,
  hyperbolaFromAsymptote,
} from '../../src/geometry/Hyperbola'

describe('Hyperbola', () => {
  describe('constructor', () => {
    it('creates a hyperbola with center and semi-axes', () => {
      const h = new Hyperbola({ x: 0, y: 0 }, 3, 4)
      expect(h.center.x).toBe(0)
      expect(h.center.y).toBe(0)
      expect(h.a).toBe(3)
      expect(h.b).toBe(4)
      expect(h.rotation).toBe(0)
    })

    it('accepts rotation angle', () => {
      const h = hyperbola({ x: 0, y: 0 }, 3, 4, 45)
      expect(h.rotation).toBe(45)
    })

    it('takes absolute value of axes', () => {
      const h = hyperbola({ x: 0, y: 0 }, -3, -4)
      expect(h.a).toBe(3)
      expect(h.b).toBe(4)
    })
  })

  describe('properties', () => {
    it('calculates focal distance c correctly', () => {
      // c² = a² + b² = 9 + 16 = 25, so c = 5
      const h = hyperbola({ x: 0, y: 0 }, 3, 4)
      expect(h.c).toBeCloseTo(5)
    })

    it('calculates eccentricity correctly', () => {
      // e = c/a = 5/3
      const h = hyperbola({ x: 0, y: 0 }, 3, 4)
      expect(h.eccentricity).toBeCloseTo(5 / 3)
    })

    it('eccentricity is always > 1', () => {
      const h = hyperbola({ x: 0, y: 0 }, 5, 1)
      expect(h.eccentricity).toBeGreaterThan(1)
    })

    it('calculates foci correctly', () => {
      const h = hyperbola({ x: 0, y: 0 }, 3, 4)
      const [f1, f2] = h.foci

      // Foci at (±5, 0) for horizontal hyperbola
      expect(f1.x).toBeCloseTo(-5)
      expect(f1.y).toBeCloseTo(0)
      expect(f2.x).toBeCloseTo(5)
      expect(f2.y).toBeCloseTo(0)
    })

    it('calculates foci for rotated hyperbola', () => {
      const h = hyperbola({ x: 0, y: 0 }, 3, 4, 90)
      const [f1, f2] = h.foci

      // Rotated 90°: foci at (0, ±5)
      expect(f1.x).toBeCloseTo(0)
      expect(f1.y).toBeCloseTo(-5)
      expect(f2.x).toBeCloseTo(0)
      expect(f2.y).toBeCloseTo(5)
    })

    it('calculates vertices correctly', () => {
      const h = hyperbola({ x: 0, y: 0 }, 3, 4)
      const [v1, v2] = h.vertices

      expect(v1.x).toBeCloseTo(-3)
      expect(v1.y).toBeCloseTo(0)
      expect(v2.x).toBeCloseTo(3)
      expect(v2.y).toBeCloseTo(0)
    })

    it('calculates asymptote slope correctly', () => {
      const h = hyperbola({ x: 0, y: 0 }, 3, 4)
      expect(h.asymptoteSlope).toBeCloseTo(4 / 3)
    })
  })

  describe('pointAtT', () => {
    it('returns vertex at t=0 on right branch', () => {
      const h = hyperbola({ x: 0, y: 0 }, 3, 4)
      const pt = h.pointAtT(0, 1)

      // cosh(0) = 1, sinh(0) = 0
      // x = 3 * 1 = 3, y = 4 * 0 = 0
      expect(pt.x).toBeCloseTo(3)
      expect(pt.y).toBeCloseTo(0)
    })

    it('returns vertex at t=0 on left branch', () => {
      const h = hyperbola({ x: 0, y: 0 }, 3, 4)
      const pt = h.pointAtT(0, -1)

      expect(pt.x).toBeCloseTo(-3)
      expect(pt.y).toBeCloseTo(0)
    })

    it('returns correct point for t=1', () => {
      const h = hyperbola({ x: 0, y: 0 }, 3, 4)
      const pt = h.pointAtT(1, 1)

      // cosh(1) ≈ 1.543, sinh(1) ≈ 1.175
      expect(pt.x).toBeCloseTo(3 * Math.cosh(1))
      expect(pt.y).toBeCloseTo(4 * Math.sinh(1))
    })
  })

  describe('getBranchPoints', () => {
    it('returns array of points for right branch', () => {
      const h = hyperbola({ x: 0, y: 0 }, 3, 4)
      const points = h.getBranchPoints(-2, 2, 1, 10)

      expect(points.length).toBe(11)
      // All x values should be positive for right branch
      for (const p of points) {
        expect(p.x).toBeGreaterThan(0)
      }
    })

    it('returns array of points for left branch', () => {
      const h = hyperbola({ x: 0, y: 0 }, 3, 4)
      const points = h.getBranchPoints(-2, 2, -1, 10)

      expect(points.length).toBe(11)
      // All x values should be negative for left branch
      for (const p of points) {
        expect(p.x).toBeLessThan(0)
      }
    })
  })

  describe('containsPoint', () => {
    it('returns true for points on the hyperbola', () => {
      const h = hyperbola({ x: 0, y: 0 }, 3, 4)

      // Vertex
      expect(h.containsPoint({ x: 3, y: 0 })).toBe(true)
      expect(h.containsPoint({ x: -3, y: 0 })).toBe(true)

      // Check a point using parametric form
      const t = 1
      const px = 3 * Math.cosh(t)
      const py = 4 * Math.sinh(t)
      expect(h.containsPoint({ x: px, y: py })).toBe(true)
    })

    it('returns false for points not on the hyperbola', () => {
      const h = hyperbola({ x: 0, y: 0 }, 3, 4)
      expect(h.containsPoint({ x: 0, y: 0 })).toBe(false)  // Center
      expect(h.containsPoint({ x: 1, y: 1 })).toBe(false)
    })
  })

  describe('containsPointInside', () => {
    it('returns true for points between branches', () => {
      const h = hyperbola({ x: 0, y: 0 }, 3, 4)
      expect(h.containsPointInside({ x: 0, y: 0 })).toBe(true)
      expect(h.containsPointInside({ x: 1, y: 0 })).toBe(true)
    })

    it('returns false for points outside branches', () => {
      const h = hyperbola({ x: 0, y: 0 }, 3, 4)
      expect(h.containsPointInside({ x: 10, y: 0 })).toBe(false)
    })
  })

  describe('transforms', () => {
    it('translate moves the center', () => {
      const h = hyperbola({ x: 0, y: 0 }, 3, 4)
      const moved = h.translate(10, 20)

      expect(moved.center.x).toBe(10)
      expect(moved.center.y).toBe(20)
      expect(moved.a).toBe(3)
      expect(moved.b).toBe(4)
    })

    it('scale changes both axes', () => {
      const h = hyperbola({ x: 0, y: 0 }, 3, 4)
      const scaled = h.scale(2)

      expect(scaled.a).toBe(6)
      expect(scaled.b).toBe(8)
    })

    it('scaleAxes changes axes independently', () => {
      const h = hyperbola({ x: 0, y: 0 }, 3, 4)
      const scaled = h.scaleAxes(2, 3)

      expect(scaled.a).toBe(6)
      expect(scaled.b).toBe(12)
    })

    it('rotate changes the rotation', () => {
      const h = hyperbola({ x: 0, y: 0 }, 3, 4)
      const rotated = h.rotate(45)

      expect(rotated.rotation).toBe(45)
    })
  })

  describe('toSVGPath', () => {
    it('generates path for both branches', () => {
      const h = hyperbola({ x: 0, y: 0 }, 30, 40)
      const path = h.toSVGPath(-2, 2, 10)

      expect(path).toContain('M')
      expect(path).toContain('L')
      // Should have two M commands (one for each branch)
      const mCount = (path.match(/M/g) || []).length
      expect(mCount).toBe(2)
    })

    it('generates path for single branch', () => {
      const h = hyperbola({ x: 0, y: 0 }, 30, 40)
      const path = h.toSVGPathBranch(1, -2, 2, 10)

      expect(path).toContain('M')
      const mCount = (path.match(/M/g) || []).length
      expect(mCount).toBe(1)
    })
  })

  describe('toSVGPathSmooth', () => {
    it('generates smooth path with bezier curves', () => {
      const h = hyperbola({ x: 0, y: 0 }, 30, 40)
      const path = h.toSVGPathSmooth(1, -2, 2, 10)

      expect(path).toContain('M')
      expect(path).toContain('C')  // Cubic bezier
    })
  })

  describe('tangentAtT', () => {
    it('returns vertical tangent at vertex (t=0)', () => {
      const h = hyperbola({ x: 0, y: 0 }, 3, 4)
      const tangent = h.tangentAtT(0, 1)

      // At t=0: dx/dt = 0, dy/dt = b*cosh(0) = b
      // So tangent is vertical (0, 1)
      expect(tangent.x).toBeCloseTo(0)
      expect(Math.abs(tangent.y)).toBeCloseTo(1)
    })
  })

  describe('getAsymptotePoints', () => {
    it('returns four points for asymptote lines', () => {
      const h = hyperbola({ x: 0, y: 0 }, 3, 4)
      const points = h.getAsymptotePoints(100)

      expect(points.length).toBe(4)
    })
  })
})

describe('factory functions', () => {
  describe('hyperbola', () => {
    it('creates a hyperbola', () => {
      const h = hyperbola({ x: 0, y: 0 }, 3, 4)
      expect(h).toBeInstanceOf(Hyperbola)
    })
  })

  describe('hyperbolaFromFoci', () => {
    it('creates hyperbola from foci and transverse axis', () => {
      // Foci at (±5, 0), a = 3
      const h = hyperbolaFromFoci({ x: -5, y: 0 }, { x: 5, y: 0 }, 3)

      expect(h.a).toBeCloseTo(3)
      expect(h.c).toBeCloseTo(5)
      // b² = c² - a² = 25 - 9 = 16, so b = 4
      expect(h.b).toBeCloseTo(4)
    })

    it('throws error if a > c', () => {
      expect(() => {
        hyperbolaFromFoci({ x: -2, y: 0 }, { x: 2, y: 0 }, 5)
      }).toThrow()
    })
  })

  describe('hyperbolaFromFociAndPoint', () => {
    it('creates hyperbola from foci and point on curve', () => {
      // Create hyperbola with a=3, b=4, so c=5
      const original = hyperbola({ x: 0, y: 0 }, 3, 4)
      const [f1, f2] = original.foci
      const pointOnCurve = original.pointAtT(1, 1)

      const h = hyperbolaFromFociAndPoint(f1, f2, pointOnCurve)

      expect(h.a).toBeCloseTo(3)
      expect(h.b).toBeCloseTo(4)
    })
  })

  describe('hyperbolaFromEccentricity', () => {
    it('creates hyperbola from eccentricity', () => {
      // e = 5/3, a = 3
      const h = hyperbolaFromEccentricity({ x: 0, y: 0 }, 3, 5 / 3)

      expect(h.a).toBeCloseTo(3)
      expect(h.eccentricity).toBeCloseTo(5 / 3)
      expect(h.b).toBeCloseTo(4)
    })

    it('throws error if eccentricity <= 1', () => {
      expect(() => {
        hyperbolaFromEccentricity({ x: 0, y: 0 }, 3, 0.5)
      }).toThrow()

      expect(() => {
        hyperbolaFromEccentricity({ x: 0, y: 0 }, 3, 1)
      }).toThrow()
    })
  })

  describe('rectangularHyperbola', () => {
    it('creates hyperbola with a = b', () => {
      const h = rectangularHyperbola({ x: 0, y: 0 }, 5)

      expect(h.a).toBe(5)
      expect(h.b).toBe(5)
      expect(h.asymptoteSlope).toBe(1)
    })
  })

  describe('hyperbolaFromAsymptote', () => {
    it('creates hyperbola with given asymptote angle', () => {
      // 45° asymptote means b/a = tan(45°) = 1, so b = a
      const h = hyperbolaFromAsymptote({ x: 0, y: 0 }, 5, 45)

      expect(h.a).toBe(5)
      expect(h.b).toBeCloseTo(5)
    })

    it('creates hyperbola with 60° asymptote', () => {
      // tan(60°) ≈ 1.732
      const h = hyperbolaFromAsymptote({ x: 0, y: 0 }, 3, 60)

      expect(h.a).toBe(3)
      expect(h.b).toBeCloseTo(3 * Math.tan(Math.PI / 3))
    })
  })
})

describe('equals', () => {
  it('returns true for equal hyperbolas', () => {
    const h1 = hyperbola({ x: 0, y: 0 }, 3, 4, 30)
    const h2 = hyperbola({ x: 0, y: 0 }, 3, 4, 30)

    expect(h1.equals(h2)).toBe(true)
  })

  it('returns false for different hyperbolas', () => {
    const h1 = hyperbola({ x: 0, y: 0 }, 3, 4)
    const h2 = hyperbola({ x: 0, y: 0 }, 4, 3)

    expect(h1.equals(h2)).toBe(false)
  })
})

describe('toString', () => {
  it('returns string representation', () => {
    const h = hyperbola({ x: 10, y: 20 }, 3, 4, 45)
    const str = h.toString()

    expect(str).toContain('Hyperbola')
    expect(str).toContain('a=3')
    expect(str).toContain('b=4')
    expect(str).toContain('45°')
  })
})
