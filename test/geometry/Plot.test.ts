import { describe, it, expect } from 'vitest'
import { point } from '../../src/core/Point'
import {
  Plot,
  plot,
  plotParametric,
  plotPolar,
  plotFromCoords,
  plotFromPoints,
  plotSin,
  plotCos,
  plotPolynomial,
  plotExp,
  plotGaussian,
  plotCircle,
  plotLissajous,
  plotSpiral,
  plotRose,
  plotCardioid,
} from '../../src/geometry/Plot'

describe('Plot', () => {
  describe('constructor', () => {
    it('creates a plot from points', () => {
      const pts = [point(0, 0), point(1, 1), point(2, 0)]
      const p = new Plot(pts)
      expect(p.length).toBe(3)
      expect(p.closed).toBe(false)
    })

    it('creates a closed plot', () => {
      const pts = [point(0, 0), point(1, 1), point(2, 0)]
      const p = new Plot(pts, true)
      expect(p.closed).toBe(true)
    })
  })

  describe('properties', () => {
    it('calculates bounds correctly', () => {
      const pts = [point(0, 0), point(10, 5), point(5, 10)]
      const p = new Plot(pts)
      const [minX, minY, maxX, maxY] = p.bounds

      expect(minX).toBe(0)
      expect(minY).toBe(0)
      expect(maxX).toBe(10)
      expect(maxY).toBe(10)
    })

    it('isEmpty returns true for empty plot', () => {
      const p = new Plot([])
      expect(p.isEmpty).toBe(true)
    })
  })

  describe('transforms', () => {
    it('translate moves all points', () => {
      const p = new Plot([point(0, 0), point(1, 1)])
      const moved = p.translate(10, 20)
      expect(moved.points[0]!.x).toBe(10)
      expect(moved.points[0]!.y).toBe(20)
    })

    it('scale multiplies coordinates', () => {
      const p = new Plot([point(1, 2), point(3, 4)])
      const scaled = p.scale(2)
      expect(scaled.points[0]!.x).toBe(2)
      expect(scaled.points[0]!.y).toBe(4)
    })

    it('scaleXY applies different factors', () => {
      const p = new Plot([point(1, 2)])
      const scaled = p.scaleXY(2, 3)
      expect(scaled.points[0]!.x).toBe(2)
      expect(scaled.points[0]!.y).toBe(6)
    })

    it('flipY mirrors around axis', () => {
      const p = new Plot([point(0, 10), point(0, 20)])
      const flipped = p.flipY(0)
      expect(flipped.points[0]!.y).toBe(-10)
      expect(flipped.points[1]!.y).toBe(-20)
    })
  })

  describe('toSVGPath', () => {
    it('generates valid SVG path', () => {
      const p = new Plot([point(0, 0), point(10, 10), point(20, 0)])
      const path = p.toSVGPath()

      expect(path).toContain('M 0 0')
      expect(path).toContain('L 10 10')
      expect(path).toContain('L 20 0')
    })

    it('adds Z for closed plots', () => {
      const p = new Plot([point(0, 0), point(10, 10), point(20, 0)], true)
      const path = p.toSVGPath()
      expect(path).toContain('Z')
    })
  })

  describe('toSVGPathSmooth', () => {
    it('generates smooth path with curves', () => {
      const p = new Plot([point(0, 0), point(10, 10), point(20, 0), point(30, 10)])
      const path = p.toSVGPathSmooth()

      expect(path).toContain('M')
      expect(path).toContain('C')  // Cubic bezier
    })
  })

  describe('subsample', () => {
    it('reduces point count', () => {
      const pts = Array.from({ length: 100 }, (_, i) => point(i, i))
      const p = new Plot(pts)
      const subsampled = p.subsample(10)

      expect(subsampled.length).toBeLessThanOrEqual(12)  // ~10 + possible last point
    })

    it('preserves plot if already small enough', () => {
      const p = new Plot([point(0, 0), point(1, 1)])
      const subsampled = p.subsample(10)
      expect(subsampled.length).toBe(2)
    })
  })
})

describe('plot function', () => {
  it('plots y = x', () => {
    const p = plot(x => x, { domain: [0, 10], samples: 11 })
    expect(p.length).toBe(11)
    expect(p.points[0]!.x).toBeCloseTo(0)
    expect(p.points[0]!.y).toBeCloseTo(0)
    expect(p.points[10]!.x).toBeCloseTo(10)
    expect(p.points[10]!.y).toBeCloseTo(10)
  })

  it('plots y = x²', () => {
    const p = plot(x => x * x, { domain: [-2, 2], samples: 5 })
    expect(p.length).toBe(5)

    // Check midpoint (x=0, y=0)
    expect(p.points[2]!.x).toBeCloseTo(0)
    expect(p.points[2]!.y).toBeCloseTo(0)
  })

  it('plots sin function', () => {
    const p = plot(Math.sin, { domain: [0, Math.PI], samples: 5 })
    expect(p.length).toBe(5)

    // sin(π/2) = 1
    expect(p.points[2]!.y).toBeCloseTo(1)
  })

  it('applies scale and offset', () => {
    const p = plot(x => x, {
      domain: [0, 1],
      samples: 2,
      xScale: 100,
      yScale: 50,
      xOffset: 10,
      yOffset: 20,
    })

    expect(p.points[0]!.x).toBeCloseTo(10)  // 0 * 100 + 10
    expect(p.points[0]!.y).toBeCloseTo(20)  // 0 * 50 + 20
    expect(p.points[1]!.x).toBeCloseTo(110) // 1 * 100 + 10
    expect(p.points[1]!.y).toBeCloseTo(70)  // 1 * 50 + 20
  })

  it('clips to range', () => {
    const p = plot(x => x * 10, { domain: [0, 10], samples: 11, range: [0, 50] })
    // Should skip points where y > 50 (x > 5)
    expect(p.length).toBe(6)  // x = 0, 1, 2, 3, 4, 5
  })

  it('skips NaN values', () => {
    const p = plot(x => x < 0 ? NaN : x, { domain: [-1, 1], samples: 3 })
    // Only x=0 and x=1 should produce valid points
    expect(p.length).toBe(2)
  })
})

