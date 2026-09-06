import { Point, point } from '../../core/Point'
import type { PointLike } from '../../core/types'
import { anchorOnRect, type AnchorSpec } from '../../core/Anchor'
import type { Shape, ShapeOptions } from '../../geometry/Shape'

/**
 * Base class for circuit symbols.
 *
 * A symbol is a box (bounding box INCLUDING lead stubs) with:
 *   - a drawing ({@link Shape.toSVGPath}): leads + body, subclass-provided
 *   - a port table: named connection points ({@link CircuitSymbol.portTable})
 *
 * Anchor resolution follows the strict custom-name pattern (see
 * AnchorError): known port names are answered from the port table FIRST;
 * everything else — cardinals, aliases, numeric angles — delegates to
 * {@link anchorOnRect} on the symbol's box, so unknown names (typo'd
 * ports) throw AnchorError instead of silently resolving.
 *
 * Orientation is the library's standard `rotate` mechanism: symbols are
 * drawn horizontally and rotated via `node({ rotate })` / Rotated —
 * ports rotate with the symbol, numeric anchors stay screen-absolute.
 */
export abstract class CircuitSymbol implements Shape {
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
    return anchorOnRect(this.center, this.width, this.height, spec)
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

  moveTo(center: PointLike): CircuitSymbol {
    return this.recreate(center, this.width, this.height)
  }

  resize(width: number, height: number): CircuitSymbol {
    return this.recreate(this.center, width, height)
  }

  /**
   * Create a copy of this symbol with new center/dimensions, preserving
   * all symbol-specific options (variant, etc.).
   */
  protected abstract recreate(
    center: PointLike,
    width: number,
    height: number
  ): CircuitSymbol
}

/**
 * Standard two-terminal port table: `in` at the west box edge, `out` at
 * the east edge (where the leads exit). Cardinals like 'west'/'east'
 * resolve to the same points via anchorOnRect — the table only needs
 * the semantic names.
 */
export function twoTerminalPorts(
  center: PointLike,
  width: number
): Record<string, Point> {
  return {
    in: point(center.x - width / 2, center.y),
    out: point(center.x + width / 2, center.y),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Port-name vocabulary — compile-time constants mirroring the runtime
// port tables (pinned equal by tests). Annotate your own constants with
// these unions so typo'd ports are compile errors:
//   const p: OpAmpPort = 'out'
//   wire(pic, [`U1.${p}`])
// ─────────────────────────────────────────────────────────────────────────────

/** Port names of two-terminal symbols (resistor, capacitor, …). */
export const TWO_TERMINAL_PORTS = ['in', 'out'] as const
export type TwoTerminalPort = (typeof TWO_TERMINAL_PORTS)[number]

/** Port names of the op-amp (`in-`/`-` are aliases, as are `in+`/`+`). */
export const OPAMP_PORTS = ['in-', '-', 'in+', '+', 'out'] as const
export type OpAmpPort = (typeof OPAMP_PORTS)[number]

/** Port names of the ground symbol. */
export const GROUND_PORTS = ['in'] as const
export type GroundPort = (typeof GROUND_PORTS)[number]

/** Every circuit port name (ground's `'in'` is the two-terminal one). */
export const CIRCUIT_PORTS = ['in', 'out', 'in-', '-', 'in+', '+'] as const
export type CircuitPort = (typeof CIRCUIT_PORTS)[number]

/**
 * Base class for two-terminal symbols (resistor, capacitor, inductor,
 * diode, switch, sources): wires the standard `in`/`out` port table
 * and adds TYPED port accessors, so code-first users can write
 * `r1.out` (a Point — compile-time checked) instead of the string
 * spec `'R1.out'` (runtime-resolved). Both reference the same lead
 * tips; mix freely.
 */
export abstract class TwoTerminalSymbol extends CircuitSymbol {
  protected portTable(): Record<string, Point> {
    return twoTerminalPorts(this.center, this.width)
  }

  /** West lead tip — typed form of `anchor('in')`. */
  get in(): Point {
    return this.anchor('in')
  }

  /** East lead tip — typed form of `anchor('out')`. */
  get out(): Point {
    return this.anchor('out')
  }
}

/**
 * Resolve symbol dimensions from {@link ShapeOptions}.
 *
 * Circuit symbols have an intrinsic default size (a readable resistor
 * is 60×20, not 20×20). Node coerces unset dimensions up to
 * minWidth/minHeight before calling shape factories, so a symbol can
 * only distinguish "caller set a size" from "defaulted" by comparing
 * against the minimums: width/height override the intrinsic default
 * only when they EXCEED the corresponding minimum.
 */
export function symbolSize(
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
