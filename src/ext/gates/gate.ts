/**
 * Logic gates — jikz's analogue of TikZ's `shapes.gates.logic.US` (ANSI)
 * and `.IEC` libraries. Built on the same public seams as ext/circuits:
 * the shape registry, port interception, and `node({ rotate })`.
 *
 * Gates are two- or one-input boxes with a distinctive body:
 *
 *   - `and`/`nand`   — D-shape (flat left, semicircular right)
 *   - `or`/`nor`     — concave left edge, pointed right
 *   - `xor`/`xnor`   — `or` plus an extra "exclusive" arc on the left
 *   - `not`/`buffer` — a right-pointing triangle
 *
 * Negated gates (`nand`, `nor`, `xnor`, `not`) draw a negation bubble at
 * the output. `variant: 'iec'` draws the plain rectangular IEC body
 * instead (pass `text: '&'` / `text: '≥1'` / `text: '=1'` / `text: '1'`
 * on the node for the IEC symbol — shapes never stretch to fit text).
 *
 * Ports: `in1`/`in2`/`out` for two-input gates, `in`/`out` for
 * `not`/`buffer`. Draw horizontally; rotate with `node({ rotate })`.
 */
import { Point, point } from '../../core/Point'
import type { PointLike } from '../../core/types'
import type { ShapeOptions } from '../../geometry/Shape'
import { CircuitSymbol, symbolSize } from '../circuits/ports'

/** Gate type — doubles as the shape name registered in the registry. */
export type GateKind =
  | 'and'
  | 'nand'
  | 'or'
  | 'nor'
  | 'xor'
  | 'xnor'
  | 'not'
  | 'buffer'

/** Drawing style: ANSI distinctive shapes, or IEC rectangle. */
export type GateVariant = 'ansi' | 'iec'

/** Logic-gate shape options. */
export interface LogicGateOptions extends ShapeOptions {
  /** Drawing style. Default: 'ansi'. */
  variant?: GateVariant
}

/** Intrinsic gate width (including lead stubs) when no width is given. */
export const GATE_DEFAULT_WIDTH = 70
/** Intrinsic gate height when no height is given. */
export const GATE_DEFAULT_HEIGHT = 50

/** Lead stub length at each input/output. */
const LEAD = 10
/** Negation-bubble radius. */
const BUBBLE_R = 5
/** Extra "exclusive" arc offset (XOR/XNOR). */
const XOR_OFFSET = 8
/** OR left-edge radius as a fraction of height (≈0.25·H sagitta). */
const OR_RADIUS = 0.625

/** Gate kinds whose ANSI body has a concave back (the OR family). */
const OR_FAMILY: ReadonlySet<GateKind> = new Set(['or', 'nor', 'xor', 'xnor'])

/** Gate kinds that draw a negation bubble at the output. */
const NEGATED: Readonly<Record<GateKind, boolean>> = {
  and: false,
  nand: true,
  or: false,
  nor: true,
  xor: false,
  xnor: true,
  not: true,
  buffer: false,
}

/** A small circle at (cx, cy) — used for the negation bubble. */
function circleAt(cx: number, cy: number, r: number): string {
  return `M ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} Z`
}

/**
 * Derived box geometry — the single source of truth for where the leads
 * sit, shared by the port table and the drawing so the two cannot drift.
 */
interface GateGeometry {
  cy: number
  /** West box edge: where input leads start (and the input ports sit). */
  westX: number
  /** East box edge: the `out` port, and the bubble's right edge. */
  eastX: number
  /** Body's left edge — where a flat-backed body meets its leads. */
  x1: number
  /** Body's right extent — where the output lead or bubble begins. */
  x2: number
  top: number
  bot: number
  halfH: number
  /** y of each input lead: one for `not`/`buffer`, two otherwise. */
  inputY: readonly number[]
}

/**
 * A logic gate symbol. Drawn horizontally (inputs west, output east);
 * rotate with `node({ rotate })`. Ports are answered first from the
 * port table, then delegate to the box via {@link CircuitSymbol.anchor}.
 */
export class LogicGate extends CircuitSymbol {
  readonly type: GateKind
  readonly variant: GateVariant
  /** Number of input ports — 1 for `not`/`buffer`, else 2. */
  readonly inputs: number

  constructor(
    center: PointLike,
    width: number,
    height: number,
    type: GateKind,
    variant: GateVariant = 'ansi'
  ) {
    super(center, width, height)
    this.type = type
    this.variant = variant
    this.inputs = type === 'not' || type === 'buffer' ? 1 : 2
  }

  private geometry(): GateGeometry {
    const cx = this.center.x
    const cy = this.center.y
    const halfW = this.width / 2
    const halfH = this.height / 2
    return {
      cy,
      westX: cx - halfW,
      eastX: cx + halfW,
      x1: cx - halfW + LEAD,
      x2: cx + halfW - LEAD,
      top: cy - halfH,
      bot: cy + halfH,
      halfH,
      inputY: this.inputs === 1 ? [cy] : [cy - halfH / 2, cy + halfH / 2],
    }
  }

  protected portTable(): Record<string, Point> {
    const { cy, westX, eastX, inputY } = this.geometry()
    const ports: Record<string, Point> = { out: point(eastX, cy) }
    if (this.inputs === 1) {
      ports.in = point(westX, inputY[0]!)
    } else {
      ports.in1 = point(westX, inputY[0]!)
      ports.in2 = point(westX, inputY[1]!)
    }
    return ports
  }

  /** Output lead tip (east box edge). */
  get out(): Point {
    return this.anchor('out')
  }

