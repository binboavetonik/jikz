import { Point, point } from '../core/Point'

/**
 * Options for function plotting
 */
export interface PlotOptions {
  /** Domain [xMin, xMax] */
  domain: [number, number]
  /** Number of sample points */
  samples?: number
  /** Y-axis limits [yMin, yMax] - points outside are clipped */
  range?: [number, number]
  /** Whether to close the path (for area plots) */
  closed?: boolean
  /** Scale factor for x coordinates */
  xScale?: number
  /** Scale factor for y coordinates */
  yScale?: number
  /** Offset for x coordinates */
  xOffset?: number
  /** Offset for y coordinates */
  yOffset?: number
}

/**
 * Options for parametric plotting
 */
export interface ParametricPlotOptions {
  /** Parameter range [tMin, tMax] */
  domain: [number, number]
  /** Number of sample points */
  samples?: number
  /** Scale factor for both coordinates */
  scale?: number
  /** Offset for x coordinates */
  xOffset?: number
  /** Offset for y coordinates */
  yOffset?: number
}

/**
 * Options for polar plotting
 */
export interface PolarPlotOptions {
  /** Angle range in degrees [angleMin, angleMax] */
  domain?: [number, number]
  /** Number of sample points */
  samples?: number
  /** Center point */
  center?: { x: number; y: number }
  /** Scale factor for radius */
  scale?: number
}

/**
 * A plot is a series of points representing a mathematical function
 */
export class Plot {
  readonly points: Point[]
  readonly closed: boolean

  constructor(points: Point[], closed = false) {
    this.points = points
    this.closed = closed
  }

  /**
   * Get the number of points
   */
  get length(): number {
    return this.points.length
  }

  /**
   * Check if plot is empty
   */
  get isEmpty(): boolean {
    return this.points.length === 0
  }

  /**
   * Get bounding box
   */
  get bounds(): [number, number, number, number] {
    if (this.points.length === 0) {
      return [0, 0, 0, 0]
    }

    let minX = Infinity, minY = Infinity
    let maxX = -Infinity, maxY = -Infinity

    for (const p of this.points) {
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x)
      maxY = Math.max(maxY, p.y)
    }

