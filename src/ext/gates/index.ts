/**
 * Logic gates — jikz's analogue of TikZ's `shapes.gates.logic.US` /
 * `.IEC`. Built on the public extension seams (shape registry, port
 * anchors, `node({ rotate })`).
 *
 * Usage:
 * ```ts
 * import { picture, gateShapes, gates, point } from 'jikz'
 *
 * const pic = picture({ shapes: gateShapes })
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
import { defineShape } from '../../geometry/ShapeKind'
import { assertType } from '../../node/Node'
import {
  gate,
  type BinaryGate,
  type GateKind,
  type LogicGateOptions,
  type UnaryGate,
} from './gate'

/** Gates have intrinsic sizes; text never stretches them. */
const NO_AUTO = { textAutoSize: false }

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

/**
 * The logic-gate shape set — jikz's `\usetikzlibrary{shapes.gates.logic.US}`.
 * Hand it to a picture (alone or merged with others) and the names
 * below resolve, with `shapeOptions` typed per gate:
 *
 * ```ts
 * const pic = picture({ shapes: { ...basicShapes, ...gateShapes } })
 * pic.node('A', { shape: 'and' })
 * pic.node('B', { shape: 'not', shapeOptions: { variant: 'iec' } })
 * ```
 *
 * Every gate opts out of text auto-sizing: they have intrinsic sizes
 * and never stretch to fit text.
 */
export const gateShapes = {
  and: defineShape('and', (o: LogicGateOptions) => gate('and', o), NO_AUTO),
  nand: defineShape('nand', (o: LogicGateOptions) => gate('nand', o), NO_AUTO),
  or: defineShape('or', (o: LogicGateOptions) => gate('or', o), NO_AUTO),
  nor: defineShape('nor', (o: LogicGateOptions) => gate('nor', o), NO_AUTO),
  xor: defineShape('xor', (o: LogicGateOptions) => gate('xor', o), NO_AUTO),
  xnor: defineShape('xnor', (o: LogicGateOptions) => gate('xnor', o), NO_AUTO),
  not: defineShape('not', (o: LogicGateOptions) => gate('not', o), NO_AUTO),
  buffer: defineShape('buffer', (o: LogicGateOptions) => gate('buffer', o), NO_AUTO),
} as const

/** Shape names in {@link gateShapes}. */
export type GateShapeName = keyof typeof gateShapes

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

// Compile-time guards: a gate's TYPE exposes exactly the ports it has,
// so reaching for the wrong arity's port is an error at the call site
// rather than an AnchorError at render time.
assertType<UnaryGate extends { in: Point } ? true : false>()
assertType<UnaryGate extends { in1: Point } ? false : true>()
assertType<BinaryGate extends { in1: Point; in2: Point } ? true : false>()
assertType<BinaryGate extends { in: Point } ? false : true>()

// Compile-time guard: the set must cover every gate kind.
assertType<GateKind extends GateShapeName ? true : false>()
