/**
 * Entity–relationship diagrams — jikz's analogue of TikZ's `er`
 * library: `entity` (a rectangle of `minimum height=2\baselineskip,
 * minimum width=4\baselineskip`), `relationship` (a diamond of
 * `minimum size=1.5\baselineskip, inner sep=1pt`), `attribute` (an
 * ellipse of `minimum size=1.5\baselineskip`) and `key attribute`
 * (an attribute set in italics).
 *
 * ```ts
 * import { erShapes, er } from '@ozan.e/jikz/er'
 *
 * picture({ shapes: erShapes })
 *   .node('student', er.entity({ at: point(60, 60), text: 'Student' }))
 *   .node('takes', er.relationship({ rightOf: 'student', distance: 40, text: 'takes' }))
 *   .node('id', er.keyAttribute({ above: 'student', distance: 20, text: 'id' }))
 * ```
 */
import { Rectangle } from '../../geometry/Rectangle'
import { Diamond } from '../../geometry/Diamond'
import { Ellipse } from '../../geometry/Ellipse'
import type { ShapeOptions } from '../../geometry/Shape'
import { defineShape, type ShapeSet } from '../../geometry/ShapeKind'
import type { NodeOptions } from '../../node/Node'
import type { PlacementOptions, AliasOptions } from '../../picture/Container'
import type { RenderOptions } from '../../render/Renderer'

const ORIGIN = { x: 0, y: 0 }
/** `\baselineskip` at TikZ's default 10pt: 12pt (pt taken as px, as the other ext modules do). */
const BASELINESKIP = 12

/** TikZ `entity`: `minimum width=4\baselineskip`, `minimum height=2\baselineskip`. */
export const ENTITY_MIN_WIDTH = 4 * BASELINESKIP
export const ENTITY_MIN_HEIGHT = 2 * BASELINESKIP
/** TikZ `relationship` and `attribute`: `minimum size=1.5\baselineskip`. */
export const RELATIONSHIP_MIN_SIZE = 1.5 * BASELINESKIP
export const ATTRIBUTE_MIN_SIZE = 1.5 * BASELINESKIP
/** TikZ `relationship`: `inner sep=1pt`. */
export const RELATIONSHIP_INNER_SEP = 1

/** The ER shapes: `entity`, `relationship`, `attribute`. */
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
        Math.max(o.width ?? 0, RELATIONSHIP_MIN_SIZE),
        Math.max(o.height ?? 0, RELATIONSHIP_MIN_SIZE)
      )
  ),
  attribute: defineShape(
    'attribute',
    (o: ShapeOptions) =>
      new Ellipse(
        o.center ?? ORIGIN,
        Math.max(o.width ?? 0, ATTRIBUTE_MIN_SIZE) / 2,
        Math.max(o.height ?? 0, ATTRIBUTE_MIN_SIZE) / 2
      )
  ),
} as const satisfies ShapeSet

/** Shape names in {@link erShapes}. */
export type ErShapeName = keyof typeof erShapes

/** What the builders take: a node's options plus the picture's placement, alias and paint keys, passed through. */
type BaseOptions = Omit<NodeOptions, 'shape' | 'shapeOptions'> & PlacementOptions & AliasOptions & RenderOptions
/** What they return: `NodeOptions` for `pic.node()`, placement and paint included. */
export type BuiltNode = NodeOptions & PlacementOptions & AliasOptions & RenderOptions

/** Typed builders — each returns `NodeOptions` for `pic.node()`. */
export const er = {
  entity(options: BaseOptions = {}): BuiltNode {
    return { minWidth: 0, minHeight: 0, ...options, shape: erShapes.entity }
  },
  relationship(options: BaseOptions = {}): BuiltNode {
    return { minWidth: 0, minHeight: 0, innerSep: RELATIONSHIP_INNER_SEP, ...options, shape: erShapes.relationship }
  },
  attribute(options: BaseOptions = {}): BuiltNode {
    return { minWidth: 0, minHeight: 0, ...options, shape: erShapes.attribute }
  },
  /** TikZ `key attribute`: an attribute in italics. */
  keyAttribute(options: BaseOptions = {}): BuiltNode {
    return er.attribute({ ...options, textStyle: { fontStyle: 'italic', ...options.textStyle } })
  },
}
