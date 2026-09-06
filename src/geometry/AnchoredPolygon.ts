import { Point, point } from '../core/Point'
import type { PointLike } from '../core/types'
import { parseAnchorSpec, type AnchorSpec } from '../core/Anchor'
import type { Shape } from './Shape'
import { degToRad } from '../utils/math'

/**
 * Base class for shapes whose outline is a closed polygon defined by
 * `vertices`. Provides the full {@link Shape} surface except the few
 * members that are inherently shape-specific:
 *
 *   - identity & spacing: `type`, `center`, `width`, `height`,
 *     `innerSep`, `outerSep`
 *   - geometry source: `vertices`
 *   - copy operations: `moveTo`, `resize` (they need the shape's own
 *     options bag)
 *
 * Everything else is derived here, once:
 *
 *   - `boundaryPoint(angle)` — ray-cast from `center` along the
 *     **screen-convention** angle (0° = east, clockwise positive in
 *     y-down space; 90° = south, 270° = north — see ANCHOR_ANGLES)
 *     against the polygon edges; nearest hit wins.
 *   - `anchor(spec)` — compass anchors (`north`, `ne`, …) resolve
 *     through `boundaryPoint` with an `outerSep` offset; numeric specs
 *     ray-cast directly. Shape-specific names are served by the
 *     {@link customAnchor} hook, which is consulted *before* the
 *     built-in compass handling so subclasses may override compass
 *     anchors with exact vertices (TikZ-style, e.g. Kite's `east` is
 *     its right vertex, not the edge midpoint).
 *   - `contains` — even-odd point-in-polygon over `vertices`.
 *   - `bounds` — vertex min/max (override for radius-box shapes like
 *     Star).
 *   - `toSVGPath` — closed polyline through `vertices`.
 *   - compass getters (`north`, `southEast`, …).
 *
 * To create a custom shape, extend this class and return vertices:
 *
 * ```ts
 * class House extends AnchoredPolygon {
 *   readonly type = 'house'
 *   // ...center/width/height/innerSep/outerSep fields...
 *   get vertices(): Point[] {
 *     const hw = this.width / 2, hh = this.height / 2
 *     return [
 *       point(this.center.x - hw, this.center.y + hh),  // bottom left
 *       point(this.center.x - hw, this.center.y),       // wall left
 *       point(this.center.x, this.center.y - hh),       // roof apex
 *       point(this.center.x + hw, this.center.y),       // wall right
 *       point(this.center.x + hw, this.center.y + hh),  // bottom right
 *     ]
 *   }
 *   moveTo(center: PointLike) { return new House({ ...this.opts, center }) }
 *   resize(w: number, h: number) { return new House({ ...this.opts, width: w, height: h }) }
 * }
 * ```
 */
export abstract class AnchoredPolygon implements Shape {
  abstract readonly type: string
  abstract readonly center: Point
  abstract readonly width: number
  abstract readonly height: number
  abstract readonly innerSep: number
  abstract readonly outerSep: number

  /**
   * The polygon's vertices in order (closed — the last vertex connects
   * back to the first). This is the single source of geometry for all
   * derived behavior in this class.
   */
  abstract get vertices(): Point[]

  /**
   * Hook for shape-specific named anchors (`'tip'`, `'corner 2'`,
   * `'apex'`, …). Receives the lower-cased, trimmed spec and returns
   * the anchor point, or `null` to fall through to the built-in
   * compass/numeric handling. Consulted before compass anchors, so a
   * subclass may also override compass names with exact vertices.
   */
  protected customAnchor(_normalized: string): Point | null {
    return null
  }