describe('plotParametric', () => {
  it('plots a circle', () => {
    const p = plotParametric(
      t => [Math.cos(t), Math.sin(t)],
      { domain: [0, 2 * Math.PI], samples: 5 }
    )

    expect(p.length).toBe(5)
    expect(p.points[0]!.x).toBeCloseTo(1)
    expect(p.points[0]!.y).toBeCloseTo(0)
  })

  it('applies scale and offset', () => {
    const p = plotParametric(
      t => [t, t],
      { domain: [0, 1], samples: 2, scale: 10, xOffset: 5, yOffset: 5 }
    )

    expect(p.points[1]!.x).toBeCloseTo(15)  // 1 * 10 + 5
    expect(p.points[1]!.y).toBeCloseTo(15)
  })
})

describe('plotPolar', () => {
  it('plots a circle', () => {
    const p = plotPolar(theta => 50, { domain: [0, 360], samples: 5 })
    expect(p.length).toBe(5)

    // All points should be at distance 50 from origin
    for (const pt of p.points) {
      expect(Math.sqrt(pt.x * pt.x + pt.y * pt.y)).toBeCloseTo(50)
    }
  })

  it('respects center', () => {
    const p = plotPolar(theta => 10, { domain: [0, 360], samples: 4, center: { x: 100, y: 100 } })

    // Points should be around center (100, 100)
    for (const pt of p.points) {
      const dist = Math.sqrt((pt.x - 100) ** 2 + (pt.y - 100) ** 2)
      expect(dist).toBeCloseTo(10)
    }
  })
})

describe('convenience functions', () => {
  describe('plotSin', () => {
    it('creates a sine wave', () => {
      const p = plotSin({ samples: 50 })
      expect(p.length).toBe(50)

      // Check peak around π/2
      const peakIndex = Math.floor(50 * 0.25)
      expect(p.points[peakIndex]!.y).toBeCloseTo(1, 1)
    })
  })

  describe('plotCos', () => {
    it('creates a cosine wave', () => {
      const p = plotCos({ samples: 50 })
      expect(p.length).toBe(50)

      // Starts at y=1
      expect(p.points[0]!.y).toBeCloseTo(1)
    })
  })

  describe('plotPolynomial', () => {
    it('plots y = 1 + 2x + 3x²', () => {
      const p = plotPolynomial([1, 2, 3], { domain: [0, 1], samples: 2 })

      // At x=0: y = 1
      expect(p.points[0]!.y).toBeCloseTo(1)

      // At x=1: y = 1 + 2 + 3 = 6
      expect(p.points[1]!.y).toBeCloseTo(6)
    })
  })

  describe('plotExp', () => {
    it('plots exponential function', () => {
      const p = plotExp(1, 1, { domain: [0, 1], samples: 2 })

      // At x=0: y = e^0 = 1
      expect(p.points[0]!.y).toBeCloseTo(1)

      // At x=1: y = e^1 ≈ 2.718
      expect(p.points[1]!.y).toBeCloseTo(Math.E)
    })
  })

  describe('plotGaussian', () => {
    it('creates a bell curve', () => {
      const p = plotGaussian(0, 1, { samples: 50 })
      expect(p.length).toBe(50)

      // Peak should be at mean (center of samples)
      const peakIndex = Math.floor(50 / 2)
      const peakY = p.points[peakIndex]!.y

      // Tails should be lower
      expect(p.points[0]!.y).toBeLessThan(peakY)
      expect(p.points[49]!.y).toBeLessThan(peakY)
    })
  })

  describe('plotCircle', () => {
    it('creates a closed circular plot', () => {
      const p = plotCircle(50, { x: 0, y: 0 }, 8)
      expect(p.closed).toBe(true)
      expect(p.length).toBe(8)
    })
  })

  describe('plotLissajous', () => {
    it('creates a Lissajous curve', () => {
      const p = plotLissajous(3, 2)
      expect(p.length).toBeGreaterThan(0)
    })
  })

  describe('plotSpiral', () => {
    it('creates a spiral', () => {
      const p = plotSpiral(1, 0.5, 2)
      expect(p.length).toBeGreaterThan(0)
    })
  })

  describe('plotRose', () => {
    it('creates a rose curve', () => {
      const p = plotRose(5, 50)
      expect(p.length).toBeGreaterThan(0)
    })
  })

  describe('plotCardioid', () => {
    it('creates a cardioid', () => {
      const p = plotCardioid(50)
      expect(p.length).toBe(100)
    })
  })
})

describe('plotFromCoords', () => {
  it('creates plot from coordinate pairs', () => {
    const p = plotFromCoords([[0, 0], [10, 10], [20, 0]])
    expect(p.length).toBe(3)
    expect(p.points[1]!.x).toBe(10)
  })
})

describe('plotFromPoints', () => {
  it('creates plot from point array', () => {
    const pts = [point(0, 0), point(10, 10)]
    const p = plotFromPoints(pts)
    expect(p.length).toBe(2)
  })
})
