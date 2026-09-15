/**
 * Petri nets — jikz's analogue of TikZ's `petri` library.
 *
 * TikZ ships it as styles over `circle` and `rectangle` plus a token
 * mechanism, and the split here follows the one-paint rule: a place and
 * a transition are ordinary shapes, but **tokens are not part of the
 * place**. A place is a stroked, usually pale circle and its tokens are
 * solid dots — two paints, which one shape's `toSVGPath()` cannot
 * carry. TikZ has the same separation for the same reason: `tokens=n`
 * expands to child *nodes*, not to marks on the place.
 *
 * So a marked place is two calls, and {@link tokens} hands you the
 * dots:
 *
 * ```ts
 * const at = point(60, 70)
 * pic.node('p1', petri.place({ at }), { style: { stroke: '#334155' } })
 * for (const t of tokens(at, 2)) {
 *   pic.fill(circle(t.center, t.radius), { style: { fill: t.color } })
 * }
 * ```
 *
 * Token positions are TikZ's own hard-coded table for one through nine
 * tokens — the arrangements it lays out with `\tikz@def@grow@tokens`,
 * flipped for a y-down canvas. Past nine TikZ has no answer at all (it
 * expands an undefined macro); a ring is used instead.
 */
import { Point, point, polar } from '../../core/Point'
import type { PointLike } from '../../core/types'
import { Circle } from '../../geometry/Circle'
import { Rectangle } from '../../geometry/Rectangle'
import { defineShape, type ShapeSet } from '../../geometry/ShapeKind'
import type { ShapeOptions } from '../../geometry/Shape'
import type { EdgeOptions } from '../../node/Edge'
import type { NodeOptions } from '../../node/Node'

const ORIGIN = { x: 0, y: 0 }

/**
 * One `ex` at TikZ's default 10pt Computer Modern. Unlike `em` this is
 * font-relative rather than exact, so every `ex` measure below is an
 * approximation of TikZ's.
 */
const EX = 4.30554

/** TeX points per millimetre (72.27 pt / 25.4 mm). */
const MM = 72.27 / 25.4

/** TikZ's `place` is `minimum size=5ex`. */
export const PLACE_MIN_SIZE = 5 * EX

/** TikZ's `transition` is `minimum size=4mm`. */
export const TRANSITION_MIN_SIZE = 4 * MM

/** TikZ's `token` is `minimum size=1ex`. */
export const TOKEN_SIZE = EX

/** TikZ's `token distance`, initially `1.5ex`. */
export const TOKEN_DISTANCE_DEFAULT = 1.5 * EX

/** TikZ's token is filled black and never stroked. */
export const TOKEN_COLOR_DEFAULT = '#000000'

/** Both `place` and `transition` set `inner sep=0pt`. */
export const PETRI_INNER_SEP = 0

/**
 * TikZ's token arrangements, as multiples of `token distance`, indexed
 * by how many tokens there are. Straight out of
 * `\tikz@def@grow@tokens` — and in its y-up convention, so `y` is
 * negated when a position is resolved.
 */
const TOKEN_LAYOUTS: readonly (readonly (readonly [number, number])[])[] = [
  [],
  [[0, 0]],
  [
    [-0.5, 0],
    [0.5, 0],
  ],
  [
    [0, 0.57],
    [-0.5, -0.306025],
    [0.5, -0.306025],
  ],
  [
    [-0.5, 0.5],
    [0.5, 0.5],
    [-0.5, -0.5],
    [0.5, -0.5],
  ],
  [
    [0, 0.85],
    [-0.808398, 0.26266],
    [0.808398, 0.26266],
    [-0.499617, -0.687664],
    [0.499617, -0.687664],
  ],
  [
    [-1, 0.5],
    [0, 0.5],
    [1, 0.5],
    [-1, -0.5],
    [0, -0.5],
    [1, -0.5],
  ],
  [
    [0, 1],
    [-1, 0.5],
    [0, 0],
    [1, 0.5],
    [-1, -0.5],
    [0, -1],
    [1, -0.5],
  ],
  [
    [-0.5, 1],
    [0.5, 1],
    [-1, 0],
    [0, 0],
    [1, 0],
    [-1, -1],
    [0, -1],
    [1, -1],
  ],
  [
    [-1, 1],
    [0, 1],
    [1, 1],
    [-1, 0],
    [0, 0],
    [1, 0],
    [-1, -1],
    [0, -1],
    [1, -1],
  ],
]

/** How many tokens TikZ has an arrangement for. */
export const MAX_LAID_OUT_TOKENS = TOKEN_LAYOUTS.length - 1

/**
 * The place and transition shapes — jikz's
 * `\usetikzlibrary{petri}`. Both carry the library's `minimum size`,
 * so `{ shape: 'place' }` and {@link petri.place} size alike.
 *
 * What a shape set cannot carry is TikZ's `inner sep=0pt`, which is a
 * node setting; the builders add it.
 */
export const petriShapes = {
  place: defineShape(
    'place',
    (o: ShapeOptions) =>
      new Circle(
        o.center ?? ORIGIN,
        Math.max(o.width ?? 0, o.height ?? 0, PLACE_MIN_SIZE) / 2
      )
  ),
  transition: defineShape('transition', (o: ShapeOptions) => {
    const c = o.center ?? ORIGIN
    const w = Math.max(o.width ?? 0, TRANSITION_MIN_SIZE)
    const h = Math.max(o.height ?? 0, TRANSITION_MIN_SIZE)
    return new Rectangle(c.x - w / 2, c.y - h / 2, w, h)
  }),
} as const satisfies ShapeSet