  anchor(spec: AnchorSpec): Point {
    if (typeof spec === 'string') {
      const normalized = spec.toLowerCase().trim()

      if (normalized === 'center' || normalized === 'c') {
        return this.center
      }

      const custom = this.customAnchor(normalized)
      if (custom) return custom

      // Compass anchors ray-cast along the screen-convention angle and
      // then offset by outerSep along the same direction (diagonals use
      // the historical 0.7 ≈ √2/2 factor).
      const sep = this.outerSep
      switch (normalized) {
        case 'north':
        case 'n':
          return this.boundaryPoint(270).add(0, -sep)
        case 'south':
        case 's':
          return this.boundaryPoint(90).add(0, sep)
        case 'east':
        case 'e':
          return this.boundaryPoint(0).add(sep, 0)
        case 'west':
        case 'w':
          return this.boundaryPoint(180).add(-sep, 0)
        case 'north east':
        case 'ne':
          return this.boundaryPoint(315).add(sep * 0.7, -sep * 0.7)
        case 'north west':
        case 'nw':
          return this.boundaryPoint(225).add(-sep * 0.7, -sep * 0.7)
        case 'south east':
        case 'se':
          return this.boundaryPoint(45).add(sep * 0.7, sep * 0.7)
        case 'south west':
        case 'sw':
          return this.boundaryPoint(135).add(-sep * 0.7, sep * 0.7)
      }
    }

    const parsed = parseAnchorSpec(spec)
    if (typeof parsed === 'number') {
      return this.boundaryPoint(parsed)
    }

    return this.center
  }

  boundaryPoint(angle: number): Point {
    const rad = degToRad(angle)
    const dir = point(Math.cos(rad), Math.sin(rad))
    const vertices = this.vertices

    let closest: Point | null = null
    let minDist = Infinity

    for (let i = 0; i < vertices.length; i++) {
      const p1 = vertices[i]!
      const p2 = vertices[(i + 1) % vertices.length]!
      const intersection = rayEdgeIntersection(this.center, dir, p1, p2)
      if (intersection) {
        const dist = this.center.distanceTo(intersection)
        if (dist < minDist) {
          minDist = dist
          closest = intersection
        }
      }
    }

    return closest ?? this.center
  }

  contains(p: PointLike): boolean {
    return pointInPolygon(p, this.vertices)
  }

  get bounds(): [number, number, number, number] {
    return polygonBounds(this.vertices)
  }

  get north(): Point { return this.anchor('north') }
  get south(): Point { return this.anchor('south') }
  get east(): Point { return this.anchor('east') }
  get west(): Point { return this.anchor('west') }
  get northEast(): Point { return this.anchor('north east') }
  get northWest(): Point { return this.anchor('north west') }
  get southEast(): Point { return this.anchor('south east') }
  get southWest(): Point { return this.anchor('south west') }

  toSVGPath(): string {
    const vertices = this.vertices
    if (vertices.length === 0) return ''

    let path = `M ${vertices[0]!.x} ${vertices[0]!.y}`
    for (let i = 1; i < vertices.length; i++) {
      path += ` L ${vertices[i]!.x} ${vertices[i]!.y}`
    }
    return path + ' Z'
  }

  abstract moveTo(center: PointLike): Shape
  abstract resize(width: number, height: number): Shape
}

/**
 * Ray (from `origin` along unit `dir`) vs. segment (`p1`→`p2`)
 * intersection. Returns the hit point, or null when the ray misses,
 * is parallel, or hits behind the origin.
 */
export function rayEdgeIntersection(
  origin: Point,
  dir: Point,
  p1: Point,
  p2: Point
): Point | null {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const denom = dir.x * dy - dir.y * dx
  if (Math.abs(denom) < 1e-10) return null

  const t = ((p1.x - origin.x) * dy - (p1.y - origin.y) * dx) / denom
  const s = ((p1.x - origin.x) * dir.y - (p1.y - origin.y) * dir.x) / denom

  if (t > 0 && s >= 0 && s <= 1) {
    return point(origin.x + t * dir.x, origin.y + t * dir.y)
  }
  return null
}

/**
 * Even-odd point-in-polygon test (boundary inclusive in practice —
 * points exactly on an edge may classify either way).
 */
export function pointInPolygon(p: PointLike, polygon: Point[]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i]!.x, yi = polygon[i]!.y
    const xj = polygon[j]!.x, yj = polygon[j]!.y
    if (((yi > p.y) !== (yj > p.y)) && (p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi)) {
      inside = !inside
    }
  }
  return inside
}

/**
 * Vertex min/max as [minX, minY, maxX, maxY].
 */
export function polygonBounds(vertices: Point[]): [number, number, number, number] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const v of vertices) {
    minX = Math.min(minX, v.x)
    minY = Math.min(minY, v.y)
    maxX = Math.max(maxX, v.x)
    maxY = Math.max(maxY, v.y)
  }
  return [minX, minY, maxX, maxY]
}
