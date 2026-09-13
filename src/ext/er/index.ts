/**
 * Entity-relationship diagrams — jikz's analogue of TikZ's `er`
 * library.
 *
 * `er` is the smallest library in the TikZ tree: four `\tikzset`
 * styles over `shapes.geometric`, no new shapes at all.
 *
 *   - `entity`       — rectangle, `minimum height=2\baselineskip`,
 *                      `minimum width=4\baselineskip`
 *   - `relationship` — diamond, `minimum size=1.5\baselineskip`,
 *                      `inner sep=1pt`
 *   - `attribute`    — ellipse, `minimum size=1.5\baselineskip`
 *   - `key attribute`— `attribute` plus `font=\itshape`
 *
 * The sizes below are those `\baselineskip`s at TikZ's default 10pt
 * font, where `\baselineskip` is exactly 12pt.
 *
 * Both routes work, and size identically — the minimums live in the
 * shape factories, so a bare `{ shape: 'entity' }` is not a
 * second-class citizen:
 *
 * ```ts
 * const pic = picture({ shapes: erShapes })
 * pic.node('course', { shape: 'entity', text: 'Course' })
 * pic.node('takes', er.relationship({ text: 'takes' }))
 * ```
 */
import { Diamond } from '../../geometry/Diamond'
import { Ellipse } from '../../geometry/Ellipse'
import { Rectangle } from '../../geometry/Rectangle'
import { defineShape } from '../../geometry/ShapeKind'
import type { ShapeOptions } from '../../geometry/Shape'
import type { NodeOptions } from '../../node/Node'

const ORIGIN = { x: 0, y: 0 }

/** TikZ's `\baselineskip` at the default 10pt font. */
export const BASELINE_SKIP = 12

/** `minimum width=4\baselineskip` on an entity. */
export const ENTITY_MIN_WIDTH = 4 * BASELINE_SKIP
/** `minimum height=2\baselineskip` on an entity. */
export const ENTITY_MIN_HEIGHT = 2 * BASELINE_SKIP
/**
 * `minimum size=1.5\baselineskip` on a relationship or attribute. Note
 * this is *smaller* than jikz's own default node minimum of 20, so it
 * only binds where a caller has lowered that; the entity minimums are
 * the ones that do real work.
 */
export const ER_MIN_SIZE = 1.5 * BASELINE_SKIP
/** `inner sep=1pt` on a relationship — tighter than jikz's usual 4. */
export const RELATIONSHIP_INNER_SEP = 1

/**
 * The ER shape set — jikz's `\usetikzlibrary{er}`. Ordinary
 * rectangles, diamonds and ellipses carrying the library's minimums.
 */
export const erShapes = {
  entity: defineShape('entity', (o: ShapeOptions) => {
    const c = o.center ?? ORIGIN
    const w = Math.max(o.width ?? 0, ENTITY_MIN_WIDTH)
    const h = Math.max(o.height ?? 0, ENTITY_MIN_HEIGHT)
    return new Rectangle(c.x - w / 2, c.y - h / 2, w, h)
  }),
  relationship: defineShape(
    'relationship',
    (o: ShapeOptions) =>
      new Diamond(
        o.center ?? ORIGIN,
        Math.max(o.width ?? 0, ER_MIN_SIZE),
        Math.max(o.height ?? 0, ER_MIN_SIZE)
      )
  ),
  attribute: defineShape(
    'attribute',
    (o: ShapeOptions) =>
      new Ellipse(
        o.center ?? ORIGIN,
        Math.max(o.width ?? 0, ER_MIN_SIZE) / 2,
        Math.max(o.height ?? 0, ER_MIN_SIZE) / 2
      )
  ),
} as const

/** Shape names in {@link erShapes}. */
export type ERShapeName = keyof typeof erShapes

/** NodeOptions minus the fields a builder fills in. */
type BaseOptions = Omit<NodeOptions, 'shape' | 'shapeOptions'>

/**
 * Typed node-option builders — the code-first route to the same four
 * styles.
 */
export const er = {
  /** `entity` — a rectangle with the entity minimums. */
  entity(options: BaseOptions = {}): NodeOptions {
    return { ...options, shape: erShapes.entity }
  },
  /** `relationship` — a diamond, with TikZ's tighter `inner sep=1pt`. */
  relationship(options: BaseOptions = {}): NodeOptions {
    return { innerSep: RELATIONSHIP_INNER_SEP, ...options, shape: erShapes.relationship }
  },
  /** `attribute` — an ellipse with the attribute minimum. */
  attribute(options: BaseOptions = {}): NodeOptions {
    return { ...options, shape: erShapes.attribute }
  },
  /**
   * `key attribute` — TikZ distinguishes this from `attribute` by
   * `font=\itshape` alone, and jikz has no italic option for node text
   * (`font-style` is emitted only by the KaTeX fallback), so today this
   * renders exactly as {@link er.attribute}. It is still worth writing:
   * it says which attribute is the key, and it is the single place that
   * changes if text gains a `fontStyle`.
   */
  keyAttribute(options: BaseOptions = {}): NodeOptions {
    return { ...options, shape: erShapes.attribute }
  },
} as const

/** The type of {@link er} — the typed builder namespace. */
export type ERBuilder = typeof er