  /** Input lead tip (west box edge) — `not`/`buffer` only. */
  get in(): Point {
    return this.anchor('in')
  }

  /** First input lead tip (two-input gates only). */
  get in1(): Point {
    return this.anchor('in1')
  }

  /** Second input lead tip (two-input gates only). */
  get in2(): Point {
    return this.anchor('in2')
  }

  toSVGPath(): string {
    const g = this.geometry()
    const parts: string[] = []

    // Input leads, each ending ON the body (see leadEndX).
    for (const y of g.inputY) {
      parts.push(`M ${g.westX} ${y} L ${this.leadEndX(g, y)} ${y}`)
    }

    // Body.
    parts.push(this.bodyPath(g))

    // Negation bubble + output lead. The bubble fills the output lead
    // region — its right edge is the `out` port, so no separate lead.
    if (NEGATED[this.type]) {
      parts.push(circleAt(g.eastX - BUBBLE_R, g.cy, BUBBLE_R))
    } else {
      parts.push(`M ${g.x2} ${g.cy} L ${g.eastX} ${g.cy}`)
    }

    return parts.join(' ')
  }

  /**
   * Where an input lead at height `y` meets the body. Flat-backed bodies
   * (AND family, IEC rectangle, NOT/buffer triangle) take it to the
   * body's left edge; the OR family's back is an arc through the two
   * corners, so its leads run on to the arc itself — stopping at `x1`
   * would leave them floating ~0.4·halfH short. XOR/XNOR leads then
   * cross the exclusive arc, as in the standard drawing.
   */
  private leadEndX(g: GateGeometry, y: number): number {
    if (this.variant === 'iec' || !OR_FAMILY.has(this.type)) return g.x1
    const r = OR_RADIUS * g.halfH * 2
    const arcCx = g.x1 - Math.sqrt(r * r - g.halfH * g.halfH)
    const dy = y - g.cy
    // Rounded: the only irrational coordinate in the path data.
    return Number((arcCx + Math.sqrt(r * r - dy * dy)).toFixed(3))
  }

  private bodyPath(g: GateGeometry): string {
    const { cy, x1, x2, top, bot, halfH } = g

    if (this.variant === 'iec') {
      return `M ${x1} ${top} L ${x2} ${top} L ${x2} ${bot} L ${x1} ${bot} Z`
    }

    switch (this.type) {
      case 'and':
      case 'nand': {
        // Half-ellipse nose sweeping RIGHT, so the body meets the output
        // lead (or bubble) at x2. rx shrinks on tall gates — with a plain
        // halfH radius the nose would start left of x1 and the body would
        // double back over its own flat edge.
        const rx = Math.min(halfH, x2 - x1)
        const xflat = x2 - rx
        const flat = xflat > x1 ? ` L ${xflat} ${bot}` : ''
        return `M ${x1} ${top} L ${x1} ${bot}${flat} A ${rx} ${halfH} 0 0 0 ${xflat} ${top} Z`
      }
      case 'or':
      case 'nor': {
        const r = OR_RADIUS * halfH * 2
        return `M ${x1} ${top} A ${r} ${r} 0 0 1 ${x1} ${bot} L ${x2} ${cy} Z`
      }
      case 'xor':
      case 'xnor': {
        const r = OR_RADIUS * halfH * 2
        const ex = x1 - XOR_OFFSET
        // Traced out and back: the exclusive arc encloses no area, so a
        // filled gate doesn't paint the sliver between it and the body.
        const extra =
          `M ${ex} ${top} A ${r} ${r} 0 0 1 ${ex} ${bot}` +
          ` A ${r} ${r} 0 0 0 ${ex} ${top}`
        return `M ${x1} ${top} A ${r} ${r} 0 0 1 ${x1} ${bot} L ${x2} ${cy} Z ${extra}`
      }
      case 'not':
      case 'buffer':
        return `M ${x1} ${top} L ${x2} ${cy} L ${x1} ${bot} Z`
    }
  }

  protected recreate(
    center: PointLike,
    width: number,
    height: number
  ): LogicGate {
    return new LogicGate(center, width, height, this.type, this.variant)
  }
}

/**
 * Create a logic gate. Honors {@link symbolSize} (intrinsic 70×50
 * default; width/height override when larger than the minimums).
 */
export function gate(type: GateKind, options: LogicGateOptions = {}): LogicGate {
  const { width, height } = symbolSize(
    options,
    GATE_DEFAULT_WIDTH,
    GATE_DEFAULT_HEIGHT
  )
  return new LogicGate(
    options.center ?? point(0, 0),
    width,
    height,
    type,
    options.variant ?? 'ansi'
  )
}

/** AND gate. */
export function andGate(options: LogicGateOptions = {}): LogicGate {
  return gate('and', options)
}

/** NAND gate. */
export function nandGate(options: LogicGateOptions = {}): LogicGate {
  return gate('nand', options)
}

/** OR gate. */
export function orGate(options: LogicGateOptions = {}): LogicGate {
  return gate('or', options)
}

/** NOR gate. */
export function norGate(options: LogicGateOptions = {}): LogicGate {
  return gate('nor', options)
}

/** XOR gate. */
export function xorGate(options: LogicGateOptions = {}): LogicGate {
  return gate('xor', options)
}

/** XNOR gate. */
export function xnorGate(options: LogicGateOptions = {}): LogicGate {
  return gate('xnor', options)
}

/** NOT gate (inverter). */
export function notGate(options: LogicGateOptions = {}): LogicGate {
  return gate('not', options)
}

/** Buffer gate. */
export function bufferGate(options: LogicGateOptions = {}): LogicGate {
  return gate('buffer', options)
}
