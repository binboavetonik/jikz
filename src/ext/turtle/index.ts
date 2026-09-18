/**
 * Turtle graphics and Lindenmayer systems — jikz's analogue of TikZ's
 * `turtle` and `lindenmayersystems` libraries. Both produce a
 * {@link Path} for any draw verb, so they compose with everything
 * else and map into a math-frame picture like any path.
 *
 * ```ts
 * import { turtle, lsystem, LSYSTEMS } from '@ozan.e/jikz/turtle'
 *
 * pic.draw(turtle({ start: point(20, 80) }).forward(60).left(90).forward(40).path())
 * pic.filldraw(lsystem(LSYSTEMS.kochSnowflake, { iterations: 4, step: 3, start: point(0, 0) }).path)
 * ```
 *
 * Headings are turtle-style: 0° is east and a left turn is
 * counter-clockwise *as seen*, on both frames. The turtle starts
 * facing up, as TikZ's does.
 */
import { Point, point } from '../../core/Point'
import type { PointLike } from '../../core/types'
import { degToRad } from '../../utils/math'
import { Path, path } from '../../path/Path'
import { JikzError } from '../../core/errors'

export interface TurtleOptions {
  /** Where the turtle starts (default the origin). */
  start?: PointLike
  /** Initial heading, degrees, 0 = east, counter-clockwise positive (default 90 = up). */
  heading?: number
  /**
   * `'screen'` (default): the path is in screen space, y down — "up"
   * is negative y. `'math'`: y up, for a `frame: 'math'` picture.
   */
  frame?: 'screen' | 'math'
}

/**
 * A turtle — TikZ `turtle` library: `forward`, `back`, `left`,
 * `right`, `home`. Pen up/down and a position stack (for L-systems)
 * are added. Mutable; `path()` returns what it drew.
 */
export class Turtle {
  private p: Point
  private h: number
  private readonly origin: Point
  private readonly yUp: boolean
  private down = true
  private built: Path
  private readonly stack: { p: Point; h: number }[] = []

  constructor(options: TurtleOptions = {}) {
    this.origin = point(options.start?.x ?? 0, options.start?.y ?? 0)
    this.p = this.origin
    this.h = options.heading ?? 90
    this.yUp = options.frame === 'math'
    this.built = path().moveTo(this.p)
  }

  /** Current position. */
  get position(): Point {
    return this.p
  }
  /** Current heading, degrees, 0 = east, counter-clockwise positive. */
  get heading(): number {
    return this.h
  }

  /** Move `distance` ahead, drawing when the pen is down (TikZ `forward`). */
  forward(distance: number): this {
    const rad = degToRad(this.h)
    const dy = distance * Math.sin(rad)
    // cos(90°) is 6e-17, not 0: snap so axis-aligned walks stay exact.
    const snap = (v: number) => Math.round(v * 1e9) / 1e9
    const next = point(snap(this.p.x + distance * Math.cos(rad)), snap(this.p.y + (this.yUp ? dy : -dy)))
    this.built = this.down ? this.built.lineTo(next) : this.built.moveTo(next)
    this.p = next
    return this
  }
  /** Move `distance` back (TikZ `back`). */
  back(distance: number): this {
    return this.forward(-distance)
  }
  /** Turn counter-clockwise (TikZ `left`, default 90°). */
  left(angle = 90): this {
    this.h += angle
    return this
  }
  /** Turn clockwise (TikZ `right`, default 90°). */
  right(angle = 90): this {
    this.h -= angle
    return this
  }
  /** Back to the start, facing up, pen down (TikZ `home`). */
  home(): this {
    this.p = this.origin
    this.h = 90
    this.built = this.built.moveTo(this.p)
    return this
  }
  penUp(): this {
    this.down = false
    return this
  }
  penDown(): this {
    this.down = true
    return this
  }
  /** Remember position and heading (L-system `[`). */
  push(): this {
    this.stack.push({ p: this.p, h: this.h })
    return this
  }
  /** Return to the last remembered position and heading (L-system `]`). */
  pop(): this {
    const top = this.stack.pop()
    if (!top) throw new JikzError('invalid-argument', 'turtle: pop() with nothing pushed.')
    this.p = top.p
    this.h = top.h
    this.built = this.built.moveTo(this.p)
    return this
  }
  /** What the turtle has drawn so far. */
  path(): Path {
    return this.built
  }
}