/** Shape names in {@link petriShapes}. */
export type PetriShapeName = keyof typeof petriShapes

/** NodeOptions minus the fields a builder fills in. */
type BaseOptions = Omit<NodeOptions, 'shape' | 'shapeOptions'>

/**
 * Typed node-option builders. Each adds the library's `inner sep=0pt`,
 * and stands jikz's own default node minimum down so the shapes' TikZ
 * minimums are what actually apply.
 *
 * That last part matters for transitions. jikz floors a node at 20
 * before the shape ever sees it, which is well above TikZ's 4mm — so a
 * transition drawn as the usual thin bar comes back 20 wide through
 * the string route (`{ shape: 'transition' }`) unless you lower
 * `minWidth` yourself. A place is unaffected either way: TikZ's 5ex is
 * the larger of the two.
 */
export const petri = {
  /** `place` — a circle at `minimum size=5ex`. */
  place(options: BaseOptions = {}): NodeOptions {
    return {
      innerSep: PETRI_INNER_SEP,
      minWidth: 0,
      minHeight: 0,
      ...options,
      shape: petriShapes.place,
    }
  },
  /** `transition` — a rectangle at `minimum size=4mm`. */
  transition(options: BaseOptions = {}): NodeOptions {
    return {
      innerSep: PETRI_INNER_SEP,
      minWidth: 0,
      minHeight: 0,
      ...options,
      shape: petriShapes.transition,
    }
  },
} as const

/** The type of {@link petri} — the typed builder namespace. */
export type PetriBuilder = typeof petri

/**
 * TikZ's arc styles for the flow relation. `pre` points *into* the
 * transition, `post` away from it, and both shorten by 1pt so the tip
 * clears the node it touches.
 */
export const petriArcs = {
  /** TikZ's `pre`: `<-`, `shorten <=1pt`. */
  pre: { arrowStart: 'to', arrowEnd: 'none', shortenStart: 1 },
  /** TikZ's `post`: `->`, `shorten >=1pt`. */
  post: { arrowEnd: 'to', shortenEnd: 1 },
  /** TikZ's `pre and post`: `<->`, shortened at both ends. */
  preAndPost: { arrowStart: 'to', arrowEnd: 'to', shortenStart: 1, shortenEnd: 1 },
} as const satisfies Record<string, EdgeOptions>

/** One token on a place. */
export interface Token {
  readonly center: Point
  readonly radius: number
  readonly color: string
  /** TikZ's `structured tokens` label, if one was given. */
  readonly text?: string
}

/** Options for {@link tokens} and {@link tokenPositions}. */
export interface TokenOptions {
  /** TikZ's `token distance`. Default {@link TOKEN_DISTANCE_DEFAULT}. */
  distance?: number
  /** Token diameter — TikZ's `minimum size=1ex`. Default {@link TOKEN_SIZE}. */
  size?: number
  /** Fill for every token. Default {@link TOKEN_COLOR_DEFAULT}. */
  color?: string
  /** Per-token fills — TikZ's `colored tokens`. Falls back to `color`. */
  colors?: readonly string[]
  /** Per-token labels — TikZ's `structured tokens`. */
  labels?: readonly string[]
}

/**
 * Where a place's tokens sit — TikZ's arrangements for one through
 * nine, and a ring beyond that, since TikZ has none.
 */
export function tokenPositions(
  center: PointLike,
  count: number,
  options: TokenOptions = {}
): Point[] {
  const n = Math.max(0, Math.trunc(count))
  if (n === 0) return []

  const distance = options.distance ?? TOKEN_DISTANCE_DEFAULT
  const middle = point(center.x, center.y)

  const layout = TOKEN_LAYOUTS[n]
  if (layout) {
    // TikZ's table is y-up; this canvas is y-down.
    return layout.map(([x, y]) => middle.add(x * distance, -y * distance))
  }

  // Past nine, evenly around a ring wide enough to hold them all.
  const radius = distance * Math.max(1, n / (2 * Math.PI))
  return Array.from({ length: n }, (_, i) =>
    middle.add(polar(-90 + (360 * i) / n, radius))
  )
}

/**
 * A place's tokens, ready to fill:
 *
 * ```ts
 * for (const t of tokens(at, 3)) {
 *   pic.fill(circle(t.center, t.radius), { style: { fill: t.color } })
 * }
 * ```
 *
 * `colors` gives TikZ's `colored tokens` and `labels` its `structured
 * tokens`; both are read per index, so a short list leaves the rest on
 * the default.
 */
export function tokens(
  center: PointLike,
  count: number,
  options: TokenOptions = {}
): Token[] {
  const radius = (options.size ?? TOKEN_SIZE) / 2
  const fallback = options.color ?? TOKEN_COLOR_DEFAULT
  return tokenPositions(center, count, options).map((at, i) => ({
    center: at,
    radius,
    color: options.colors?.[i] ?? fallback,
    ...(options.labels?.[i] !== undefined ? { text: options.labels[i]! } : {}),
  }))
}