    return [minX, minY, maxX, maxY]
  }

  /**
   * Translate all points
   */
  translate(dx: number, dy: number): Plot {
    return new Plot(
      this.points.map(p => p.add(dx, dy)),
      this.closed
    )
  }

  /**
   * Scale all points around origin
   */
  scale(factor: number): Plot {
    return new Plot(
      this.points.map(p => p.scale(factor)),
      this.closed
    )
  }

  /**
   * Scale with different x and y factors
   */
  scaleXY(sx: number, sy: number): Plot {
    return new Plot(
      this.points.map(p => point(p.x * sx, p.y * sy)),
      this.closed
    )
  }

  /**
   * Flip Y coordinates (useful for SVG where Y increases downward)
   */
  flipY(yAxis = 0): Plot {
    return new Plot(
      this.points.map(p => point(p.x, 2 * yAxis - p.y)),
      this.closed
    )
  }

  /**
   * Generate SVG path data
   */
  toSVGPath(): string {
    if (this.points.length === 0) return ''

    let path = `M ${this.points[0]!.x} ${this.points[0]!.y}`

    for (let i = 1; i < this.points.length; i++) {
      const p = this.points[i]!
      path += ` L ${p.x} ${p.y}`
    }

    if (this.closed) {
      path += ' Z'
    }

    return path
  }

  /**
   * Generate smooth SVG path using Catmull-Rom splines
   */
  toSVGPathSmooth(tension = 0.5): string {
    if (this.points.length < 2) return this.toSVGPath()

    const pts = this.points

    let path = `M ${pts[0]!.x} ${pts[0]!.y}`

    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)]!
      const p1 = pts[i]!
      const p2 = pts[i + 1]!
      const p3 = pts[Math.min(pts.length - 1, i + 2)]!

      // Catmull-Rom to Bezier conversion
      const cp1x = p1.x + (p2.x - p0.x) / 6 * tension
      const cp1y = p1.y + (p2.y - p0.y) / 6 * tension
      const cp2x = p2.x - (p3.x - p1.x) / 6 * tension
      const cp2y = p2.y - (p3.y - p1.y) / 6 * tension

      path += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`
    }

    if (this.closed) {
      path += ' Z'
    }

    return path
  }

  /**
   * Subsample the plot to reduce point count
   */
  subsample(maxPoints: number): Plot {
    if (this.points.length <= maxPoints) return this

    const step = Math.ceil(this.points.length / maxPoints)
    const newPoints: Point[] = []

    for (let i = 0; i < this.points.length; i += step) {
      newPoints.push(this.points[i]!)
    }

    // Always include last point
    if (newPoints[newPoints.length - 1] !== this.points[this.points.length - 1]) {
      newPoints.push(this.points[this.points.length - 1]!)
    }

    return new Plot(newPoints, this.closed)
  }

  toString(): string {
    return `Plot(${this.points.length} points${this.closed ? ', closed' : ''})`
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Plot a function y = f(x)
 *
 * @example
 * plot(x => Math.sin(x), { domain: [0, 2 * Math.PI] })
 * plot(x => x * x, { domain: [-2, 2], samples: 100 })
 */
export function plot(fn: (x: number) => number, options: PlotOptions): Plot {
  const {
    domain,
    samples = 100,
    range,
    closed = false,
    xScale = 1,
    yScale = 1,
    xOffset = 0,
    yOffset = 0,
  } = options

  const [xMin, xMax] = domain
  const step = (xMax - xMin) / (samples - 1)
  const points: Point[] = []

  for (let i = 0; i < samples; i++) {
    const x = xMin + i * step
    const y = fn(x)

    // Skip NaN, Infinity
    if (!Number.isFinite(y)) continue

    // Clip to range if specified
    if (range) {
      const [yMin, yMax] = range
      if (y < yMin || y > yMax) continue
    }

    points.push(point(
      x * xScale + xOffset,
      y * yScale + yOffset
    ))
  }

  return new Plot(points, closed)
}

/**
 * Plot a parametric curve (x(t), y(t))
 *
 * @example
 * plotParametric(t => [Math.cos(t), Math.sin(t)], { domain: [0, 2 * Math.PI] })
 */
export function plotParametric(
  fn: (t: number) => [number, number],
  options: ParametricPlotOptions
): Plot {
  const {
    domain,
    samples = 100,
    scale = 1,
    xOffset = 0,
    yOffset = 0,
  } = options

  const [tMin, tMax] = domain
  const step = (tMax - tMin) / (samples - 1)
  const points: Point[] = []

  for (let i = 0; i < samples; i++) {
    const t = tMin + i * step
    const [x, y] = fn(t)

    // Skip NaN, Infinity
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue

    points.push(point(
      x * scale + xOffset,
      y * scale + yOffset
    ))
  }

  return new Plot(points)
}

/**
 * Plot a polar curve r = f(theta)
 *
 * @example
 * plotPolar(theta => 2 + Math.cos(theta * 3), { domain: [0, 360] })
 */
export function plotPolar(
  fn: (theta: number) => number,
  options: PolarPlotOptions = {}
): Plot {
  const {
    domain = [0, 360],
    samples = 100,
    center = { x: 0, y: 0 },
    scale = 1,
  } = options

  const [thetaMin, thetaMax] = domain
  const step = (thetaMax - thetaMin) / (samples - 1)
  const points: Point[] = []

  for (let i = 0; i < samples; i++) {
    const thetaDeg = thetaMin + i * step
    const thetaRad = (thetaDeg * Math.PI) / 180
    const r = fn(thetaDeg)

    // Skip NaN, Infinity, negative radius
    if (!Number.isFinite(r)) continue

    const x = r * scale * Math.cos(thetaRad) + center.x
    const y = r * scale * Math.sin(thetaRad) + center.y

    points.push(point(x, y))
  }

  return new Plot(points)
}

/**
 * Create a plot from an array of coordinates
 */
export function plotFromCoords(coords: [number, number][], closed = false): Plot {
  return new Plot(coords.map(([x, y]) => point(x, y)), closed)
}

/**
 * Create a plot from an array of points
 */
export function plotFromPoints(points: Point[], closed = false): Plot {
  return new Plot([...points], closed)
}

// ─────────────────────────────────────────────────────────────────────────────
// Common Functions (for convenience)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Plot a sine wave
 */
export function plotSin(options: Omit<PlotOptions, 'domain'> & { domain?: [number, number] } = {}): Plot {
  return plot(Math.sin, {
    domain: [0, 2 * Math.PI],
    samples: 100,
    ...options,
  })
}

/**
 * Plot a cosine wave
 */
export function plotCos(options: Omit<PlotOptions, 'domain'> & { domain?: [number, number] } = {}): Plot {
  return plot(Math.cos, {
    domain: [0, 2 * Math.PI],
    samples: 100,
    ...options,
  })
}

/**
 * Plot a polynomial: a₀ + a₁x + a₂x² + ...
 */
export function plotPolynomial(coefficients: number[], options: PlotOptions): Plot {
  return plot(
    x => coefficients.reduce((sum, coef, i) => sum + coef * Math.pow(x, i), 0),
    options
  )
}

/**
 * Plot an exponential: a * e^(bx)
 */
export function plotExp(a = 1, b = 1, options: PlotOptions): Plot {
  return plot(x => a * Math.exp(b * x), options)
}

/**
 * Plot a Gaussian/normal distribution curve
 */
export function plotGaussian(
  mean = 0,
  stdDev = 1,
  options: Omit<PlotOptions, 'domain'> & { domain?: [number, number] } = {}
): Plot {
  const sigma2 = stdDev * stdDev
  const coef = 1 / Math.sqrt(2 * Math.PI * sigma2)

  return plot(
    x => coef * Math.exp(-((x - mean) * (x - mean)) / (2 * sigma2)),
    {
      domain: [mean - 4 * stdDev, mean + 4 * stdDev],
      samples: 100,
      ...options,
    }
  )
}

/**
 * Plot a circle (parametric)
 */
export function plotCircle(
  radius = 1,
  center: { x: number; y: number } = { x: 0, y: 0 },
  samples = 64
): Plot {
  const pts = plotParametric(
    t => [radius * Math.cos(t), radius * Math.sin(t)],
    { domain: [0, 2 * Math.PI], samples, xOffset: center.x, yOffset: center.y }
  )
  return new Plot(pts.points, true)
}

/**
 * Plot a Lissajous curve
 */
export function plotLissajous(
  a: number,
  b: number,
  delta = 0,
  options: Omit<ParametricPlotOptions, 'domain'> & { domain?: [number, number] } = {}
): Plot {
  return plotParametric(
    t => [Math.sin(a * t + delta), Math.sin(b * t)],
    { domain: [0, 2 * Math.PI], samples: 200, ...options }
  )
}

/**
 * Plot a spiral (Archimedean)
 */
export function plotSpiral(
  a = 1,
  b = 0.5,
  turns = 3,
  center: { x: number; y: number } = { x: 0, y: 0 }
): Plot {
  return plotPolar(
    theta => a + b * (theta / 360),
    { domain: [0, turns * 360], samples: turns * 60, center }
  )
}

/**
 * Plot a rose curve: r = cos(n * theta)
 */
export function plotRose(
  n: number,
  scale = 1,
  center: { x: number; y: number } = { x: 0, y: 0 }
): Plot {
  // n petals for odd n, 2n petals for even n
  const maxTheta = n % 2 === 0 ? 360 : 180
  return plotPolar(
    theta => Math.cos(n * theta * Math.PI / 180),
    { domain: [0, maxTheta], samples: n * 60, center, scale }
  )
}

/**
 * Plot a cardioid: r = a(1 + cos(theta))
 */
export function plotCardioid(
  a = 1,
  center: { x: number; y: number } = { x: 0, y: 0 }
): Plot {
  return plotPolar(
    theta => a * (1 + Math.cos(theta * Math.PI / 180)),
    { domain: [0, 360], samples: 100, center }
  )
}
