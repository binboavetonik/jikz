/**
 * Finite automata — jikz's analogue of TikZ's `automata` library.
 *
 * TikZ's `state` is a circle of `minimum size=2.5em`, `accepting` is
 * `double`, `state with output` is a `circle split`, and `initial` is
 * an arrow drawn *after* the node from a point `initial distance`
 * outside it, with `initial text` ("start") at its tail. The shapes
 * are a shape set; the arrows need the picture, so they are helpers
 * that take one:
 *
 * ```ts
 * import { automataShapes, automata, initialArrow } from '@ozan.e/jikz/automata'
 *
 * const pic = picture({ shapes: automataShapes })
 *   .node('q0', automata.state({ at: point(80, 100), text: 'q0' }))
 *   .node('q1', automata.state({ at: point(200, 100), text: 'q1', accepting: true }))
 *   .edge('q0', 'q1', { arrowEnd: '->', label: '1' })
 * initialArrow(pic, 'q0')                       // TikZ `initial`
 * initialArrow(pic, 'q1', { where: 'above', text: '' })
 * ```
 */
import { Point, point, polar } from '../../core/Point'
import type { PointLike } from '../../core/types'
import type { AnchorSpec } from '../../core/Anchor'
import { Circle } from '../../geometry/Circle'
import { CircleSplit } from '../../geometry/complex/CircleSplit'
import type { Shape, ShapeOptions } from '../../geometry/Shape'
import { defineShape, type ShapeSet } from '../../geometry/ShapeKind'
import type { NodeOptions } from '../../node/Node'
import type { PlacementOptions, AliasOptions } from '../../picture/Container'
import type { RenderOptions } from '../../render/Renderer'
import type { EdgeOptions } from '../../node/Edge'
import type { ItemContainer } from '../../picture/Container'
import type { TextStyle } from '../../text/Label'
import { JikzError } from '../../core/errors'

const ORIGIN = { x: 0, y: 0 }
/** One `em` at TikZ's default 10pt (pt taken as px, as the other ext modules do). */
const EM = 10
/** One `ex` at TikZ's default 10pt Computer Modern. */
const EX = 4.30554

/** TikZ's `state` is `minimum size=2.5em`. */
export const STATE_MIN_SIZE = 2.5 * EM

/** Gap between the two rings of an accepting state (TikZ `double`). */
export const ACCEPTING_GAP = 3

/** TikZ `initial distance` / `accepting distance`, initially 3ex. */
export const INITIAL_DISTANCE = 3 * EX

/** TikZ `initial text`, initially "start". */
export const INITIAL_TEXT = 'start'

/**
 * A circle drawn twice — TikZ's `double` on a state. Anchors, bounds
 * and hit-testing are the outer ring's; the outline carries both
 * rings as one path, so one stroke paints both.
 */
export class DoubleCircle implements Shape {
  readonly type = 'accepting state' as const
  private readonly outer: Circle
  readonly gap: number

  constructor(center: PointLike, radius: number, gap = ACCEPTING_GAP) {
    this.outer = new Circle(center, radius)
    this.gap = gap
  }

  get center(): Point {
    return this.outer.center
  }
  get radius(): number {
    return this.outer.radius
  }
  get width(): number {
    return this.outer.width
  }
  get height(): number {
    return this.outer.height
  }
  get bounds(): [number, number, number, number] {
    return this.outer.bounds
  }
  anchor(spec: AnchorSpec): Point {
    return this.outer.anchor(spec)
  }
  boundaryPoint(angle: number): Point {
    return this.outer.boundaryPoint(angle)
  }
  contains(p: PointLike): boolean {
    return this.outer.contains(p)
  }
  toSVGPath(): string {
    const inner = new Circle(this.center, Math.max(0, this.radius - this.gap))
    return `${this.outer.toSVGPath()} ${inner.toSVGPath()}`
  }
  moveTo(center: PointLike): DoubleCircle {
    return new DoubleCircle(center, this.radius, this.gap)
  }
  resize(width: number, height: number): DoubleCircle {
    return new DoubleCircle(this.center, Math.max(width, height) / 2, this.gap)
  }
}

const stateRadius = (o: ShapeOptions) => Math.max(o.width ?? 0, o.height ?? 0, STATE_MIN_SIZE) / 2

/** The automata shapes — `state`, `accepting state`, `state with output`. */
export const automataShapes = {
  state: defineShape('state', (o: ShapeOptions) => new Circle(o.center ?? ORIGIN, stateRadius(o))),
  'accepting state': defineShape(
    'accepting state',
    (o: ShapeOptions & { gap?: number }) => new DoubleCircle(o.center ?? ORIGIN, stateRadius(o), o.gap)
  ),
  'state with output': defineShape(
    'state with output',
    (o: ShapeOptions & { labels?: string[] }) =>
      new CircleSplit({ ...o, width: Math.max(o.width ?? 0, STATE_MIN_SIZE), height: Math.max(o.height ?? 0, STATE_MIN_SIZE), parts: 2 })
  ),
} as const satisfies ShapeSet

