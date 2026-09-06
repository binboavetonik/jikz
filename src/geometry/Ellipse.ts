import { Point, point } from '../core/Point'
import type { PointLike, AngleOptions } from '../core/types'
import { anchorOnEllipse, type AnchorSpec } from '../core/Anchor'
import { degToRad, EPSILON, approxEqual } from '../utils/math'
import type { Shape } from './Shape'

/**
 * An ellipse defined by center, semi-major axis (a), and semi-minor axis (b).
 *
 * The ellipse equation: (x-cx)²/a² + (y-cy)²/b² = 1
 *
 * Can also be rotated by an angle.
 * Implements the geometry-level {@link Shape} contract.
 */
export class Ellipse implements Shape {
  readonly type = 'ellipse' as const
  readonly center: Point
  readonly a: number  // semi-major axis (horizontal radius when rotation=0)
  readonly b: number  // semi-minor axis (vertical radius when rotation=0)
  readonly rotation: number  // rotation angle in degrees

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
   * Check if this is actually a circle (a ≈ b)
   */
  get isCircle(): boolean {
    return approxEqual(this.a, this.b, EPSILON)
  }

  /**
   * Eccentricity: e = sqrt(1 - b²/a²) for a > b
   * 0 = circle, approaches 1 as ellipse becomes more elongated
   */
  get eccentricity(): number {
    const major = Math.max(this.a, this.b)
    const minor = Math.min(this.a, this.b)
    return Math.sqrt(1 - (minor * minor) / (major * major))
  }

  /**
   * Focal distance from center
   * c = sqrt(a² - b²) where a > b
   */
  get focalDistance(): number {
    const major = Math.max(this.a, this.b)
    const minor = Math.min(this.a, this.b)
    return Math.sqrt(major * major - minor * minor)
  }

  /**
   * Get the two foci of the ellipse
   */
  get foci(): [Point, Point] {
    const c = this.focalDistance
    const rotRad = degToRad(this.rotation)

    // Foci are along the major axis
    const isHorizontalMajor = this.a >= this.b

    let dx: number, dy: number
    if (isHorizontalMajor) {
      dx = c * Math.cos(rotRad)
      dy = c * Math.sin(rotRad)
    } else {
      dx = -c * Math.sin(rotRad)
      dy = c * Math.cos(rotRad)
    }

    return [
      point(this.center.x - dx, this.center.y - dy),
      point(this.center.x + dx, this.center.y + dy),
    ]
  }

  /**
   * Area of the ellipse: π * a * b
   */
  get area(): number {
    return Math.PI * this.a * this.b
  }

