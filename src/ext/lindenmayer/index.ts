/**
 * Lindenmayer systems — jikz's analogue of PGF's
 * `lindenmayersystems` library.
 *
 * A system is rules plus (optionally) symbol overrides, exactly as
 * `\pgfdeclarelindenmayersystem` takes them; the axiom, order and
 * step/angle settings are supplied where you use it. The result is an
 * ordinary {@link Path}, traced by a {@link Turtle}:
 *
 * ```ts
 * const koch = lindenmayer(kochCurve, { order: 3, step: 8, angle: 60 })
 * pic.draw(koch)
 * ```
 *
 * The default alphabet is PGF's, character for character:
 *
 * | symbol | action |
 * |---|---|
 * | `F` | draw forward (`\pgflsystemdrawforward`) |
 * | `f` | move forward without drawing (`\pgflsystemmoveforward`) |
 * | `+` | turn left by `leftAngle` (`\pgflsystemturnleft`) |
 * | `-` | turn right by `rightAngle` (`\pgflsystemturnright`) |
 * | `[` | save state (`\pgflsystemsavestate`) |
 * | `]` | restore state, pen up (`\pgflsystemrestorestate`) |
 *
 * A symbol with neither a rule nor an action is skipped, which is what
 * makes pure rewriting symbols like the Hilbert curve's `A` and `B`
 * work. Unlike a turtle, the start heading is east (`0`), because PGF
 * starts an L-system from the identity transform.
 *
 * **One deliberate divergence.** PGF randomizes by
 * `value + rand·percent/20`, an absolute amount that only works out to
 * `percent` % at its own default `step=5pt` — at `step=2pt,
 * randomize step percent=50` (the manual's own example) it can hand
 * back a *negative* step. jikz reads the key the way it is documented,
 * as a percentage of the value being randomized, and seeds the
 * generator so a picture stays reproducible.
 */
import type { PointLike } from '../../core/types'
import type { Path } from '../../path/Path'
import { Turtle, turtle } from '../turtle'

/** PGF's `step`, initially `5pt`. */
export const LSYSTEM_STEP_DEFAULT = 5

/** PGF's `angle`, initially `90` — it sets both left and right. */
export const LSYSTEM_ANGLE_DEFAULT = 90

/**
 * Ceiling on the expanded string, to turn a runaway order into an
 * error rather than a hung tab. PGF has no such guard.
 */
export const LSYSTEM_MAX_SYMBOLS = 1_000_000

/** What the interpreter hands a symbol's action. */
export interface LSystemContext {
  /** The turtle tracing the path. */
  readonly turtle: Turtle
  /** This step's length — PGF's `\pgflsystemcurrentstep`. */
  step(): number
  /** This turn's left angle — PGF's `\pgflsystemcurrentleftangle`. */
  leftAngle(): number
  /** This turn's right angle — PGF's `\pgflsystemcurrentrightangle`. */
  rightAngle(): number
}

/** What one symbol does when the interpreter reaches it. */
export type LSystemAction = (ctx: LSystemContext) => void

/**
 * The six primitives PGF exposes to a `\symbol` body, under the same
 * names. Build a custom alphabet out of these.
 */
export const lsystemActions = {
  /** `\pgflsystemdrawforward` */
  drawForward: (ctx: LSystemContext) => void ctx.turtle.forward(ctx.step()),
  /** `\pgflsystemmoveforward` */
  moveForward: (ctx: LSystemContext) => void ctx.turtle.jump(ctx.step()),
  /** `\pgflsystemturnleft` */
  turnLeft: (ctx: LSystemContext) => void ctx.turtle.left(ctx.leftAngle()),
  /** `\pgflsystemturnright` */
  turnRight: (ctx: LSystemContext) => void ctx.turtle.right(ctx.rightAngle()),
  /** `\pgflsystemsavestate` */
  saveState: (ctx: LSystemContext) => void ctx.turtle.push(),
  /** `\pgflsystemrestorestate` */
  restoreState: (ctx: LSystemContext) => void ctx.turtle.pop(),
} as const

/** PGF's default alphabet. */
export const DEFAULT_SYMBOLS: Readonly<Record<string, LSystemAction>> = {
  F: lsystemActions.drawForward,
  f: lsystemActions.moveForward,
  '+': lsystemActions.turnLeft,
  '-': lsystemActions.turnRight,
  '[': lsystemActions.saveState,
  ']': lsystemActions.restoreState,
}

/** A declared system — PGF's `\pgfdeclarelindenmayersystem` body. */
export interface LindenmayerSystem {
  /** Production rules, `\rule{F -> F-F++F-F}` as `{ F: 'F-F++F-F' }`. */
  rules?: Readonly<Record<string, string>>
  /**
   * Symbol actions overriding {@link DEFAULT_SYMBOLS} — PGF's
   * `\symbol{X}{…}`.
   */
  symbols?: Readonly<Record<string, LSystemAction>>
  /**
   * Starting string. PGF keeps the axiom at the use site; allowing it
   * on the system too lets a named system carry its usual one.
   */
  axiom?: string
}

