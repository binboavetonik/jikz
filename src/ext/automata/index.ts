/**
 * Finite automata — jikz's analogue of TikZ's `automata` library.
 *
 * TikZ ships this as a handful of `\tikzset` styles rather than new
 * shapes, and the translation keeps that shape:
 *
 *   - `state` is `{circle, draw, minimum size=2.5em}` — an ordinary
 *     circle with a floor on its size.
 *   - `state with output` is `circle split`, which jikz already has.
 *   - `accepting` is `accepting by double`, i.e. the `double` border →
 *     {@link DoubleCircle}, the one genuinely new shape here.
 *   - `initial` is `initial by arrow`: an edge drawn *to* the state
 *     from a point `initial distance` away, carrying the text `start`.
 *     jikz's `edge()` already takes a bare point as an endpoint, so
 *     {@link initialArrow} just works out where that point is.
 *
 * ```ts
 * const pic = picture({ shapes: automataShapes })
 * pic.node('q0', automata.state({ at: point(80, 110), text: 'q0' }))
 * pic.node('q2', automata.accepting({ at: point(360, 110), text: 'q2' }))
 *
 * const start = initialArrow(pic.getNode('q0')!)
 * pic.edge(start.from, 'q0', { arrowEnd: 'stealth' })
 * pic.text(start.textAt, start.text, { at: start.textPlacement })
 * ```
 *
 * Sizes come from TikZ's own defaults at its default 10pt font, where
 * `em` is exactly the font size: `2.5em` → 25.
 */
import { Point, polar } from '../../core/Point'
import type { Anchorable, AnchorSpec } from '../../core/Anchor'
import { Circle } from '../../geometry/Circle'
import { circleSplit } from '../../geometry/complex'
import { defineShape } from '../../geometry/ShapeKind'
import type { ShapeOptions } from '../../geometry/Shape'
import type { NodeOptions } from '../../node/Node'
import { DoubleCircle, type DoubleCircleOptions } from './DoubleCircle'

export {
  DoubleCircle,
  DOUBLE_DISTANCE,
  DOUBLE_SEPARATION_DEFAULT,
} from './DoubleCircle'
export type { DoubleCircleOptions } from './DoubleCircle'

/**
 * TikZ's `minimum size=2.5em` for a state, at the default 10pt font
 * where `1em` is exactly 10pt.
 */
export const STATE_MIN_SIZE = 25

/**
 * TikZ's `initial distance` / `accepting distance` (both `3ex`). `ex`
 * is font-relative, so unlike `em` this cannot be exact: 3ex is ≈12.9
 * in 10pt Computer Modern, rounded here to 13.
 */
export const INITIAL_DISTANCE_DEFAULT = 13

/** TikZ's `initial text`. */
export const INITIAL_TEXT_DEFAULT = 'start'

/**
 * The state shape set — jikz's `\usetikzlibrary{automata}`.
 *
 * ```ts
 * const pic = picture({ shapes: automataShapes })
 * pic.node('q0', { shape: 'state', text: 'q0' })
 * pic.node('q2', { shape: 'accepting', text: 'q2' })
 * ```
 *
 * All three size to their label like TikZ's circles do; the builders in
 * {@link automata} add the `minimum size` floor.
 */
export const automataShapes = {
  state: defineShape(
    'state',
    (o: ShapeOptions) => new Circle(o.center ?? { x: 0, y: 0 }, Math.max(o.width ?? 0, o.height ?? 0) / 2)
  ),
  accepting: defineShape('accepting', (o: DoubleCircleOptions) => new DoubleCircle(o)),
  'state with output': defineShape('state with output', circleSplit),
} as const

/** Shape names in {@link automataShapes}. */
export type AutomataShapeName = keyof typeof automataShapes

/** NodeOptions minus the fields a builder fills in. */
type BaseOptions = Omit<NodeOptions, 'shape' | 'shapeOptions'>

/** What the state builders take. */
export type StateNodeOptions = BaseOptions & {
  /** Centre-to-centre ring gap; `accepting` only. */
  separation?: number
}

