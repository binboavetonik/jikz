/**
 * Logic gates — jikz's analogue of TikZ's `shapes.gates.logic.US` /
 * `.IEC`. Built on the public extension seams (shape registry, port
 * anchors, `node({ rotate })`).
 *
 * Usage:
 * ```ts
 * import { picture, registerGates, gates, point } from 'jikz'
 *
 * registerGates()  // once, like \usetikzlibrary{shapes.gates.logic.US}
 *
 * const pic = picture()
 *   .node('A', gates.and({ at: point(60, 40) }))
 *   .node('B', gates.or({ at: point(60, 100) }))
 *   .node('N', gates.not({ at: point(180, 40) }))
 *   .edge('A.out', 'N.in')
 *   .edge('N.out', 'B.in1')
 * pic.toSVG({ width: 260, height: 140 })
 * ```
 *
 * Ports: `in1`/`in2`/`out` (two-input gates), `in`/`out` (`not`/
 * `buffer`) — and the factories hand back the matching class, so a
 * gate's type exposes exactly the ports it has. Negated gates draw a
 * bubble; `variant: 'iec'` draws the rectangular IEC body (pass `text`
 * for the `&`/`≥1`/`=1`/`1` symbol).
 */
import type { Point } from '../../core/Point'
import { registerShape } from '../../geometry/registry'
import { assertType, type ShapeType } from '../../node/Node'
import {
  gate,
  type BinaryGate,
  type LogicGateOptions,
  type UnaryGate,
} from './gate'

export {
  LogicGate,
  UnaryGate,
  BinaryGate,
  isUnaryGate,
  gate,
  andGate,
  nandGate,
  orGate,
  norGate,
  xorGate,
  xnorGate,
  notGate,
  bufferGate,
  GATE_DEFAULT_WIDTH,
  GATE_DEFAULT_HEIGHT,
} from './gate'
export type {
  GateKind,
  UnaryGateKind,
  BinaryGateKind,
  GateVariant,
  LogicGateOptions,
} from './gate'
export { gates } from './builders'
export type { GateBuilder } from './builders'

/** Shape names registered by {@link registerGates}. */
export const GATE_SHAPES = [
  'and',
  'nand',
  'or',
  'nor',
  'xor',
  'xnor',
  'not',
  'buffer',
] as const

/** Gate shape names registered by {@link registerGates}. */
export type GateShapeName = (typeof GATE_SHAPES)[number]

// ─────────────────────────────────────────────────────────────────────────────
// Port-name vocabulary — compile-time constants mirroring the runtime
// port tables (pinned equal by tests), split the way the classes are.
// Annotate your own constants with these unions so typo'd ports are
// compile errors:
//   const p: BinaryGatePort = 'in1'
//   pic.edge(`A.${p}`, 'N.in')
// ─────────────────────────────────────────────────────────────────────────────

/** Port names of one-input gates (`not`, `buffer`). */
export const UNARY_GATE_PORTS = ['in', 'out'] as const
export type UnaryGatePort = (typeof UNARY_GATE_PORTS)[number]

/** Port names of two-input gates. */
export const BINARY_GATE_PORTS = ['in1', 'in2', 'out'] as const
export type BinaryGatePort = (typeof BINARY_GATE_PORTS)[number]

/** Every gate port name, either arity. */
export const GATE_PORTS = ['in', 'in1', 'in2', 'out'] as const
export type GatePort = (typeof GATE_PORTS)[number]

/**
 * Type-level registration — the compile-time half of
 * `\usetikzlibrary{shapes.gates.logic.US}`. Adds the gate names to
 * `ShapeType` and types `shapeOptions.variant`. Runtime resolution still
 * requires {@link registerGates}.
 */
declare module '../../node/Node' {
  interface ShapeRegistry {
    and: Pick<LogicGateOptions, 'variant'>
    nand: Pick<LogicGateOptions, 'variant'>
    or: Pick<LogicGateOptions, 'variant'>
    nor: Pick<LogicGateOptions, 'variant'>
    xor: Pick<LogicGateOptions, 'variant'>
    xnor: Pick<LogicGateOptions, 'variant'>
    not: Pick<LogicGateOptions, 'variant'>
    buffer: Pick<LogicGateOptions, 'variant'>
  }
}

// Compile-time guard: the augmentation above must cover GATE_SHAPES.
assertType<(typeof GATE_SHAPES)[number] extends ShapeType ? true : false>()

// Compile-time guards: a gate's TYPE exposes exactly the ports it has,
// so reaching for the wrong arity's port is an error at the call site
// rather than an AnchorError at render time.
assertType<UnaryGate extends { in: Point } ? true : false>()
assertType<UnaryGate extends { in1: Point } ? false : true>()
assertType<BinaryGate extends { in1: Point; in2: Point } ? true : false>()
assertType<BinaryGate extends { in: Point } ? false : true>()

let registered = false

/**
 * Register all logic-gate shapes in the global shape registry (TikZ:
 * `\usetikzlibrary{shapes.gates.logic.US}`). Idempotent. After calling,
 * `node({ shape: 'and' })` and `gates.*` builders accept gate names.
 *
 * All gates register with `textAutoSize: false` — intrinsic sizes, no
 * text stretching.
 */
export function registerGates(): void {
  if (registered) return
  const noAuto = { textAutoSize: false }
  for (const name of GATE_SHAPES) {
    registerShape(name, (o) => gate(name, o), noAuto)
  }
  registered = true
}

/** Whether {@link registerGates} has been called. */
export function gatesRegistered(): boolean {
  return registered
}