/** Shape names in {@link automataShapes}. */
export type AutomataShapeName = keyof typeof automataShapes

/** What the builders take: a node's options plus the picture's placement, alias and paint keys, passed through. */
type BaseOptions = Omit<NodeOptions, 'shape' | 'shapeOptions'> & PlacementOptions & AliasOptions & RenderOptions
/** What they return: `NodeOptions` for `pic.node()`, placement and paint included. */
export type BuiltNode = NodeOptions & PlacementOptions & AliasOptions & RenderOptions

export interface StateOptions extends BaseOptions {
  /** TikZ `accepting`: draw the state as a double circle. */
  accepting?: boolean
  /** TikZ `state with output`: split the circle, `output` in the lower half. */
  output?: string
}

/** Typed builders — each returns `NodeOptions` for `pic.node()`. */
export const automata = {
  /** A state; `accepting` and `output` pick the double or split circle. */
  state(options: StateOptions = {}): BuiltNode {
    const { accepting, output, ...rest } = options
    if (output !== undefined) {
      // The split's divider runs through the centre; a two-line text
      // block centred on the node puts the name above it and the output
      // below, which is exactly the circle split's two parts.
      return {
        minWidth: 0,
        minHeight: 0,
        ...rest,
        shape: automataShapes['state with output'],
        text: `${rest.text ?? ''}\n${output}`,
      }
    }
    return {
      minWidth: 0,
      minHeight: 0,
      ...rest,
      shape: accepting ? automataShapes['accepting state'] : automataShapes.state,
    }
  },
  /** TikZ `state, accepting`. */
  accepting(options: BaseOptions = {}): BuiltNode {
    return automata.state({ ...options, accepting: true })
  },
}

export type InitialWhere = 'left' | 'right' | 'above' | 'below'

export interface InitialArrowOptions {
  /** Which side the arrow comes from (TikZ `initial where`). Default `'left'`. */
  where?: InitialWhere
  /** Text at the arrow's tail (TikZ `initial text`); `''` for none. Default "start". */
  text?: string
  /** Gap between the arrow's tail and the node's border, px (TikZ `initial distance`). */
  distance?: number
  /** Edge options for the arrow; the tip defaults to TikZ's `->`. */
  edge?: EdgeOptions & { style?: EdgeOptions extends never ? never : unknown }
  /** Style of the text. */
  textStyle?: TextStyle
}

/**
 * Per side: the node's border anchor (a compass name, so it means the
 * same in every frame), the outward screen angle, and where the text
 * sits relative to the arrow's tail.
 */
const SIDE: Record<InitialWhere, { border: string; angle: number; textAt: AnchorSpec }> = {
  left: { border: 'west', angle: 180, textAt: 'west' },
  right: { border: 'east', angle: 0, textAt: 'east' },
  above: { border: 'north', angle: 270, textAt: 'north' },
  below: { border: 'south', angle: 90, textAt: 'south' },
}

/**
 * TikZ `initial`: an arrow into the state from `distance` outside its
 * border, with `text` at the tail. Paints after the node, as TikZ's
 * `after node path` does.
 */
export function initialArrow<S extends ShapeSet>(
  pic: ItemContainer<S> & { getNode?: (name: string) => { anchor(spec: AnchorSpec): Point } | undefined },
  name: string,
  options: InitialArrowOptions = {}
): void {
  arrowAt(pic, name, options, 'in')
}

/**
 * TikZ `accepting by arrow`: an arrow out of the state to `distance`
 * beyond its border, with `text` at the head.
 */
export function acceptingArrow<S extends ShapeSet>(
  pic: ItemContainer<S>,
  name: string,
  options: InitialArrowOptions = {}
): void {
  arrowAt(pic, name, { where: 'right', text: '', ...options }, 'out')
}

function arrowAt<S extends ShapeSet>(
  pic: ItemContainer<S>,
  name: string,
  options: InitialArrowOptions,
  direction: 'in' | 'out'
): void {
  const where = options.where ?? 'left'
  const side = SIDE[where]
  const border = pic.resolve(`${name}.${side.border}`)
  const centre = pic.resolve(name)
  if (border.equals(centre)) {
    throw new JikzError('unknown-name', `automata: "${name}" is a coordinate, not a state node.`)
  }
  const distance = options.distance ?? INITIAL_DISTANCE
  const outside = border.add(polar(side.angle, distance))
  // Endpoints are screen points; the picture maps raw points through
  // its frame, so hand them back in frame coordinates.
  const tail = pic.frame.unmap(outside)
  const edgeOptions: EdgeOptions = { arrowEnd: '->', ...(options.edge as EdgeOptions | undefined) }
  if (direction === 'in') pic.edge(tail, name, edgeOptions)
  else pic.edge(name, tail, edgeOptions)
  const text = options.text ?? (direction === 'in' ? INITIAL_TEXT : '')
  if (text) {
    pic.text(tail, text, {
      at: side.textAt,
      distance: 2,
      style: { fontSize: 10, ...options.textStyle },
    })
  }
}

export { point }