/** TikZ `turtle`: start a turtle. */
export function turtle(options: TurtleOptions = {}): Turtle {
  return new Turtle(options)
}

/** An L-system: an axiom, its rewriting rules, and the turn angle. */
export interface LSystem {
  axiom: string
  rules: Readonly<Record<string, string>>
  /** Turn angle, degrees, for `+` and `-`. */
  angle: number
}

export interface LSystemOptions {
  /** How many times to rewrite (TikZ `order`). */
  iterations: number
  /** Length of one `F` step, px (TikZ `step`). */
  step?: number
  /** Where to start. */
  start?: PointLike
  /** Initial heading, degrees, 0 = east, counter-clockwise positive (default 0). */
  heading?: number
  /** See {@link TurtleOptions.frame}. */
  frame?: 'screen' | 'math'
}

/** Rewrite `axiom` by `rules` `iterations` times. */
export function expandLSystem(axiom: string, rules: Readonly<Record<string, string>>, iterations: number): string {
  let s = axiom
  for (let i = 0; i < iterations; i++) {
    let next = ''
    for (const ch of s) next += rules[ch] ?? ch
    s = next
  }
  return s
}

/**
 * TikZ `lindenmayer system`: expand and draw. Symbols follow the
 * library's turtle interpretation — `F` and `G` step forward drawing,
 * `f` steps without drawing, `+` turns left, `-` turns right, `|`
 * turns around, `[` and `]` push and pop the turtle; anything else is
 * a placeholder that only rewrites.
 */
export function lsystem(system: LSystem, options: LSystemOptions): { string: string; path: Path; turtle: Turtle } {
  const string = expandLSystem(system.axiom, system.rules, options.iterations)
  const t = new Turtle({ start: options.start, heading: options.heading ?? 0, frame: options.frame })
  const step = options.step ?? 10
  for (const ch of string) {
    switch (ch) {
      case 'F':
      case 'G':
        t.forward(step)
        break
      case 'f':
        t.penUp().forward(step).penDown()
        break
      case '+':
        t.left(system.angle)
        break
      case '-':
        t.right(system.angle)
        break
      case '|':
        t.left(180)
        break
      case '[':
        t.push()
        break
      case ']':
        t.pop()
        break
      default:
        break
    }
  }
  return { string, path: t.path(), turtle: t }
}

/** The classics, ready for {@link lsystem}. */
export const LSYSTEMS = {
  kochCurve: { axiom: 'F', rules: { F: 'F+F--F+F' }, angle: 60 },
  kochSnowflake: { axiom: 'F--F--F', rules: { F: 'F+F--F+F' }, angle: 60 },
  sierpinskiTriangle: { axiom: 'F-G-G', rules: { F: 'F-G+F+G-F', G: 'GG' }, angle: 120 },
  sierpinskiArrowhead: { axiom: 'F', rules: { F: 'G-F-G', G: 'F+G+F' }, angle: 60 },
  dragonCurve: { axiom: 'F', rules: { F: 'F+G', G: 'F-G' }, angle: 90 },
  hilbertCurve: { axiom: 'A', rules: { A: '+BF-AFA-FB+', B: '-AF+BFB+FA-' }, angle: 90 },
  plant: { axiom: 'X', rules: { X: 'F+[[X]-X]-F[-FX]+X', F: 'FF' }, angle: 25 },
} as const satisfies Record<string, LSystem>