/**
 * Typed node-option builders, the code-first route to the same shapes.
 * Each applies TikZ's `minimum size=2.5em` floor unless you override
 * `minWidth`/`minHeight`.
 */
export const automata = {
  /** `state` — TikZ's `state without output`. */
  state(options: StateNodeOptions = {}): NodeOptions {
    const { separation: _separation, ...base } = options
    return { minWidth: STATE_MIN_SIZE, minHeight: STATE_MIN_SIZE, ...base, shape: automataShapes.state }
  },
  /** `accepting` — TikZ's `accepting by double`. */
  accepting(options: StateNodeOptions = {}): NodeOptions {
    const { separation, ...base } = options
    return {
      minWidth: STATE_MIN_SIZE,
      minHeight: STATE_MIN_SIZE,
      ...base,
      shape: automataShapes.accepting,
      ...(separation !== undefined ? { shapeOptions: { separation } } : {}),
    }
  },
  /** `state with output` — the split circle, name over output. */
  stateWithOutput(options: StateNodeOptions = {}): NodeOptions {
    const { separation: _separation, ...base } = options
    return {
      minWidth: STATE_MIN_SIZE,
      minHeight: STATE_MIN_SIZE,
      ...base,
      shape: automataShapes['state with output'],
    }
  },
} as const

/** The type of {@link automata} — the typed builder namespace. */
export type AutomataBuilder = typeof automata

/** Where an entry arrow comes from — TikZ's `initial where`. */
export type InitialWhere = 'left' | 'right' | 'above' | 'below'

/** Options for {@link initialArrow}. */
export interface InitialArrowOptions {
  /** TikZ's `initial where`. Default `'left'`, as TikZ's initial angle 180. */
  where?: InitialWhere
  /** TikZ's `initial distance`. Default {@link INITIAL_DISTANCE_DEFAULT}. */
  distance?: number
  /** TikZ's `initial text`. Default {@link INITIAL_TEXT_DEFAULT} (`'start'`). */
  text?: string
}

/** The pieces of an entry arrow. */
export interface InitialArrow {
  /** Where the arrow starts — hand this to `edge()` as the source. */
  readonly from: Point
  /** The label, TikZ's `initial text`. */
  readonly text: string
  /** Where the label sits — the same point the arrow starts from. */
  readonly textAt: Point
  /**
   * Placement for that label, in jikz's sense (direction from the
   * point to the text). TikZ states the opposite side as an `anchor`;
   * `initial where=left` sets `anchor=east`, which is this `'west'`.
   */
  readonly textPlacement: AnchorSpec
}

/** Anchor the arrow leaves from, and the screen direction it travels. */
const SIDES: Record<InitialWhere, { anchor: AnchorSpec; angle: number }> = {
  // TikZ's angles are y-up (above = 90); jikz's are y-down.
  left: { anchor: 'west', angle: 180 },
  right: { anchor: 'east', angle: 0 },
  above: { anchor: 'north', angle: 270 },
  below: { anchor: 'south', angle: 90 },
}

/**
 * Work out where a state's entry arrow starts — TikZ's `initial by
 * arrow`, which draws an edge to the state from a point `initial
 * distance` beyond the chosen side.
 *
 * Returns plain values; `edge()` takes the bare point and does the
 * boundary clipping, so nothing here needs the renderer:
 *
 * ```ts
 * const start = initialArrow(pic.getNode('q0')!, { where: 'left' })
 * pic.edge(start.from, 'q0', { arrowEnd: 'stealth' })
 * pic.text(start.textAt, start.text, { at: start.textPlacement })
 * ```
 */
export function initialArrow(state: Anchorable, options?: InitialArrowOptions): InitialArrow {
  const where = options?.where ?? 'left'
  const { anchor, angle } = SIDES[where]
  const distance = options?.distance ?? INITIAL_DISTANCE_DEFAULT
  const from = state.anchor(anchor).add(polar(angle, distance))
  return {
    from,
    text: options?.text ?? INITIAL_TEXT_DEFAULT,
    textAt: from,
    // The arrow approaches from `anchor`, so the text sits further out
    // that same way — TikZ says it as the opposite `anchor=`.
    textPlacement: anchor,
  }
}
