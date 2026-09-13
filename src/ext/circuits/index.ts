/**
 * Electrical circuit symbols — jikz's analogue of TikZ's
 * `\usetikzlibrary{circuits.ee}`.
 *
 * Built entirely on the library's public extension seams: shape kinds
 * ({@link defineShape}), the anchor system (port
 * interception + `anchorOn*` delegation), and standard node options
 * (`rotate`, `anchor`, `labels`).
 *
 * Usage:
 * ```ts
 * import { picture, circuitShapes, wire, junctionDot, point } from 'jikz'
 *
 * const pic = picture({ shapes: circuitShapes })
 *   .node('V1', { shape: 'voltage source', at: point(60, 100), rotate: 90 })
 *   .node('R1', { shape: 'resistor', at: point(140, 40) })
 *   .node('C1', { shape: 'capacitor', at: point(220, 100), rotate: 90 })
 * wire(pic, ['V1.out', point(60, 40), 'R1.in'])
 * wire(pic, ['R1.out', point(220, 40), 'C1.in'])
 * pic.fill(junctionDot(point(220, 40)))
 * pic.toSVG({ width: 300, height: 200 })
 * ```
 *
 * Symbols have intrinsic default sizes (resistor: 60×20 including lead
 * stubs); pass width/height to scale. Ports are named anchors ('in',
 * 'out', '+', '-', …) sitting at lead tips on the bounding-box edges,
 * so edges between ports continue the wire seamlessly. Rotate symbols
 * with `node({ rotate })`; place them by terminal with
 * `node({ at, anchor: 'in' })`. All symbols opt out of text
 * auto-sizing — annotate with `labels`, never `text`.
 */
import { defineShape, type ShapeSet } from '../../geometry/ShapeKind'
import type { ResistorOptions } from './symbols/resistor'
import type { CapacitorOptions } from './symbols/capacitor'
import type { DiodeOptions } from './symbols/diode'
import type { SwitchOptions } from './symbols/switch'
import type { InductorOptions } from './symbols/inductor'
import type { SourceOptions } from './symbols/sources'
import type { GroundOptions } from './symbols/ground'
import type { OpAmpOptions } from './symbols/opamp'
import { resistor } from './symbols/resistor'
import { capacitor } from './symbols/capacitor'
import { inductor } from './symbols/inductor'
import { diode } from './symbols/diode'
import { createSwitch } from './symbols/switch'
import { voltageSource, currentSource } from './symbols/sources'
import { ground } from './symbols/ground'
import { opAmp } from './symbols/opamp'

export { TwoTerminalSymbol, twoTerminalPorts } from './ports'
export {
  TWO_TERMINAL_PORTS,
  OPAMP_PORTS,
  GROUND_PORTS,
  CIRCUIT_PORTS,
} from './ports'
export type {
  TwoTerminalPort,
  OpAmpPort,
  GroundPort,
  CircuitPort,
} from './ports'
export { junctionDot, wire } from './wires'
export { circuit } from './builders'
export type { CircuitBuilder } from './builders'

export {
  Resistor,
  resistor,
  RESISTOR_DEFAULT_WIDTH,
  RESISTOR_DEFAULT_HEIGHT,
} from './symbols/resistor'
export type { ResistorOptions, ResistorVariant } from './symbols/resistor'

export {
  Capacitor,
  capacitor,
  CAPACITOR_DEFAULT_WIDTH,
  CAPACITOR_DEFAULT_HEIGHT,
} from './symbols/capacitor'
export type { CapacitorOptions, CapacitorVariant } from './symbols/capacitor'

export {
  Inductor,
  inductor,
  INDUCTOR_DEFAULT_WIDTH,
  INDUCTOR_DEFAULT_HEIGHT,
} from './symbols/inductor'
export type { InductorOptions } from './symbols/inductor'

export { Diode, diode, DIODE_DEFAULT_WIDTH, DIODE_DEFAULT_HEIGHT } from './symbols/diode'
export type { DiodeOptions, DiodeVariant } from './symbols/diode'

export { Switch, createSwitch, SWITCH_DEFAULT_WIDTH, SWITCH_DEFAULT_HEIGHT } from './symbols/switch'
export type { SwitchOptions, SwitchVariant } from './symbols/switch'

export {
  VoltageSource,
  CurrentSource,
  voltageSource,
  currentSource,
  SOURCE_DEFAULT_WIDTH,
  SOURCE_DEFAULT_HEIGHT,
} from './symbols/sources'
export type { SourceOptions } from './symbols/sources'

export { Ground, ground, GROUND_DEFAULT_WIDTH, GROUND_DEFAULT_HEIGHT } from './symbols/ground'
export type { GroundOptions } from './symbols/ground'

export { OpAmp, opAmp, OPAMP_DEFAULT_WIDTH, OPAMP_DEFAULT_HEIGHT } from './symbols/opamp'
export type { OpAmpOptions } from './symbols/opamp'

/** Symbols have intrinsic sizes; text never stretches them. */
const NO_AUTO = { textAutoSize: false }

/**
 * The circuit shape set — jikz's `\usetikzlibrary{circuits.ee}`. Hand it
 * to a picture and the names below resolve, with `shapeOptions` typed
 * per symbol (`{ variant: 'iec' }` checks against ResistorVariant):
 *
 * ```ts
 * const pic = picture({ shapes: circuitShapes })
 * pic.node('R1', { shape: 'resistor', shapeOptions: { variant: 'iec' } })
 * ```
 */
export const circuitShapes = {
  resistor: defineShape('resistor', (o: ResistorOptions) => resistor(o), NO_AUTO),
  capacitor: defineShape('capacitor', (o: CapacitorOptions) => capacitor(o), NO_AUTO),
  inductor: defineShape('inductor', (o: InductorOptions) => inductor(o), NO_AUTO),
  diode: defineShape('diode', (o: DiodeOptions) => diode(o), NO_AUTO),
  switch: defineShape('switch', (o: SwitchOptions) => createSwitch(o), NO_AUTO),
  'voltage source': defineShape(
    'voltage source',
    (o: SourceOptions) => voltageSource(o),
    NO_AUTO
  ),
  'current source': defineShape(
    'current source',
    (o: SourceOptions) => currentSource(o),
    NO_AUTO
  ),
  ground: defineShape('ground', (o: GroundOptions) => ground(o), NO_AUTO),
  'op amp': defineShape('op amp', (o: OpAmpOptions) => opAmp(o), NO_AUTO),
} as const satisfies ShapeSet

/** Shape names in {@link circuitShapes}. */
export type CircuitShapeName = keyof typeof circuitShapes
