/**
 * Electrical circuit symbols — jikz's analogue of TikZ's
 * `\usetikzlibrary{circuits.ee}`.
 *
 * Built entirely on the library's public extension seams: the shape
 * registry ({@link registerShape}), the anchor system (port
 * interception + `anchorOn*` delegation), and standard node options
 * (`rotate`, `anchor`, `labels`).
 *
 * Usage:
 * ```ts
 * import { picture, registerCircuits, wire, junctionDot, point } from 'jikz'
 *
 * registerCircuits()  // once, like \usetikzlibrary{circuits.ee}
 *
 * const pic = picture()
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
import { registerShape } from '../../geometry/registry'
import { assertType, type ShapeType } from '../../node/Node'
import type { ResistorOptions } from './symbols/resistor'
import type { CapacitorOptions } from './symbols/capacitor'
import type { DiodeOptions } from './symbols/diode'
import type { SwitchOptions } from './symbols/switch'
import { resistor } from './symbols/resistor'
import { capacitor } from './symbols/capacitor'
import { inductor } from './symbols/inductor'
import { diode } from './symbols/diode'
import { createSwitch } from './symbols/switch'
import { voltageSource, currentSource } from './symbols/sources'
import { ground } from './symbols/ground'
import { opAmp } from './symbols/opamp'

export { CircuitSymbol, TwoTerminalSymbol, symbolSize, twoTerminalPorts } from './ports'
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

/** Shape names registered by {@link registerCircuits}. */
export const CIRCUIT_SHAPES = [
  'resistor',
  'capacitor',
  'inductor',
  'diode',
  'switch',
  'voltage source',
  'current source',
  'ground',
  'op amp',
] as const

/** Symbol shape names registered by {@link registerCircuits}. */
export type CircuitShapeName = (typeof CIRCUIT_SHAPES)[number]

/**
 * Type-level registration — the compile-time half of
 * `\usetikzlibrary{circuits.ee}`. Adds the circuit names to
 * `ShapeType`, so `node({ shape: 'op amp' })` autocompletes in the IDE
 * and misspelled names are compile errors instead of runtime throws —
 * and the registry VALUES type `shapeOptions` per symbol
 * (`{ variant: 'iec' }` checks against ResistorVariant). Runtime
 * resolution still requires {@link registerCircuits}.
 */
declare module '../../node/Node' {
  interface ShapeRegistry {
    resistor: Pick<ResistorOptions, 'variant'>
    capacitor: Pick<CapacitorOptions, 'variant'>
    inductor: {}
    diode: Pick<DiodeOptions, 'variant'>
    switch: Pick<SwitchOptions, 'variant'>
    'voltage source': {}
    'current source': {}
    ground: {}
    'op amp': {}
  }
}

// Compile-time guard: the augmentation above must cover CIRCUIT_SHAPES.
assertType<(typeof CIRCUIT_SHAPES)[number] extends ShapeType ? true : never>()

let registered = false

/**
 * Register all circuit symbol shapes in the global shape registry
 * (TikZ: `\usetikzlibrary{circuits.ee}`). Idempotent. After calling,
 * `node({ shape: 'resistor' })`, `Picture.node`, and layout builders
 * accept circuit shape names.
 *
 * All symbols register with `textAutoSize: false` — they have
 * intrinsic sizes and never stretch to fit text.
 */
export function registerCircuits(): void {
  if (registered) return
  const noAuto = { textAutoSize: false }
  registerShape('resistor', (o) => resistor(o), noAuto)
  registerShape('capacitor', (o) => capacitor(o), noAuto)
  registerShape('inductor', (o) => inductor(o), noAuto)
  registerShape('diode', (o) => diode(o), noAuto)
  registerShape('switch', (o) => createSwitch(o), noAuto)
  registerShape('voltage source', (o) => voltageSource(o), noAuto)
  registerShape('current source', (o) => currentSource(o), noAuto)
  registerShape('ground', (o) => ground(o), noAuto)
  registerShape('op amp', (o) => opAmp(o), noAuto)
  registered = true
}

/** Whether {@link registerCircuits} has been called. */
export function circuitsRegistered(): boolean {
  return registered
}
