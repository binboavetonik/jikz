/**
 * Turtle graphics — jikz's analogue of TikZ's `turtle` library.
 *
 * TikZ's turtle is a set of path-building keys: `forward`, `back`,
 * `left`, `right`, `home`, plus the `fd`/`bk`/`lt`/`rt` shortcuts, over
 * a `direction` and a `distance`. Those all carry over verbatim; what
 * comes out at the end is an ordinary {@link Path}:
 *
 * ```ts
 * const t = turtle({ distance: 40 })
 * for (let i = 0; i < 5; i++) t.forward().right(72)
 * pic.draw(t.path)
 * ```
 *
 * **Angles are jikz screen degrees** (0° east, increasing clockwise on
 * screen), as everywhere else in the library — so TikZ's initial
 * `direction=90`, which points up the y-up page, is the `-90` this
 * defaults to. The turns are named rather than signed, so `left(30)`
 * ports from TikZ unchanged; only an explicit `direction` needs
 * flipping.
 *
 * Three verbs go beyond TikZ's turtle, because an L-system needs them
 * and TikZ provides them there instead: {@link Turtle.jump} (move
 * without drawing, TikZ's `f`), and {@link Turtle.push} /
 * {@link Turtle.pop} (its `[` and `]`).
 */
import { Point, point, polar } from '../../core/Point'
import type { PointLike } from '../../core/types'
import { Path, pathFrom } from '../../path/Path'

/** TeX points per centimetre (72.27 pt / 2.54 cm). */
const PT_PER_CM = 72.27 / 2.54

/** TikZ's `turtle/distance`, initially `1cm`. */
export const TURTLE_DISTANCE_DEFAULT = PT_PER_CM

/**
 * TikZ's `turtle/direction`, initially `90` — up the page. jikz counts
 * degrees clockwise on a y-down canvas, so up is `-90` here.
 */
export const TURTLE_DIRECTION_DEFAULT = -90

/** TikZ's `.default` for `left`/`right` (and `lt`/`rt`). */
export const TURTLE_TURN_DEFAULT = 90

/** Options for {@link turtle}. */
export interface TurtleOptions {
  /** Where the turtle starts. Default: the origin, as TikZ's `home`. */
  at?: PointLike
  /**
   * Initial heading in screen degrees.
   * Default: {@link TURTLE_DIRECTION_DEFAULT}.
   */
  direction?: number
  /**
   * How far `forward()`/`back()` go when given no distance — TikZ's
   * `turtle/distance`. Default: {@link TURTLE_DISTANCE_DEFAULT}.
   */
  distance?: number
}

/** One saved turtle state, as pushed by `[` and popped by `]`. */
interface TurtleState {
  position: Point
  direction: number
}

/**
 * A pen with a heading. Mutable and fluent: every verb returns the
 * same turtle, and {@link Turtle.path} is the {@link Path} traced so
 * far.
 */
export class Turtle {
  private _position: Point
  private _direction: number
  private _path: Path
  private readonly stack: TurtleState[] = []

  /** Default step for `forward()`/`back()` — TikZ's `turtle/distance`. */
  readonly distance: number

  constructor(options: TurtleOptions = {}) {
    const at = options.at ?? { x: 0, y: 0 }
    this._position = point(at.x, at.y)
    this._direction = options.direction ?? TURTLE_DIRECTION_DEFAULT
    this.distance = options.distance ?? TURTLE_DISTANCE_DEFAULT
    this._path = pathFrom(this._position)
  }

  /** Where the turtle is now. */
  get position(): Point {
    return this._position
  }

  /** Which way it faces, in screen degrees. */
  get direction(): number {
    return this._direction
  }

  /** How deep the `[`/`]` stack is. */
  get depth(): number {
    return this.stack.length
  }

  /** The path traced so far. */
  get path(): Path {
    return this._path
  }

  /** Move forward, drawing — TikZ's `forward` / `fd`. */
  forward(distance: number = this.distance): this {
    this._position = this._position.add(polar(this._direction, distance))
    this._path = this._path.lineTo(this._position)
    return this
  }

  /** Move backward, drawing — TikZ's `back` / `bk` (`forward=-d`). */
  back(distance: number = this.distance): this {
    return this.forward(-distance)
  }

  /** Turn left — TikZ's `left` / `lt`, counter-clockwise on screen. */
  left(angle: number = TURTLE_TURN_DEFAULT): this {
    this._direction -= angle
    return this
  }

  /** Turn right — TikZ's `right` / `rt`. */
  right(angle: number = TURTLE_TURN_DEFAULT): this {
    this._direction += angle
    return this
  }

  /**
   * Back to the start — TikZ's `home`, which jumps to `(0,0)` and
   * resets `direction`. The jump lifts the pen, as TikZ's does.
   */
  home(): this {
    this._position = point(0, 0)
    this._direction = TURTLE_DIRECTION_DEFAULT
    this._path = this._path.moveTo(this._position)
    return this
  }

  /**
   * Move forward without drawing — the L-system's `f`. Beyond TikZ's
   * turtle keys, which have no pen-up.
   */
  jump(distance: number = this.distance): this {
    this._position = this._position.add(polar(this._direction, distance))
    this._path = this._path.moveTo(this._position)
    return this
  }

  /** Save position and heading — the L-system's `[`. */
  push(): this {
    this.stack.push({ position: this._position, direction: this._direction })
    return this
  }

  /**
   * Restore the last saved position and heading — the L-system's `]`,
   * which also lifts the pen so the next draw starts there.
   * Popping an empty stack is a no-op.
   */
  pop(): this {
    const saved = this.stack.pop()
    if (!saved) return this
    this._position = saved.position
    this._direction = saved.direction
    this._path = this._path.moveTo(this._position)
    return this
  }

  /** TikZ's `fd` shortcut. */
  fd(distance?: number): this {
    return this.forward(distance)
  }

  /** TikZ's `bk` shortcut. */
  bk(distance?: number): this {
    return this.back(distance)
  }

  /** TikZ's `lt` shortcut. */
  lt(angle?: number): this {
    return this.left(angle)
  }

  /** TikZ's `rt` shortcut. */
  rt(angle?: number): this {
    return this.right(angle)
  }
}

/** Start a turtle. See {@link Turtle}. */
export function turtle(options?: TurtleOptions): Turtle {
  return new Turtle(options)
}
