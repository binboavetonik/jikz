import { JikzError } from '../core/errors'
import { Point, point } from '../core/Point'
import type { PointLike } from '../core/types'
import { parseAnchorSpec, type AnchorSpec } from '../core/Anchor'
import { EPSILON, degToRad } from '../utils/math'
import { Line } from './Line'
import { Rectangle } from './Rectangle'
import type { Shape } from './Shape'

/**
 * A polygon defined by an ordered list of vertices.
 * Implements the geometry-level {@link Shape} contract.
 */
export class Polygon implements Shape {
  // Typed as `string` (not the literal `'polygon'`) so subclasses like
  // Triangle can override with a narrower tag without breaking invariance
  // on methods that return the subclass type (e.g., reverse()).
  readonly type: string = 'polygon'
  readonly vertices: readonly Point[]

  constructor(vertices: PointLike[]) {
    if (vertices.length < 3) {
      throw new JikzError('invalid-argument', 'Polygon requires at least 3 vertices')
    }
    this.vertices = vertices.map((v) => point(v.x, v.y))
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Properties
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Number of vertices (and edges)
   */
  get vertexCount(): number {
    return this.vertices.length
  }

  /**
   * Get vertex at index (wraps around)
   */
  vertex(index: number): Point {
    const n = this.vertices.length
    const i = ((index % n) + n) % n
    return this.vertices[i]!
  }

  /**
   * All edges as Line segments
   */
  get edges(): Line[] {
    const edges: Line[] = []
    const n = this.vertices.length
    for (let i = 0; i < n; i++) {
      edges.push(new Line(this.vertices[i]!, this.vertices[(i + 1) % n]!))
    }
    return edges
  }

  /**
   * Signed area (positive for CCW, negative for CW)
   * Uses the shoelace formula
   */
  get signedArea(): number {
    let area = 0
    const n = this.vertices.length
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n
      area += this.vertices[i]!.x * this.vertices[j]!.y
      area -= this.vertices[j]!.x * this.vertices[i]!.y
    }
    return area / 2
  }

  /**
   * Absolute area
   */
  get area(): number {
    return Math.abs(this.signedArea)
  }

  /**
   * Total perimeter length
   */
  get perimeter(): number {
    return this.edges.reduce((sum, edge) => sum + edge.length, 0)
  }

  /**
   * Geometric centroid (center of mass for uniform density)
   */
  get centroid(): Point {
    const n = this.vertices.length
    let cx = 0
    let cy = 0
    let signedArea = 0

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n
      const x0 = this.vertices[i]!.x
      const y0 = this.vertices[i]!.y
      const x1 = this.vertices[j]!.x
      const y1 = this.vertices[j]!.y

      const a = x0 * y1 - x1 * y0
      signedArea += a
      cx += (x0 + x1) * a
      cy += (y0 + y1) * a
    }

    signedArea /= 2
    const factor = 1 / (6 * signedArea)

