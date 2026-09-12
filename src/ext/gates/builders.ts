/**
 * Typed node-option builders — the code-first API for logic gates,
 * mirroring {@link circuit} in ext/circuits. Each returns ordinary
 * {@link NodeOptions}; string specs (`node({ shape: 'and' })`) remain
 * the data-driven route.
 */
import type { NodeOptions } from '../../node/Node'
import type { GateKind, GateVariant } from './gate'

/** NodeOptions minus the fields a builder fills in for you. */
type BaseOptions = Omit<NodeOptions, 'shape' | 'shapeOptions'>

function build(
  shape: GateKind,
  base: BaseOptions,
  variant?: GateVariant
): NodeOptions {
  return variant ? { ...base, shape, shapeOptions: { variant } } : { ...base, shape }
}

/**
 * Typed node-option builders, one per gate.
 */
export const gates = {
  /** AND gate. */
  and(options: BaseOptions & { variant?: GateVariant } = {}): NodeOptions {
    const { variant, ...base } = options
    return build('and', base, variant)
  },
  /** NAND gate (negated AND). */
  nand(options: BaseOptions & { variant?: GateVariant } = {}): NodeOptions {
    const { variant, ...base } = options
    return build('nand', base, variant)
  },
  /** OR gate. */
  or(options: BaseOptions & { variant?: GateVariant } = {}): NodeOptions {
    const { variant, ...base } = options
    return build('or', base, variant)
  },
  /** NOR gate (negated OR). */
  nor(options: BaseOptions & { variant?: GateVariant } = {}): NodeOptions {
    const { variant, ...base } = options
    return build('nor', base, variant)
  },
  /** XOR gate. */
  xor(options: BaseOptions & { variant?: GateVariant } = {}): NodeOptions {
    const { variant, ...base } = options
    return build('xor', base, variant)
  },
  /** XNOR gate (negated XOR). */
  xnor(options: BaseOptions & { variant?: GateVariant } = {}): NodeOptions {
    const { variant, ...base } = options
    return build('xnor', base, variant)
  },
  /** NOT gate (inverter). */
  not(options: BaseOptions & { variant?: GateVariant } = {}): NodeOptions {
    const { variant, ...base } = options
    return build('not', base, variant)
  },
  /** Buffer gate. */
  buffer(options: BaseOptions & { variant?: GateVariant } = {}): NodeOptions {
    const { variant, ...base } = options
    return build('buffer', base, variant)
  },
} as const

/** The type of {@link gates} — the typed builder namespace. */
export type GateBuilder = typeof gates
