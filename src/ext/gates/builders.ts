/**
 * Typed node-option builders — the code-first API for logic gates,
 * mirroring {@link circuit} in ext/circuits. Each returns ordinary
 * {@link NodeOptions} carrying the gate's shape kind, so they need no
 * shape set; string specs (`node({ shape: 'and' })` against a picture
 * holding {@link gateShapes}) remain the data-driven route.
 */
import type { NodeOptions } from '../../node/Node'
import { gateShapes } from './index'
import type { GateKind, GateVariant } from './gate'

/** NodeOptions minus the fields a builder fills in for you. */
type BaseOptions = Omit<NodeOptions, 'shape' | 'shapeOptions'>

/** What every gate builder takes: node options plus the drawing style. */
export type GateNodeOptions = BaseOptions & { variant?: GateVariant }

function build(kind: GateKind, options: GateNodeOptions): NodeOptions {
  const { variant, ...base } = options
  const shape = gateShapes[kind]
  return variant
    ? { ...base, shape, shapeOptions: { variant } }
    : { ...base, shape }
}

/**
 * Typed node-option builders, one per gate.
 */
export const gates = {
  /** AND gate. */
  and(options: GateNodeOptions = {}): NodeOptions {
    return build('and', options)
  },
  /** NAND gate (negated AND). */
  nand(options: GateNodeOptions = {}): NodeOptions {
    return build('nand', options)
  },
  /** OR gate. */
  or(options: GateNodeOptions = {}): NodeOptions {
    return build('or', options)
  },
  /** NOR gate (negated OR). */
  nor(options: GateNodeOptions = {}): NodeOptions {
    return build('nor', options)
  },
  /** XOR gate. */
  xor(options: GateNodeOptions = {}): NodeOptions {
    return build('xor', options)
  },
  /** XNOR gate (negated XOR). */
  xnor(options: GateNodeOptions = {}): NodeOptions {
    return build('xnor', options)
  },
  /** NOT gate (inverter). */
  not(options: GateNodeOptions = {}): NodeOptions {
    return build('not', options)
  },
  /** Buffer gate. */
  buffer(options: GateNodeOptions = {}): NodeOptions {
    return build('buffer', options)
  },
} as const

/** The type of {@link gates} — the typed builder namespace. */
export type GateBuilder = typeof gates
