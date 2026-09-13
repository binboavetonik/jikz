/**
 * The four geometry primitives as shape kinds.
 *
 * Kept in its own module so `Node`'s default shape pulls in a rectangle
 * and nothing else — importing a shape set must never drag the whole
 * catalogue into a bundle.
 */
import { Circle } from '../Circle'
import { Rectangle } from '../Rectangle'
import { Ellipse } from '../Ellipse'
import { Diamond } from '../Diamond'
import type { ShapeOptions } from '../Shape'
import { defineShape } from '../ShapeKind'

const ORIGIN = { x: 0, y: 0 }

const rectangle = defineShape('rectangle', (o: ShapeOptions) => {
  const c = o.center ?? ORIGIN
  const w = o.width ?? 0
  const h = o.height ?? 0
  return new Rectangle(c.x - w / 2, c.y - h / 2, w, h)
})

const circle = defineShape('circle', (o: ShapeOptions) =>
  new Circle(o.center ?? ORIGIN, Math.max(o.width ?? 0, o.height ?? 0) / 2)
)

const ellipse = defineShape('ellipse', (o: ShapeOptions) =>
  new Ellipse(o.center ?? ORIGIN, (o.width ?? 0) / 2, (o.height ?? 0) / 2)
)

const diamond = defineShape('diamond', (o: ShapeOptions) =>
  new Diamond(o.center ?? ORIGIN, o.width ?? 0, o.height ?? 0)
)

/** Rectangle, circle, ellipse, diamond — the TikZ core four. */
export const basicShapes = { rectangle, circle, ellipse, diamond } as const

/** The default shape of a node with no `shape` option. */
export const defaultShape = rectangle