  /**
   * Approximate circumference using Ramanujan's formula
   */
  get circumference(): number {
    const h = ((this.a - this.b) * (this.a - this.b)) /
              ((this.a + this.b) * (this.a + this.b))
    return Math.PI * (this.a + this.b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)))
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Point Access
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get point on ellipse at given angle (in degrees)
   * Angle is measured from the center, 0° is along positive x-axis (before rotation)
   */
  pointAt(angle: number, options?: AngleOptions): Point {
    const rad = options?.unit === 'rad' ? angle : degToRad(angle)
    const rotRad = degToRad(this.rotation)

    // Point on unrotated ellipse
    const x = this.a * Math.cos(rad)
    const y = this.b * Math.sin(rad)

    // Rotate and translate
    const cosRot = Math.cos(rotRad)
    const sinRot = Math.sin(rotRad)

    return point(
      this.center.x + x * cosRot - y * sinRot,
      this.center.y + x * sinRot + y * cosRot
    )
  }

  /**
   * Get points along the ellipse for rendering
   * @param segments - Number of line segments to approximate the ellipse
   */
  getPoints(segments = 64): Point[] {
    const points: Point[] = []
    const step = 360 / segments

    for (let angle = 0; angle < 360; angle += step) {
      points.push(this.pointAt(angle))
    }

    return points
  }

  /**
   * Cardinal points (on unrotated ellipse, then rotated).
   *
   * @deprecated Legacy math-convention accessors: `north` is at 90°,
   * which is the VISUAL BOTTOM in this library's y-down screen space —
   * the opposite of {@link Ellipse.anchor}('north'). Prefer
   * `anchor('north')` / `anchor('south')` / …, which follow the
   * library-wide screen convention and agree with every other shape.
   */
  get north(): Point {
    return this.pointAt(90)
  }
  /** @deprecated See {@link Ellipse.north} — prefer `anchor('south')`. */
  get south(): Point {
    return this.pointAt(270)
  }
  /** @deprecated See {@link Ellipse.north} — prefer `anchor('east')`. */
  get east(): Point {
    return this.pointAt(0)
  }
  /** @deprecated See {@link Ellipse.north} — prefer `anchor('west')`. */
  get west(): Point {
    return this.pointAt(180)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Shape interface
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Bounding-box width (accounts for rotation).
   */
  get width(): number {
    const [minX, , maxX] = this.bounds
    return maxX - minX
  }

  /**
   * Bounding-box height (accounts for rotation).
   */
  get height(): number {
    const [, minY, , maxY] = this.bounds
    return maxY - minY
  }

  /**
   * Anchor point by name or angle. Delegates to {@link anchorOnEllipse},
   * the single source of truth for ellipse anchoring, passing
   * {@link Ellipse.rotation} through so rotated ellipses resolve anchors
   * on the rotated boundary. Named anchors ('north', 'ne', …) follow the
   * screen convention (see {@link ANCHOR_ANGLES}); numeric specs are
   * degrees; 'center' returns the center.
   */
  anchor(spec: AnchorSpec): Point {
    return anchorOnEllipse(this.center, this.a, this.b, spec, this.rotation)
  }

  /**
   * Point on the ellipse boundary at the given angle (degrees).
   */
  boundaryPoint(angle: number): Point {
    return this.pointAt(angle)
  }

  /**
   * Whether a point lies inside the ellipse (boundary inclusive).
   */
  contains(p: PointLike): boolean {
    return this.containsPointInside(p)
  }

  /**
   * Copy with center at `newCenter`, axes and rotation preserved.
   */
  moveTo(newCenter: PointLike): Ellipse {
    return new Ellipse(newCenter, this.a, this.b, this.rotation)
  }

  /**
   * Copy resized so its (axis-aligned) bounding box matches width × height.
   * For an unrotated ellipse this sets `a = width/2`, `b = height/2`.
   * Rotation is cleared — fitting a rotated ellipse into an arbitrary
   * bounding box is not generally well-defined in one step.
   */
  resize(width: number, height: number): Ellipse {
    return new Ellipse(this.center, width / 2, height / 2, 0)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Geometric Operations
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Check if a point lies on the ellipse
   */
  containsPoint(p: PointLike, epsilon = EPSILON): boolean {
    // Transform point to ellipse's local coordinates
    const local = this.toLocalCoords(p)
    const value = (local.x * local.x) / (this.a * this.a) +
                  (local.y * local.y) / (this.b * this.b)
    return approxEqual(value, 1, epsilon)
  }

  /**
   * Check if a point is inside the ellipse
   */
  containsPointInside(p: PointLike): boolean {
    const local = this.toLocalCoords(p)
    const value = (local.x * local.x) / (this.a * this.a) +
                  (local.y * local.y) / (this.b * this.b)
    return value <= 1
  }

  /**
   * Transform a point to the ellipse's local coordinate system
   * (centered at origin, unrotated)
   */
  private toLocalCoords(p: PointLike): Point {
    const dx = p.x - this.center.x
    const dy = p.y - this.center.y
    const rotRad = degToRad(-this.rotation)  // Negative to undo rotation

    return point(
      dx * Math.cos(rotRad) - dy * Math.sin(rotRad),
      dx * Math.sin(rotRad) + dy * Math.cos(rotRad)
    )
  }

  /**
   * Translate the ellipse
   */
  translate(dx: number, dy: number): Ellipse {
    return new Ellipse(this.center.add(dx, dy), this.a, this.b, this.rotation)
  }

  /**
   * Scale the ellipse uniformly
   */
  scale(factor: number): Ellipse {
    return new Ellipse(
      this.center,
      this.a * Math.abs(factor),
      this.b * Math.abs(factor),
      this.rotation
    )
  }

  /**
   * Rotate the ellipse by additional degrees
   */
  rotate(degrees: number): Ellipse {
    return new Ellipse(this.center, this.a, this.b, this.rotation + degrees)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SVG Path
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Generate SVG path data for the ellipse
   */
  toSVGPath(): string {
    // Use two arc commands to draw a complete ellipse
    const start = this.pointAt(0)
    const mid = this.pointAt(180)

    const largeArc = 0
    const sweep = 1

    return `M ${start.x} ${start.y} ` +
           `A ${this.a} ${this.b} ${this.rotation} ${largeArc} ${sweep} ${mid.x} ${mid.y} ` +
           `A ${this.a} ${this.b} ${this.rotation} ${largeArc} ${sweep} ${start.x} ${start.y} Z`
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get bounding box (approximate for rotated ellipses)
   */
  get bounds(): [number, number, number, number] {
    if (this.rotation === 0) {
      return [
        this.center.x - this.a,
        this.center.y - this.b,
        this.center.x + this.a,
        this.center.y + this.b,
      ]
    }

    // For rotated ellipse, compute tight bounds
    const rotRad = degToRad(this.rotation)
    const cos = Math.cos(rotRad)
    const sin = Math.sin(rotRad)

    // Half-widths of bounding box
    const ux = this.a * cos
    const uy = this.a * sin
    const vx = this.b * sin
    const vy = this.b * cos

    const halfWidth = Math.sqrt(ux * ux + vx * vx)
    const halfHeight = Math.sqrt(uy * uy + vy * vy)

    return [
      this.center.x - halfWidth,
      this.center.y - halfHeight,
      this.center.x + halfWidth,
      this.center.y + halfHeight,
    ]
  }

  equals(other: Ellipse, epsilon = EPSILON): boolean {
    return (
      this.center.equals(other.center, epsilon) &&
      approxEqual(this.a, other.a, epsilon) &&
      approxEqual(this.b, other.b, epsilon) &&
      approxEqual(this.rotation % 360, other.rotation % 360, epsilon)
    )
  }

  toString(): string {
    return `Ellipse(${this.center}, a=${this.a}, b=${this.b}, rot=${this.rotation}°)`
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create an ellipse from center and semi-axes
 */
export function ellipse(center: PointLike, a: number, b: number, rotation = 0): Ellipse {
  return new Ellipse(center, a, b, rotation)
}

/**
 * Create an ellipse from center and the two axis endpoints
 */
export function ellipseFromAxes(center: PointLike, majorEnd: PointLike, minorEnd: PointLike): Ellipse {
  const c = point(center.x, center.y)
  const a = c.distanceTo(majorEnd)
  const b = c.distanceTo(minorEnd)
  const rotation = c.angleTo(majorEnd)
  return new Ellipse(center, a, b, rotation)
}

/**
 * Create an ellipse from the two foci and a point on the ellipse
 */
export function ellipseFromFoci(focus1: PointLike, focus2: PointLike, pointOnEllipse: PointLike): Ellipse {
  const f1 = point(focus1.x, focus1.y)
  const f2 = point(focus2.x, focus2.y)
  const p = point(pointOnEllipse.x, pointOnEllipse.y)

  // Center is midpoint of foci
  const center = f1.midpoint(f2)

  // 2a = sum of distances from any point to both foci
  const twoA = f1.distanceTo(p) + f2.distanceTo(p)
  const a = twoA / 2

  // c = distance from center to focus
  const c = center.distanceTo(f1)

  // b² = a² - c²
  const b = Math.sqrt(a * a - c * c)

  // Rotation is angle of major axis (line between foci)
  const rotation = f1.angleTo(f2)

  return new Ellipse(center, a, b, rotation)
}

/**
 * Create an ellipse that fits inside a rectangle
 */
export function ellipseInRect(x: number, y: number, width: number, height: number): Ellipse {
  const center = point(x + width / 2, y + height / 2)
  return new Ellipse(center, width / 2, height / 2)
}
