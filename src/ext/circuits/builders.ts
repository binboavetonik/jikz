/**
 * Typed node-option builders — the code-first API for circuit symbols.
 *
 * The string path (`node({ shape: 'resistor', shapeOptions: … })`) is
 * the TikZ-familiar, data-driven route: the name resolves against the
 * picture's shape set (`picture({ shapes: circuitShapes })`), and the
 * set types both the name and its shapeOptions.
 *
 * These builders are the programmer-facing route: every option is
 * typed, variants autocomplete, and typos are COMPILE errors. They
 * just produce ordinary {@link NodeOptions} — the same objects the
 * string path consumes — so the two mix freely:
 *
 * ```ts
 * pic.node('R1', circuit.resistor({ at: p, rotate: 90, variant: 'iec' }))
 * pic.node('U1', circuit.opAmp({ at: q }))
 * wire(pic, ['R1.out', 'U1.-'])          // string specs still work
 * ```
 */
import type { NodeOptions } from '../../node/Node'
import { circuitShapes, type CircuitShapeName } from './index'
import type { ResistorVariant } from './symbols/resistor'
import type { CapacitorVariant } from './symbols/capacitor'
import type { DiodeVariant } from './symbols/diode'
import type { SwitchVariant } from './symbols/switch'
import type { BatteryVariant } from './symbols/battery'

/** NodeOptions minus the fields a builder fills in for you. */
type BaseOptions = Omit<NodeOptions, 'shape' | 'shapeOptions'>

function build(
  name: CircuitShapeName,
  base: BaseOptions,
  shapeOptions?: Record<string, unknown>
): NodeOptions {
  const shape = circuitShapes[name]
  return shapeOptions ? { ...base, shape, shapeOptions } : { ...base, shape }
}

/**
 * Typed node-option builders, one per circuit symbol. Each returns
 * ordinary {@link NodeOptions} — compile-checked names and variants
 * that mix freely with the string-spec path.
 */
export const circuit = {
  /** Resistor node options. `variant`: ANSI zigzag (default) or IEC box. */
  resistor(options: BaseOptions & { variant?: ResistorVariant } = {}): NodeOptions {
    const { variant, ...base } = options
    return build('resistor', base, variant ? { variant } : undefined)
  },

  /** Capacitor node options. `variant`: normal (default) or polarized. */
  capacitor(options: BaseOptions & { variant?: CapacitorVariant } = {}): NodeOptions {
    const { variant, ...base } = options
    return build('capacitor', base, variant ? { variant } : undefined)
  },

  /** Inductor node options. */
  inductor(options: BaseOptions = {}): NodeOptions {
    return build('inductor', options)
  },

  /** Diode node options. `variant`: standard (default), zener, schottky, or led. */
  diode(options: BaseOptions & { variant?: DiodeVariant } = {}): NodeOptions {
    const { variant, ...base } = options
    return build('diode', base, variant ? { variant } : undefined)
  },

  /** Switch node options. `variant`: open (default) or closed. */
  switch(options: BaseOptions & { variant?: SwitchVariant } = {}): NodeOptions {
    const { variant, ...base } = options
    return build('switch', base, variant ? { variant } : undefined)
  },

  /** Voltage source node options. */
  voltageSource(options: BaseOptions = {}): NodeOptions {
    return build('voltage source', options)
  },

  /** Current source node options. */
  currentSource(options: BaseOptions = {}): NodeOptions {
    return build('current source', options)
  },

  /** Ground node options (single `in` port at the north edge). */
  ground(options: BaseOptions = {}): NodeOptions {
    return build('ground', options)
  },

  /** Op-amp node options (ports: `-`/`in-`, `+`/`in+`, `out`). */
  opAmp(options: BaseOptions = {}): NodeOptions {
    return build('op amp', options)
  },

  /** Battery node options. `variant`: multi-cell (default) or single. */
  battery(options: BaseOptions & { variant?: BatteryVariant } = {}): NodeOptions {
    const { variant, ...base } = options
    return build('battery', base, variant ? { variant } : undefined)
  },

  /** Lamp node options. */
  bulb(options: BaseOptions = {}): NodeOptions {
    return build('bulb', options)
  },

  /** AC supply node options. */
  acSource(options: BaseOptions = {}): NodeOptions {
    return build('ac source', options)
  },

  /** DC supply node options. */
  dcSource(options: BaseOptions = {}): NodeOptions {
    return build('dc source', options)
  },

  /** Ammeter node options — the A meter. */
  ammeter(options: BaseOptions = {}): NodeOptions {
    return build('ammeter', options)
  },

  /** Voltmeter node options — the V meter. */
  voltmeter(options: BaseOptions = {}): NodeOptions {
    return build('voltmeter', options)
  },

  /** Ohmmeter node options — the Ω meter. */
  ohmmeter(options: BaseOptions = {}): NodeOptions {
    return build('ohmmeter', options)
  },
} as const

/** The type of {@link circuit} — the typed builder namespace. */
export type CircuitBuilder = typeof circuit
