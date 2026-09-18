import { JikzError } from '../core/errors'
import { Point, point } from '../core/Point'
import type { PointLike } from '../core/types'
import { degToRad, EPSILON, approxEqual } from '../utils/math'

/**
 * A hyperbola defined by center, semi-axes, and rotation
 *
 * Standard form: (x²/a²) - (y²/b²) = 1
 * - a is the semi-transverse axis (distance from center to vertex)
 * - b is the semi-conjugate axis (determines asymptote slope)
 * - c is the focal distance where c² = a² + b²
 *
 * The hyperbola has two branches opening left/right (or up/down when rotated 90°)
 */
export class Hyperbola {
  readonly center: Point
  readonly a: number  // Semi-transverse axis (to vertex)
  readonly b: number  // Semi-conjugate axis
  readonly rotation: number  // Rotation in degrees (0 = opens left/right)

  constructor(center: PointLike, a: number, b: number, rotation = 0) {
    this.center = point(center.x, center.y)
    this.a = Math.abs(a)
    this.b = Math.abs(b)
    this.rotation = rotation
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Properties
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Focal distance: c = √(a² + b²)
   */
  get c(): number {
    return Math.sqrt(this.a * this.a + this.b * this.b)
  }

  /**
   * Eccentricity: e = c/a (always > 1 for hyperbola)
   */
  get eccentricity(): number {
    return this.c / this.a
  }

  /**
   * The two foci of the hyperbola
   */
  get foci(): [Point, Point] {
    const c = this.c
    const rotRad = degToRad(this.rotation)
    const cos = Math.cos(rotRad)
    const sin = Math.sin(rotRad)

    // Foci are at (±c, 0) in local coords
    return [
      point(
        this.center.x - c * cos,
        this.center.y - c * sin
      ),
      point(
        this.center.x + c * cos,
        this.center.y + c * sin
      )
    ]
  }

  /**
   * The two vertices (closest points to center on each branch)
   */
  get vertices(): [Point, Point] {
    const rotRad = degToRad(this.rotation)
    const cos = Math.cos(rotRad)
    const sin = Math.sin(rotRad)

    // Vertices are at (±a, 0) in local coords
    return [
      point(
        this.center.x - this.a * cos,
        this.center.y - this.a * sin
      ),
      point(
        this.center.x + this.a * cos,
        this.center.y + this.a * sin
      )
    ]
  }

  /**
   * Asymptote slopes in local coordinates: ±b/a
   */
  get asymptoteSlope(): number {
    return this.b / this.a
  }

  /**
   * Get the four points where asymptotes intersect a box of given size
   * Useful for drawing asymptote lines
   */
  getAsymptotePoints(extent = 100): [Point, Point, Point, Point] {
    const rotRad = degToRad(this.rotation)
    const cos = Math.cos(rotRad)
    const sin = Math.sin(rotRad)
    const slope = this.b / this.a

    // Asymptote directions in local coords: (1, ±slope)
    // Normalize and scale
    const len = Math.sqrt(1 + slope * slope)
    const dx1 = extent / len
    const dy1 = extent * slope / len
    const dy2 = -extent * slope / len

    // Rotate to world coords
    const transform = (lx: number, ly: number): Point => {
      return point(
        this.center.x + lx * cos - ly * sin,
        this.center.y + lx * sin + ly * cos
      )
    }

    return [
      transform(-dx1, -dy1),  // Asymptote 1, negative direction
      transform(dx1, dy1),    // Asymptote 1, positive direction
      transform(-dx1, -dy2),  // Asymptote 2, negative direction
      transform(dx1, dy2)     // Asymptote 2, positive direction
    ]
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Point Access
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get point on hyperbola using hyperbolic parameter t
   * Right branch: x = a*cosh(t), y = b*sinh(t)
   * @param t - Hyperbolic parameter (any real number)
   * @param branch - Which branch: 1 for right/positive, -1 for left/negative
   */
  pointAtT(t: number, branch: 1 | -1 = 1): Point {
    const x = branch * this.a * Math.cosh(t)
    const y = this.b * Math.sinh(t)
    return this.localToWorld(x, y)
  }

  /**
   * Get point on hyperbola at given angle (from center)
   * Note: This is the angle to the point, not a parameter
   */
  pointAtAngle(angleDeg: number): Point | null {
    const angleRad = degToRad(angleDeg - this.rotation)
    const cos = Math.cos(angleRad)
    const sin = Math.sin(angleRad)

    // For angle θ, solve for r where point is (r*cos(θ), r*sin(θ))
    // Substituting into hyperbola equation:
    // (r*cos(θ))²/a² - (r*sin(θ))²/b² = 1
    // r² * (cos²(θ)/a² - sin²(θ)/b²) = 1

    const denom = (cos * cos) / (this.a * this.a) - (sin * sin) / (this.b * this.b)

    if (denom <= 0) {
      return null  // Angle points toward asymptote or between branches
    }

    const r = 1 / Math.sqrt(denom)
    return this.localToWorld(r * cos, r * sin)
  }

  /**
   * Get points along one branch of the hyperbola
   * @param tMin - Starting parameter
   * @param tMax - Ending parameter
   * @param branch - Which branch (1 = right, -1 = left)
   * @param segments - Number of segments
   */
  getBranchPoints(tMin = -2, tMax = 2, branch: 1 | -1 = 1, segments = 50): Point[] {
    const points: Point[] = []
    const step = (tMax - tMin) / segments

    for (let t = tMin; t <= tMax + step / 2; t += step) {
      points.push(this.pointAtT(t, branch))
    }

    return points
  }

  /**
   * Get points for both branches
   */
  getPoints(tMin = -2, tMax = 2, segments = 50): { left: Point[]; right: Point[] } {
    return {
      left: this.getBranchPoints(tMin, tMax, -1, segments),
      right: this.getBranchPoints(tMin, tMax, 1, segments)
    }
  }

  /**
   * Bounding box of the curve AS DRAWN — the same default parameter
   * range `toSVGPath()` samples. An unbounded conic has no finite box
   * of its own, so `fit: true` needs this to mean the visible extent;
   * without it `Picture.contentBounds` read `undefined` and threw.
   */
  get bounds(): [number, number, number, number] {
    const { left, right } = this.getPoints()
    const pts = [...left, ...right]
    const xs = pts.map((p) => p.x)
    const ys = pts.map((p) => p.y)
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
  }

  /**
   * Transform local coordinates to world coordinates
   */
  private localToWorld(x: number, y: number): Point {
    const rotRad = degToRad(this.rotation)
    const cos = Math.cos(rotRad)
    const sin = Math.sin(rotRad)

    return point(
      this.center.x + x * cos - y * sin,
      this.center.y + x * sin + y * cos
    )
  }

  /**
   * Transform world coordinates to local coordinates
   */
  private worldToLocal(p: PointLike): Point {
    const dx = p.x - this.center.x
    const dy = p.y - this.center.y
    const rotRad = degToRad(-this.rotation)
    const cos = Math.cos(rotRad)
    const sin = Math.sin(rotRad)

    return point(
      dx * cos - dy * sin,
      dx * sin + dy * cos
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Geometric Operations
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Check if a point lies on the hyperbola
   */
  containsPoint(p: PointLike, epsilon = EPSILON): boolean {
    const local = this.worldToLocal(p)
    const term1 = (local.x * local.x) / (this.a * this.a)
    const term2 = (local.y * local.y) / (this.b * this.b)
    return approxEqual(term1 - term2, 1, epsilon)
  }

  /**
   * Check if a point is inside the hyperbola (between the branches)
   */
  containsPointInside(p: PointLike): boolean {
    const local = this.worldToLocal(p)
    const term1 = (local.x * local.x) / (this.a * this.a)
    const term2 = (local.y * local.y) / (this.b * this.b)
    return term1 - term2 < 1
  }

  /**
   * Translate the hyperbola
   */
  translate(dx: number, dy: number): Hyperbola {
    return new Hyperbola(
      this.center.add(dx, dy),
      this.a,
      this.b,
      this.rotation
    )
  }

  /**
   * Scale the hyperbola
   */
  scale(factor: number): Hyperbola {
    return new Hyperbola(
      this.center,
      this.a * factor,
      this.b * factor,
      this.rotation
    )
  }

  /**
   * Scale axes independently
   */
  scaleAxes(factorA: number, factorB: number): Hyperbola {
    return new Hyperbola(
      this.center,
      this.a * factorA,
      this.b * factorB,
      this.rotation
    )
  }

  /**
   * Rotate the hyperbola
   */
  rotate(degrees: number): Hyperbola {
    return new Hyperbola(
      this.center,
      this.a,
      this.b,
      this.rotation + degrees
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SVG Path
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Generate SVG path for one branch
   */
  toSVGPathBranch(branch: 1 | -1 = 1, tMin = -2, tMax = 2, segments = 30): string {
    const points = this.getBranchPoints(tMin, tMax, branch, segments)
    if (points.length < 2) return ''

    let path = `M ${points[0]!.x} ${points[0]!.y}`
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i]!.x} ${points[i]!.y}`
    }

    return path
  }

  /**
   * Generate SVG path for both branches
   */
  toSVGPath(tMin = -2, tMax = 2, segments = 30): string {
    const left = this.toSVGPathBranch(-1, tMin, tMax, segments)
    const right = this.toSVGPathBranch(1, tMin, tMax, segments)
    return `${left} ${right}`
  }

  /**
   * Generate smooth SVG path using cubic beziers
   */
  toSVGPathSmooth(branch: 1 | -1 = 1, tMin = -2, tMax = 2, segments = 15): string {
    const step = (tMax - tMin) / segments
    const points: Point[] = []

    for (let t = tMin; t <= tMax + step / 2; t += step) {
      points.push(this.pointAtT(t, branch))
    }

    if (points.length < 2) return ''

    let path = `M ${points[0]!.x} ${points[0]!.y}`

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i]!
      const p1 = points[i + 1]!

      const t0 = tMin + i * step
      const t1 = t0 + step

      const tangent0 = this.tangentAtT(t0, branch)
      const tangent1 = this.tangentAtT(t1, branch)

      const dist = p0.distanceTo(p1) / 3

      const cp1 = point(
        p0.x + tangent0.x * dist,
        p0.y + tangent0.y * dist
      )
      const cp2 = point(
        p1.x - tangent1.x * dist,
        p1.y - tangent1.y * dist
      )

      path += ` C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${p1.x} ${p1.y}`
    }

    return path
  }

  /**
   * Get unit tangent vector at parameter t
   */
  tangentAtT(t: number, branch: 1 | -1 = 1): Point {
    // Derivatives: dx/dt = a*sinh(t), dy/dt = b*cosh(t)
    const dx = branch * this.a * Math.sinh(t)
    const dy = this.b * Math.cosh(t)
    const len = Math.sqrt(dx * dx + dy * dy)

    // Rotate to world coords
    const rotRad = degToRad(this.rotation)
    const cos = Math.cos(rotRad)
    const sin = Math.sin(rotRad)

    return point(
      (dx * cos - dy * sin) / len,
      (dx * sin + dy * cos) / len
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get bounding box for the visible portion of the hyperbola
   */
  getBounds(tMin = -2, tMax = 2): [number, number, number, number] {
    const { left, right } = this.getPoints(tMin, tMax, 50)
    const allPoints = [...left, ...right]

    if (allPoints.length === 0) {
      return [this.center.x, this.center.y, this.center.x, this.center.y]
    }

    let minX = Infinity, minY = Infinity
    let maxX = -Infinity, maxY = -Infinity

    for (const p of allPoints) {
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x)
      maxY = Math.max(maxY, p.y)
    }

    return [minX, minY, maxX, maxY]
  }

  equals(other: Hyperbola, epsilon = EPSILON): boolean {
    return (
      this.center.equals(other.center, epsilon) &&
      approxEqual(this.a, other.a, epsilon) &&
      approxEqual(this.b, other.b, epsilon) &&
      approxEqual(this.rotation % 360, other.rotation % 360, epsilon)
    )
  }

  toString(): string {
    return `Hyperbola(center=${this.center}, a=${this.a}, b=${this.b}, rot=${this.rotation}°)`
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a hyperbola from center and semi-axes
 * @param center - Center point
 * @param a - Semi-transverse axis (distance to vertex)
 * @param b - Semi-conjugate axis
 * @param rotation - Rotation in degrees (0 = opens left/right)
 */
export function hyperbola(center: PointLike, a: number, b: number, rotation = 0): Hyperbola {
  return new Hyperbola(center, a, b, rotation)
}

/**
 * Create a hyperbola from its two foci and the transverse axis length
 * @param focus1 - First focus
 * @param focus2 - Second focus
 * @param a - Semi-transverse axis (distance from center to vertex)
 */
export function hyperbolaFromFoci(focus1: PointLike, focus2: PointLike, a: number): Hyperbola {
  const f1 = point(focus1.x, focus1.y)
  const f2 = point(focus2.x, focus2.y)

  const center = f1.toward(f2, 0.5)
  const c = f1.distanceTo(f2) / 2

  if (c < a) {
    throw new JikzError('invalid-argument', 'Focal distance must be greater than transverse axis for hyperbola')
  }

  // c² = a² + b², so b = √(c² - a²)
  const b = Math.sqrt(c * c - a * a)

  // Rotation is angle from center to focus2
  const rotation = center.angleTo(f2)

  return new Hyperbola(center, a, b, rotation)
}

/**
 * Create a hyperbola from foci and a point on the hyperbola
 * The defining property: |d(P,F1) - d(P,F2)| = 2a
 */
export function hyperbolaFromFociAndPoint(
  focus1: PointLike,
  focus2: PointLike,
  pointOnCurve: PointLike
): Hyperbola {
  const f1 = point(focus1.x, focus1.y)
  const f2 = point(focus2.x, focus2.y)
  const p = point(pointOnCurve.x, pointOnCurve.y)

  const d1 = p.distanceTo(f1)
  const d2 = p.distanceTo(f2)

  // 2a = |d1 - d2|
  const a = Math.abs(d1 - d2) / 2

  return hyperbolaFromFoci(focus1, focus2, a)
}

/**
 * Create a hyperbola from eccentricity
 * @param center - Center point
 * @param a - Semi-transverse axis
 * @param eccentricity - Must be > 1 for hyperbola
 * @param rotation - Rotation in degrees
 */
export function hyperbolaFromEccentricity(
  center: PointLike,
  a: number,
  eccentricity: number,
  rotation = 0
): Hyperbola {
  if (eccentricity <= 1) {
    throw new JikzError('invalid-argument', 'Eccentricity must be > 1 for hyperbola')
  }

  // e = c/a, so c = e*a
  // c² = a² + b², so b² = c² - a² = a²(e² - 1)
  const b = a * Math.sqrt(eccentricity * eccentricity - 1)

  return new Hyperbola(center, a, b, rotation)
}

/**
 * Create a rectangular hyperbola (a = b, asymptotes at 45°)
 */
export function rectangularHyperbola(center: PointLike, size: number, rotation = 0): Hyperbola {
  return new Hyperbola(center, size, size, rotation)
}

/**
 * Create a hyperbola with given asymptote angle
 * @param center - Center point
 * @param a - Semi-transverse axis
 * @param asymptoteAngle - Angle of asymptote in degrees (0-90)
 * @param rotation - Overall rotation
 */
export function hyperbolaFromAsymptote(
  center: PointLike,
  a: number,
  asymptoteAngle: number,
  rotation = 0
): Hyperbola {
  // tan(asymptoteAngle) = b/a
  const b = a * Math.tan(degToRad(asymptoteAngle))
  return new Hyperbola(center, a, b, rotation)
}
