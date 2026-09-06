import type { Point } from '../core/Point'
import type { PointLike } from '../core/types'
import type { AnchorSpec, Anchorable } from '../core/Anchor'

/**
 * Shape is the unified interface every geometric primitive implements.
 *
 * The library previously maintained two parallel hierarchies:
 *   - `geometry/Circle`, `geometry/Rectangle`, etc. (math-first)
 *   - node-layer `CircleShape`, `RectangleShape`, etc. (node-first)
 *
 * Both carried near-identical anchor/bounds/contains/toSVGPath logic.
 * Under the refactor, geometry primitives are the source of truth and
 * `Shape` is their contract. `Node` wraps any `Shape` and layers on
 * node-only concerns (text, innerSep, outerSep, name).
 *
 * Node-only fields (innerSep, outerSep) are intentionally NOT on this
 * interface — they belong on `Node`, not on every shape.
 */
export interface Shape extends Anchorable {
  /**
   * Type tag for runtime dispatch. Implementations narrow this via
   * `readonly type = 'circle' as const`. Left as `string` on the
   * interface so geometry types don't need to reference a central union.
   */
  readonly type: string

  /**
   * Bounding-box dimensions.
   */
  readonly width: number
  readonly height: number

  /**
   * Bounding box as [minX, minY, maxX, maxY].
   */
  readonly bounds: [number, number, number, number]

  /**
   * Anchor point by name or angle (degrees).
   */
  anchor(spec: AnchorSpec): Point

  /**
   * Point on the shape boundary in the given direction from center, in degrees.
   * Screen convention: 0° = east, angles increase clockwise in y-down
   * space (90° = south, 270° = north). See ANCHOR_ANGLES in core/Anchor.
   */
  boundaryPoint(angle: number): Point

  /**
   * Whether a point lies inside the shape (boundary inclusive).
   */
  contains(p: PointLike): boolean

  /**
   * SVG path data describing the shape's outline, suitable for a `d` attribute.
   */
  toSVGPath(): string

  /**
   * Return a copy translated so that the shape's center is at `center`.
   */
  moveTo(center: PointLike): Shape

  /**
   * Return a copy scaled so that its bounding box matches the requested
   * width × height (around the shape's current center).
   */
  resize(width: number, height: number): Shape
}

/**
 * Options for shape factories (geometry primitives and complex shapes).
 *
 * `innerSep` / `outerSep` are node-spacing concerns; factories may honor
 * them for back-compat, but the {@link Shape} interface itself does not
 * carry them — they live on `Node`.
 */
export interface ShapeOptions {
  center?: PointLike
  width?: number
  height?: number
  minWidth?: number
  minHeight?: number
  innerSep?: number
  outerSep?: number
}

export const DEFAULT_SHAPE_OPTIONS: Required<ShapeOptions> = {
  center: { x: 0, y: 0 },
  width: 0,
  height: 0,
  minWidth: 20,
  minHeight: 20,
  innerSep: 4,
  outerSep: 0,
}
