/**
 * Circuit-specific port vocabulary and the two-terminal base. The shared
 * machinery — the ported-shape base and intrinsic sizing — lives in
 * `geometry/PortedShape`, since logic gates use it too.
 */
import { Point, point } from '../../core/Point'
import type { PointLike } from '../../core/types'
import { PortedShape } from '../../geometry/PortedShape'

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
export abstract class TwoTerminalSymbol extends PortedShape {
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
