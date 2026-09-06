import { Point, point } from '../core/Point'
import type { PointLike } from '../core/types'
import type { AnchorSpec } from '../core/Anchor'
import { rotatePathData } from '../path/rotatePath'
import type { Shape } from './Shape'

/**
 * A {@link Shape} decorator that rotates another shape around its center.
 *
 * Rotation is **geometric, not visual**: anchors, boundary points,
 * hit-testing and bounds all live in rotated absolute coordinates, so
 * edges attach to the rotated border exactly as they do for unrotated
 * shapes. `toSVGPath()` returns rotated path data (absolute commands),
 * so renderers need no special handling for the outline.
 *
 * Anchor semantics follow TikZ: named anchors rotate with the shape —
 * `anchor('north')` on a rectangle rotated 90° returns the point where
 * the pre-rotation north edge midpoint ended up (on the visual right).
 * `boundaryPoint(angle)` takes an *absolute* screen-convention angle, so
 * edge 'auto' attachment keeps working unchanged.
 *
 * `Node` wraps shapes in this automatically for `node({ rotate })`;
 * it can also wrap user-registered shapes by hand.
 */
export class Rotated implements Shape {
  readonly base: Shape
  readonly angle: number

  constructor(base: Shape, angle: number) {
    this.base = base
    this.angle = angle
  }

  /** Same tag as the wrapped shape — rotation is transparent to dispatch. */
  get type(): string {
    return this.base.type
  }

  /** Rotation is around the center, so the center is invariant. */
  get center(): Point {
    return this.base.center
  }

  private rotatePt(p: Point): Point {
    return p.rotateAround(this.center, this.angle)
  }

  private unrotatePt(p: PointLike): Point {
    return point(p.x, p.y).rotateAround(this.center, -this.angle)
  }

  /** Axis-aligned bounding box of the rotated outline. */
  get bounds(): [number, number, number, number] {
    const [minX, minY, maxX, maxY] = this.base.bounds
    const corners = [
      point(minX, minY),
      point(maxX, minY),
      point(maxX, maxY),
      point(minX, maxY),
    ].map((p) => this.rotatePt(p))

    const xs = corners.map((p) => p.x)
    const ys = corners.map((p) => p.y)
    return [
      Math.min(...xs),
      Math.min(...ys),
      Math.max(...xs),
      Math.max(...ys),
    ]
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
   * Anchor by name or angle.
   *
   * Frame rules (matching the library's anchor philosophy — "named
   * anchors match TikZ; bare numbers match the screen"):
   *   - NAMED anchors rotate with the shape (TikZ semantics):
   *     `anchor('north')` on a rectangle rotated 90° lies on the
   *     visual right edge.
   *   - NUMERIC specs (including '30deg' strings) are ABSOLUTE screen
   *     directions, routed through {@link boundaryPoint}. This is what
   *     keeps edge 'auto' attachment correct: an edge approaching from
   *     the east hits the rotated shape's visual east border.
   */
  anchor(spec: AnchorSpec): Point {
    if (typeof spec === 'number') {
      return this.boundaryPoint(spec)
    }
    const numeric = spec.trim().match(/^(-?\d+(?:\.\d+)?)\s*(?:deg)?$/i)
    if (numeric) {
      return this.boundaryPoint(parseFloat(numeric[1]!))
    }
    return this.rotatePt(this.base.anchor(spec))
  }

  /**
   * Border point in an *absolute* screen-convention direction from the
   * center: ask the base shape in the unrotated direction, then rotate.
   */
  boundaryPoint(angle: number): Point {
    return this.rotatePt(this.base.boundaryPoint(angle - this.angle))
  }

  contains(p: PointLike): boolean {
    return this.base.contains(this.unrotatePt(p))
  }

  /**
   * Rotated outline as absolute SVG path data. Arcs are handled
   * (x-axis-rotation shifts by the angle; radii and sweep preserved).
   */
  toSVGPath(): string {
    return rotatePathData(this.base.toSVGPath(), this.angle, this.center)
  }

  moveTo(center: PointLike): Rotated {
    return new Rotated(this.base.moveTo(center), this.angle)
  }

  /**
   * Resize the wrapped shape and keep the rotation. `width`/`height`
   * refer to the *unrotated* shape's bounding box (matching how `Node`
   * sizes shapes before rotation is applied).
   */
  resize(width: number, height: number): Rotated {
    return new Rotated(this.base.resize(width, height), this.angle)
  }

  toString(): string {
    return `Rotated(${this.base}, angle=${this.angle})`
  }
}

/**
 * Wrap `shape` in a {@link Rotated} rotating `angle` degrees
 * (clockwise on screen) around the shape's center.
 */
export function rotated(shape: Shape, angle: number): Rotated {
  return new Rotated(shape, angle)
}