    return point(cx * factor, cy * factor)
  }

  /**
   * Check if vertices are ordered counter-clockwise
   */
  get isCounterClockwise(): boolean {
    return this.signedArea > 0
  }

  /**
   * Check if the polygon is convex
   */
  get isConvex(): boolean {
    const n = this.vertices.length
    if (n < 3) return false

    let sign = 0
    for (let i = 0; i < n; i++) {
      const p1 = this.vertices[i]!
      const p2 = this.vertices[(i + 1) % n]!
      const p3 = this.vertices[(i + 2) % n]!

      const cross = (p2.x - p1.x) * (p3.y - p2.y) - (p2.y - p1.y) * (p3.x - p2.x)

      if (Math.abs(cross) > EPSILON) {
        if (sign === 0) {
          sign = cross > 0 ? 1 : -1
        } else if ((cross > 0 ? 1 : -1) !== sign) {
          return false
        }
      }
    }
    return true
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Geometric Operations
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Check if a point is inside the polygon using ray casting
   */
  contains(p: PointLike, epsilon = EPSILON): boolean {
    // First check bounding box
    const bounds = this.bounds
    if (p.x < bounds[0] - epsilon || p.x > bounds[2] + epsilon ||
        p.y < bounds[1] - epsilon || p.y > bounds[3] + epsilon) {
      return false
    }

    // Ray casting algorithm
    let inside = false
    const n = this.vertices.length

    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = this.vertices[i]!.x
      const yi = this.vertices[i]!.y
      const xj = this.vertices[j]!.x
      const yj = this.vertices[j]!.y

      if (((yi > p.y) !== (yj > p.y)) &&
          (p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi)) {
        inside = !inside
      }
    }

    return inside
  }

  /**
   * Check if a point is on the polygon boundary
   */
  containsOnBoundary(p: PointLike, epsilon = EPSILON): boolean {
    for (const edge of this.edges) {
      if (edge.containsPointSegment(p, epsilon)) {
        return true
      }
    }
    return false
  }

  /**
   * Get the closest point on the polygon boundary to a given point
   */
  closestPoint(p: PointLike): Point {
    let closest = this.vertices[0]!
    let minDist = Infinity

    for (const edge of this.edges) {
      const t = edge.parameterOf(edge.projectPoint(p))
      let candidate: Point

      if (t !== null && t >= 0 && t <= 1) {
        candidate = edge.projectPoint(p)
      } else {
        // Check endpoints
        const d1 = edge.start.distanceTo(p)
        const d2 = edge.end.distanceTo(p)
        candidate = d1 < d2 ? edge.start : edge.end
      }

      const dist = candidate.distanceTo(p)
      if (dist < minDist) {
        minDist = dist
        closest = candidate
      }
    }

    return closest
  }

  /**
   * Reverse vertex order (CW <-> CCW)
   */
  reverse(): Polygon {
    return new Polygon([...this.vertices].reverse())
  }

  /**
   * Translate the polygon
   */
  translate(dx: number, dy: number): Polygon {
    return new Polygon(this.vertices.map((v) => v.add(dx, dy)))
  }

  /**
   * Scale around a point (default: centroid)
   */
  scale(factor: number, center?: PointLike): Polygon {
    const c = center ? point(center.x, center.y) : this.centroid
    return new Polygon(
      this.vertices.map((v) => c.add(v.sub(c).scale(factor)))
    )
  }

  /**
   * Rotate around a point (default: centroid)
   */
  rotate(angle: number, center?: PointLike): Polygon {
    const c = center ? point(center.x, center.y) : this.centroid
    return new Polygon(
      this.vertices.map((v) => v.rotateAround(c, angle))
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Bounding box as [minX, minY, maxX, maxY]
   */
  get bounds(): [number, number, number, number] {
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    for (const v of this.vertices) {
      minX = Math.min(minX, v.x)
      minY = Math.min(minY, v.y)
      maxX = Math.max(maxX, v.x)
      maxY = Math.max(maxY, v.y)
    }

    return [minX, minY, maxX, maxY]
  }

  /**
   * Bounding rectangle
   */
  get boundingRect(): Rectangle {
    const [minX, minY, maxX, maxY] = this.bounds
    return new Rectangle(minX, minY, maxX - minX, maxY - minY)
  }

  /**
   * Convert to SVG path data
   */
  toSVGPath(): string {
    const parts = this.vertices.map((v, i) =>
      i === 0 ? `M ${v.x} ${v.y}` : `L ${v.x} ${v.y}`
    )
    return parts.join(' ') + ' Z'
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Shape interface (remaining members — bounds, contains, toSVGPath above)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Center point of the polygon (geometric centroid).
   */
  get center(): Point {
    return this.centroid
  }

  get width(): number {
    const [minX, , maxX] = this.bounds
    return maxX - minX
  }

  get height(): number {
    const [, minY, , maxY] = this.bounds
    return maxY - minY
  }

  /**
   * Anchor point by name or angle.
   * All specs resolve to a boundary point along the ray from the polygon's
   * centroid in the corresponding direction. 'center' returns the centroid.
   */
  anchor(spec: AnchorSpec): Point {
    const angle = parseAnchorSpec(spec)
    if (angle === null) return this.centroid
    return this.boundaryPoint(angle)
  }

  /**
   * Point on the polygon boundary in the given direction (degrees) from the
   * centroid. If the ray intersects multiple edges (concave polygon), the
   * nearest intersection is returned.
   */
  boundaryPoint(angle: number): Point {
    const c = this.centroid
    const rad = degToRad(angle)
    const dx = Math.cos(rad)
    const dy = Math.sin(rad)

    // Make the ray long enough to exit any plausible polygon bounds.
    const [minX, minY, maxX, maxY] = this.bounds
    const diag =
      Math.hypot(maxX - minX, maxY - minY) +
      Math.hypot(c.x - minX, c.y - minY) +
      Math.hypot(maxX - c.x, maxY - c.y)
    const far = point(c.x + dx * diag, c.y + dy * diag)
    const ray = new Line(c, far)

    let best: Point | null = null
    let bestT = Infinity
    for (const edge of this.edges) {
      const hit = rayEdgeIntersect(c, dx, dy, edge)
      if (hit && hit.t > EPSILON && hit.t < bestT) {
        bestT = hit.t
        best = hit.point
      }
    }
    // Fallback: if the ray somehow misses all edges (degenerate polygon),
    // return the nearest vertex in the ray direction.
    return best ?? ray.projectPoint(c)
  }

  /**
   * Copy translated so the centroid lands at `newCenter`.
   */
  moveTo(newCenter: PointLike): Polygon {
    const c = this.centroid
    return new Polygon(
      this.vertices.map((v) => ({
        x: v.x + (newCenter.x - c.x),
        y: v.y + (newCenter.y - c.y),
      }))
    )
  }

  /**
   * Copy scaled non-uniformly so the bounding box matches width × height,
   * centered on the current centroid.
   */
  resize(width: number, height: number): Polygon {
    const [minX, minY, maxX, maxY] = this.bounds
    const curW = maxX - minX
    const curH = maxY - minY
    const sx = curW === 0 ? 1 : width / curW
    const sy = curH === 0 ? 1 : height / curH
    const c = this.centroid
    return new Polygon(
      this.vertices.map((v) => ({
        x: c.x + (v.x - c.x) * sx,
        y: c.y + (v.y - c.y) * sy,
      }))
    )
  }

  toString(): string {
    return `Polygon(${this.vertexCount} vertices)`
  }
}

/**
 * Intersect a ray from `origin` in direction `(dx, dy)` with a line segment.
 * Returns the intersection point and parameter `t` along the ray (t > 0 means
 * the intersection is ahead of the origin) when the segment is crossed.
 */
function rayEdgeIntersect(
  origin: PointLike,
  dx: number,
  dy: number,
  edge: Line
): { point: Point; t: number } | null {
  const x1 = edge.start.x
  const y1 = edge.start.y
  const x2 = edge.end.x
  const y2 = edge.end.y

  const ex = x2 - x1
  const ey = y2 - y1
  const denom = dx * ey - dy * ex
  if (Math.abs(denom) < EPSILON) return null

  const ox = x1 - origin.x
  const oy = y1 - origin.y
  const t = (ox * ey - oy * ex) / denom
  const u = (ox * dy - oy * dx) / denom
  if (t < 0 || u < 0 || u > 1) return null

  return {
    point: point(origin.x + dx * t, origin.y + dy * t),
    t,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a polygon from vertices
 */
export function polygon(vertices: PointLike[]): Polygon {
  return new Polygon(vertices)
}

/**
 * Create a regular polygon with n sides
 * @param center - Center point
 * @param radius - Distance from center to vertices
 * @param sides - Number of sides (3 = triangle, 4 = square, etc.)
 * @param startAngle - Angle of first vertex in degrees (default: -90 for "flat top")
 */
export function regularPolygon(
  center: PointLike,
  radius: number,
  sides: number,
  startAngle = -90
): Polygon {
  if (sides < 3) {
    throw new JikzError('invalid-argument', 'Regular polygon requires at least 3 sides')
  }

  const vertices: Point[] = []
  const angleStep = 360 / sides
  const startRad = degToRad(startAngle)

  for (let i = 0; i < sides; i++) {
    const angle = startRad + degToRad(i * angleStep)
    vertices.push(point(
      center.x + radius * Math.cos(angle),
      center.y + radius * Math.sin(angle)
    ))
  }

  return new Polygon(vertices)
}

/**
 * Create an equilateral triangle
 */
export function equilateralTriangle(center: PointLike, radius: number): Polygon {
  return regularPolygon(center, radius, 3)
}

/**
 * Create a square
 */
export function regularSquare(center: PointLike, radius: number): Polygon {
  return regularPolygon(center, radius, 4, -45)
}

/**
 * Create a regular pentagon
 */
export function pentagon(center: PointLike, radius: number): Polygon {
  return regularPolygon(center, radius, 5)
}

/**
 * Create a regular hexagon
 */
export function hexagon(center: PointLike, radius: number): Polygon {
  return regularPolygon(center, radius, 6)
}

/**
 * Create a star polygon
 * @param center - Center point
 * @param outerRadius - Distance to outer points
 * @param innerRadius - Distance to inner points
 * @param points - Number of star points
 * @param startAngle - Angle of first point in degrees
 */
export function star(
  center: PointLike,
  outerRadius: number,
  innerRadius: number,
  points: number,
  startAngle = -90
): Polygon {
  if (points < 3) {
    throw new JikzError('invalid-argument', 'Star requires at least 3 points')
  }

  const vertices: Point[] = []
  const angleStep = 360 / points
  const halfStep = angleStep / 2
  const startRad = degToRad(startAngle)

  for (let i = 0; i < points; i++) {
    // Outer point
    const outerAngle = startRad + degToRad(i * angleStep)
    vertices.push(point(
      center.x + outerRadius * Math.cos(outerAngle),
      center.y + outerRadius * Math.sin(outerAngle)
    ))

    // Inner point
    const innerAngle = startRad + degToRad(i * angleStep + halfStep)
    vertices.push(point(
      center.x + innerRadius * Math.cos(innerAngle),
      center.y + innerRadius * Math.sin(innerAngle)
    ))
  }

  return new Polygon(vertices)
}