/** Options for {@link lindenmayer}. */
export interface LSystemOptions {
  /** Overrides the system's own {@link LindenmayerSystem.axiom}. */
  axiom?: string
  /** How many times to apply the rules. Default `0` — the bare axiom. */
  order?: number
  /** PGF's `step`. Default {@link LSYSTEM_STEP_DEFAULT}. */
  step?: number
  /** PGF's `angle` — sets both sides. Default {@link LSYSTEM_ANGLE_DEFAULT}. */
  angle?: number
  /** PGF's `left angle`, overriding `angle`. */
  leftAngle?: number
  /** PGF's `right angle`, overriding `angle`. */
  rightAngle?: number
  /** PGF's `randomize step percent`. Default `0`. */
  randomizeStepPercent?: number
  /** PGF's `randomize angle percent`. Default `0`. */
  randomizeAnglePercent?: number
  /** Seed for the randomization, so pictures stay reproducible. Default `1`. */
  seed?: number
  /** Where to start. Default: the origin. */
  at?: PointLike
  /** Start heading in screen degrees. Default `0` (east), as PGF. */
  direction?: number
}

/** Deterministic PRNG (mulberry32), as used by the force layout. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Apply the rules `order` times — PGF expands lazily per symbol, which
 * for context-free rules comes to the same string.
 *
 * @throws if the result would exceed {@link LSYSTEM_MAX_SYMBOLS}
 */
export function expandLSystem(
  system: LindenmayerSystem,
  axiom: string,
  order: number
): string {
  const rules = system.rules ?? {}
  let current = axiom
  for (let i = 0; i < Math.max(0, Math.trunc(order)); i++) {
    let next = ''
    for (const symbol of current) {
      next += rules[symbol] ?? symbol
      if (next.length > LSYSTEM_MAX_SYMBOLS) {
        throw new RangeError(
          `Lindenmayer expansion exceeded ${LSYSTEM_MAX_SYMBOLS} symbols at order ${i + 1}; lower the order.`
        )
      }
    }
    if (next === current) break // no rule fired — further passes cannot change it
    current = next
  }
  return current
}

/**
 * Expand a system and trace it, returning the {@link Path}.
 *
 * ```ts
 * pic.draw(lindenmayer(kochCurve, { order: 4, step: 4, angle: 60 }))
 * ```
 */
export function lindenmayer(system: LindenmayerSystem, options: LSystemOptions = {}): Path {
  const axiom = options.axiom ?? system.axiom ?? ''
  const expanded = expandLSystem(system, axiom, options.order ?? 0)

  const baseStep = options.step ?? LSYSTEM_STEP_DEFAULT
  const angle = options.angle ?? LSYSTEM_ANGLE_DEFAULT
  const baseLeft = options.leftAngle ?? angle
  const baseRight = options.rightAngle ?? angle
  const stepPercent = options.randomizeStepPercent ?? 0
  const anglePercent = options.randomizeAnglePercent ?? 0
  const rng = mulberry32(options.seed ?? 1)

  /** PGF's `rand`: a value in [-1, 1]. */
  const rand = () => rng() * 2 - 1
  const jitter = (value: number, percent: number) =>
    percent === 0 ? value : value * (1 + (rand() * percent) / 100)

  const t = turtle({
    at: options.at,
    direction: options.direction ?? 0,
    distance: baseStep,
  })

  const ctx: LSystemContext = {
    turtle: t,
    step: () => jitter(baseStep, stepPercent),
    leftAngle: () => jitter(baseLeft, anglePercent),
    rightAngle: () => jitter(baseRight, anglePercent),
  }

  const symbols = { ...DEFAULT_SYMBOLS, ...system.symbols }
  for (const symbol of expanded) {
    // A symbol with no action is skipped — that is what lets pure
    // rewriting symbols like the Hilbert curve's A and B exist.
    symbols[symbol]?.(ctx)
  }

  return t.path
}

/**
 * The Koch curve, as the PGF manual declares it:
 * `\rule{F -> F-F++F-F}`, drawn with `axiom=F++F++F` and `angle=60`
 * for the snowflake.
 */
export const kochCurve: LindenmayerSystem = {
  rules: { F: 'F-F++F-F' },
  axiom: 'F++F++F',
}

/**
 * The Hilbert curve, as the PGF manual declares it — including its
 * swapped `+`/`-` and its `X`, which is the symbol that actually
 * draws. `A` and `B` only rewrite.
 */
export const hilbertCurve: LindenmayerSystem = {
  symbols: {
    X: lsystemActions.drawForward,
    '+': lsystemActions.turnRight,
    '-': lsystemActions.turnLeft,
  },
  rules: {
    A: '+BX-AXA-XB+',
    B: '-AX+BXB+XA-',
  },
  axiom: 'A',
}
