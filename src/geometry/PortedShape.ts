/**
 * Shapes that answer to named ports — the base the circuit and logic-gate
 * extensions are built on, and the seam any domain shape library can use.
 */
import { Point, point } from '../core/Point'
import type { PointLike } from '../core/types'
import { anchorOnRect, AnchorError, type AnchorSpec } from '../core/Anchor'
import type { Shape, ShapeOptions } from './Shape'

/**
 * A shape with named ports.
 *
 * A ported shape is a box (bounding box INCLUDING any lead stubs) with:
 *   - a drawing ({@link Shape.toSVGPath}): leads + body, subclass-provided
 *   - a port table: named connection points ({@link PortedShape.portTable})
 *
 * Anchor resolution follows the strict custom-name pattern (see
 * AnchorError): known port names are answered from the port table FIRST;
 * everything else — cardinals, aliases, numeric angles — delegates to
 * {@link anchorOnRect} on the symbol's box, so unknown names (typo'd
 * ports) throw AnchorError instead of silently resolving.
 *
 * Orientation is the library's standard `rotate` mechanism: shapes are
 * drawn horizontally and rotated via `node({ rotate })` / Rotated —
 * ports rotate with the shape, numeric anchors stay screen-absolute.
 *
 * NOTE the typed port accessors a subclass adds (`r1.out`, `g.in1`) read
 * the UNROTATED instance. `node({ shape: r1, rotate: 90 })` rotates a
 * copy, so the instance keeps reporting its pre-rotation points; go
 * through the picture (`pic.resolve('R1.out')`, or a `"R1.out"` edge
 * endpoint) when the node is rotated.
 */
export abstract class PortedShape implements Shape {
  abstract readonly type: string
  readonly center: Point
  readonly width: number
  readonly height: number

  constructor(center: PointLike, width: number, height: number) {
    this.center = point(center.x, center.y)
    this.width = width
    this.height = height
  }

  /**
   * Port name → absolute point. Matched case-insensitively against
   * trimmed anchor specs. Ports usually coincide with box-edge
   * midpoints (where leads exit), but multi-port symbols (op-amp,
   * transistor) place them anywhere on the border.
   */
  protected abstract portTable(): Record<string, Point>

  /** Leads + body outline, subclass-provided. */
  abstract toSVGPath(): string

  /** All port names this symbol answers to (for docs/diagnostics). */
  get portNames(): readonly string[] {
    return Object.keys(this.portTable())
  }

  anchor(spec: AnchorSpec): Point {
    if (typeof spec === 'string') {
      const port = this.portTable()[spec.toLowerCase().trim()]
      if (port) return port
    }
    try {
      return anchorOnRect(this.center, this.width, this.height, spec)
    } catch (e) {
      // A typo'd port lands here. Say what this shape DOES answer to —
      // the generic message can only list cardinals.
      if (e instanceof AnchorError) throw new AnchorError(spec, this.portNames)
      throw e
    }
  }

  get bounds(): [number, number, number, number] {
    const halfW = this.width / 2
    const halfH = this.height / 2
    return [
      this.center.x - halfW,
      this.center.y - halfH,
      this.center.x + halfW,
      this.center.y + halfH,
    ]
  }

  boundaryPoint(angle: number): Point {
    return anchorOnRect(this.center, this.width, this.height, angle)
  }

  contains(p: PointLike): boolean {
    const [minX, minY, maxX, maxY] = this.bounds
    return p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY
  }

  moveTo(center: PointLike): PortedShape {
    return this.recreate(center, this.width, this.height)
  }

  resize(width: number, height: number): PortedShape {
    return this.recreate(this.center, width, height)
  }

  /**
   * Create a copy with new center/dimensions, preserving every
   * shape-specific option (variant, gate kind, …).
   */
  protected abstract recreate(
    center: PointLike,
    width: number,
    height: number
  ): PortedShape
}

/**
 * Resolve intrinsic dimensions from {@link ShapeOptions}.
 *
 * Domain shapes have an intrinsic default size (a readable resistor is
 * 60×20, not 20×20; a logic gate 70×50). Node coerces unset dimensions up to
 * minWidth/minHeight before calling shape factories, so a shape can
 * only distinguish "caller set a size" from "defaulted" by comparing
 * against the minimums: width/height override the intrinsic default
 * only when they EXCEED the corresponding minimum.
 */
export function intrinsicSize(
  o: ShapeOptions,
  defaultWidth: number,
  defaultHeight: number
): { width: number; height: number } {
  const minW = o.minWidth ?? 0
  const minH = o.minHeight ?? 0
  return {
    width: o.width !== undefined && o.width > minW ? o.width : defaultWidth,
    height: o.height !== undefined && o.height > minH ? o.height : defaultHeight,
  }
}
