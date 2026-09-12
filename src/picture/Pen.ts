/**
 * Pen — a fluent TikZ path statement.
 *
 * TikZ threads an implicit pen through `\draw (a) -- (b) node[right]{x}
 * -- cycle`: segments draw, `node[...]` hangs a label on the
 * current coordinate without moving the pen, `pos=` labels ride the
 * operation just drawn. `pic.pen()` is exactly that:
 *
 * ```ts
 * pic.pen({ style: { stroke: '#0f172a' } })
 *   .moveTo(40, 170)  .label('A', { at: 'south west' })
 *   .lineTo(300, 170) .label('B', { at: 'south east' })
 *                     .label('c', { pos: 0.5, offset: -10 }) // side label
 *   .lineTo(300, 90)  .label('C', { at: 'north east' })
 *   .close()
 * ```
 *
 * Beyond `--` the pen speaks the full path vocabulary: `hvTo`/`vhTo`
 * (TikZ `-|`/`|-`), `curveTo`/`smoothCurveTo`/`quadraticTo` (`..
 * controls ..`), `through`/`bendTo` (smooth curves), `arcTo`/
 * `circularArcTo` (SVG endpoint arcs), and `close` (`-- cycle`).
 *
 * Two more TikZ idioms:
 *   - `coordinate(name)` names the current pen position (TikZ
 *     `coordinate (A)` mid-path); every endpoint argument also accepts
 *     a name string, so `\draw (A) -- (B)` is
 *     `pen.moveTo('A').lineTo('B')`.
 *   - `push(options)` restyles mid-statement (TikZ `[...]` between
 *     coordinates): subsequent segments compile to a NEW path item
 *     whose options inherit and override the current run's — one pen
 *     statement can mix dashed and solid legs, or switch modes.
 *
 * The pen is registered with the picture at `pic.pen()` call time and
 * expands into bare path items plus text items at render time, in
 * registration order — so it interleaves correctly with other picture
 * calls and works with `{ fit: true }` bounds. Label points are
 * resolved when `.label()` is called (same philosophy as node labels:
 * they don't track later mutations).
 */
import { Point, point } from '../core/Point'
import type { PointLike } from '../core/types'
import { Path, path } from '../path/Path'
import { bezierControlPoints, type BezierRouteOptions } from '../path/bezier'
import {
  placeText,
  DEFAULT_LABEL_FONT_SIZE,
} from '../text/placeText'
import { pathLabelPoint, type DrawLabel } from '../text/shapeLabels'
import type { RenderOptions } from '../render/Renderer'
import type { StyleSpec } from '../render/StyleMapper'
import type { PathMode, PictureItem, PictureTextOptions } from './Picture'

/**
 * Options for {@link Pen}: renderer {@link RenderOptions} plus the
 * path mode — `'draw'` (default, TikZ `\draw`), `'fill'`, `'filldraw'`,
 * or `'path'` (invisible; useful for hanging labels off a phantom path).
 */
export interface PenOptions extends RenderOptions {
  mode?: PathMode
}

/**
 * Routing keys for the pen's `to()` verb — TikZ `to[out=…, in=…,
 * bend=…, looseness=…]`. Same shape as {@link BezierRouteOptions}.
 */
export type ToOptions = BezierRouteOptions

/**
 * The picture surface a pen needs: named-coordinate registration
 * (`pen.coordinate`) and string-spec resolution (`lineTo('A')`).
 * `Picture` satisfies this structurally.
 */
export interface PenHost {
  coordinate(name: string, at: PointLike): unknown
  resolve(spec: string): Point
}

/** A point or a named reference — `"A"`, `"A.north"`, `"A.45"`. */
export type PenPoint = PointLike | string

/**
 * One styling run of a pen statement: segments appended between
 * `pic.pen()`/`push()` calls compile to one path item with these
 * options. The builder of a pushed run starts with an implicit move
 * to the pen position, so corner verbs (`hvTo`/`vhTo`) see the right
 * current point.
 */
interface PenRun {
  options: PenOptions
  builder: Path
}

/**
 * The fluent pen behind `pic.pen()` — TikZ's threaded `\draw`
 * statement as a chainable object. Accumulates segments (per-run
 * options split by `push()`), mid-statement labels, and named
 * coordinates; compiles to paths on the host picture at flush time.
 */
export class Pen {
  private readonly host?: PenHost
  private runs: PenRun[]
  private texts: { at: Point; text: string; options?: PictureTextOptions }[] = []
  private penPoint?: Point
  private subpathStart?: Point
  /**
   * The operation just drawn, as a standalone single-subpath Path —
   * `pos` labels ride this via pathLabelPoint (arc-length t, numeric
   * tangent). One operation may append several segments (hvTo).
   */
  private lastOp?: Path

  constructor(options: PenOptions = {}, host?: PenHost) {
    this.host = host
    this.runs = [{ options, builder: path() }]
  }

  /** Current pen position, undefined before the first moveTo/lineTo. */
  get position(): Point | undefined {
    return this.penPoint
  }

  /** Lift the pen and move (TikZ pen position after `(a)`). */
  moveTo(p: PenPoint): this
  moveTo(x: number, y: number): this
  moveTo(a: PenPoint | number, b?: number): this {
    const p = this.pt(a, b)
    this.run.builder = this.run.builder.moveTo(p)
    this.penPoint = p
    this.subpathStart = p
    this.lastOp = undefined
    return this
  }

  /** Draw a segment to a point (TikZ `--`). As first verb, acts as moveTo. */
  lineTo(p: PenPoint): this
  lineTo(x: number, y: number): this
  lineTo(a: PenPoint | number, b?: number): this {
    if (!this.penPoint) {
      return typeof a === 'number' ? this.moveTo(a, b ?? 0) : this.moveTo(a as PenPoint)
    }
    const to = this.pt(a, b)
    return this.apply('lineTo', (p) => p.lineTo(to))
  }

  /**
   * Connect to a point — TikZ's `to` operation.
   *
   * With no routing options this is exactly `--` (a straight segment;
   * as the first verb it acts as `moveTo`). With `out`/`in`/`bend`/
   * `looseness` it draws a single cubic Bézier whose control points are
   * derived from those angles — TikZ `to[out=30, in=150]`:
   *
   * ```ts
   * pic.pen()
   *   .moveTo('A')
   *   .to('B', { out: 30, in: 150 })        // curved
   *   .to('C', { bend: 'left' })             // TikZ bend left (= 30°)
   *   .to('D')                               // straight, like `--`
   * ```
   *
   * `pos` labels after a curved `to` ride the Bézier by arc length.
   */
  to(p: PenPoint, options?: ToOptions): this
  to(x: number, y: number, options?: ToOptions): this
  to(a: PenPoint | number, b?: number | ToOptions, c?: ToOptions): this {
    let end: Point
    let options: ToOptions | undefined
    if (typeof a === 'number') {
      end = this.pt(a, typeof b === 'number' ? b : 0)
      options = typeof b === 'object' ? b : c
    } else {
      end = this.pt(a as PenPoint)
      options = typeof b === 'object' ? b : undefined
    }

    // Plain `to` (no out/in/bend) is a straight segment — TikZ's `--`.
    if (!options || !hasRouting(options)) {
      if (!this.penPoint) return this.moveTo(end)
      return this.apply('lineTo', (p) => p.lineTo(end))
    }

    const from = this.requirePen('to')
    const [c1, c2] = bezierControlPoints(from, end, options)
    return this.apply('curveTo', (p) => p.curveTo(c1, c2, end))
  }

  /** Horizontal segment to x (TikZ `… -| (x,y)` horizontal leg). */
  horizontalTo(x: number): this {
    return this.lineTo(x, this.requirePen('horizontalTo').y)
  }

  /** Vertical segment to y. */
  verticalTo(y: number): this {
    return this.lineTo(this.requirePen('verticalTo').x, y)
  }

  /** Relative segment (TikZ `++`). */
  lineBy(dx: number, dy: number): this {
    const p = this.requirePen('lineBy')
    return this.lineTo(p.x + dx, p.y + dy)
  }

  /**
   * Corner operation, horizontal leg then vertical leg (TikZ `-|`).
   * A `pos` label after it rides the whole two-segment operation by
   * arc length — `pos: 0.5` on a square corner lands on the elbow.
   */
  hvTo(p: PenPoint): this
  hvTo(x: number, y: number): this
  hvTo(a: PenPoint | number, b?: number): this {
    const to = this.pt(a, b)
    return this.apply('hvTo', (p) => p.hvTo(to))
  }

  /** Corner operation, vertical leg then horizontal leg (TikZ `|-`). */
  vhTo(p: PenPoint): this
  vhTo(x: number, y: number): this
  vhTo(a: PenPoint | number, b?: number): this {
    const to = this.pt(a, b)
    return this.apply('vhTo', (p) => p.vhTo(to))
  }

  /**
   * Cubic Bézier segment (TikZ `.. controls (c1) and (c2) ..`).
   * `pos` labels ride the curve by arc length.
   */
  curveTo(cp1: PenPoint, cp2: PenPoint, end: PenPoint): this {
    const c1 = this.pt(cp1)
    const c2 = this.pt(cp2)
    const e = this.pt(end)
    return this.apply('curveTo', (p) => p.curveTo(c1, c2, e))
  }

  /**
   * Smooth cubic continuation — the first control point mirrors the
   * previous curve's second control point across the pen position.
   */
  smoothCurveTo(cp2: PenPoint, end: PenPoint): this {
    const c2 = this.pt(cp2)
    const e = this.pt(end)
    return this.apply('smoothCurveTo', (p) => p.smoothCurveTo(c2, e))
  }

  /** Quadratic Bézier segment. */
  quadraticTo(cp: PenPoint, end: PenPoint): this {
    const c = this.pt(cp)
    const e = this.pt(end)
    return this.apply('quadraticTo', (p) => p.quadraticTo(c, e))
  }

  /**
   * SVG-style endpoint arc: ellipse radii `rx`/`ry`, x-axis `rotation`
   * (degrees), `largeArc`/`sweep` flags, to `end`. (TikZ's center-based
   * `arc(start:end:r)` is the `arc()` shape, not this verb.)
   */
  arcTo(
    rx: number,
    ry: number,
    rotation: number,
    largeArc: boolean,
    sweep: boolean,
    end: PenPoint
  ): this {
    const e = this.pt(end)
    return this.apply('arcTo', (p) => p.arcTo(rx, ry, rotation, largeArc, sweep, e))
  }

  /** Circular endpoint arc — {@link arcTo} with `rx = ry = radius`. */
  circularArcTo(radius: number, largeArc: boolean, sweep: boolean, end: PenPoint): this {
    const e = this.pt(end)
    return this.apply('circularArcTo', (p) => p.circularArcTo(radius, largeArc, sweep, e))
  }

  /** Smooth curve through an intermediate point (TikZ `..` looseness). */
  through(p: PenPoint, end: PenPoint): this {
    const mid = this.pt(p)
    const e = this.pt(end)
    return this.apply('through', (b) => b.through(mid, e))
  }

  /** Bent curve — TikZ `bend left=<angle>` / `bend right=<angle>`. */
  bendTo(end: PenPoint, angle: number): this {
    const e = this.pt(end)
    return this.apply('bendTo', (p) => p.bendTo(e, angle))
  }

  /**
   * Close the subpath (TikZ `-- cycle`): a segment back to the last
   * moveTo (or the last `push()` point — a pushed run is its own
   * statement), which becomes the pen position (so a `pos` label
   * right after close() rides the closing segment).
   */
  close(): this {
    const from = this.requirePen('close')
    this.run.builder = this.run.builder.close()
    // The closing segment as an explicit line: in a standalone subpath
    // Z would close to the subpath's own start (= from), not to the
    // pen-level subpathStart.
    this.lastOp = new Path([
      { type: 'M', points: [from] },
      { type: 'L', points: [this.subpathStart!] },
    ])
    this.penPoint = this.subpathStart
    return this
  }

  /**
   * Name the current pen position (TikZ `coordinate (A)` mid-path).
   * The name registers with the owning picture immediately, so later
   * statements can use it: `pic.edge('A', 'B')`, `pen.lineTo('A')`,
   * `pic.resolve('A')`. The pen does not move. Requires a pen created
   * via `pic.pen()`; throws on duplicate names.
   */
  coordinate(name: string): this {
    const at = this.requirePen('coordinate')
    if (!this.host) {
      throw new Error(
        'pen.coordinate(): needs a picture — create pens via pic.pen().'
      )
    }
    this.host.coordinate(name, at)
    return this
  }

  /**
   * Restyle mid-statement (TikZ `[...]` between coordinates):
   * subsequent segments compile to a NEW path item whose options
   * inherit the current run's and override with `options` (styles
   * merge; `mode` may switch too). The pen does not move, but the new
   * run is its own subpath — `close()` after `push()` cycles to the
   * push point.
   *
   * ```ts
   * pic.pen({ style: { stroke: '#64748b', dash: 'dashed' } })
   *   .moveTo(0, 0).lineTo(100, 0)           // dashed grey
   *   .push({ style: { stroke: '#dc2626', strokeWidth: 2 } })
   *   .lineTo(200, 0)                         // still dashed, now red & thicker
   * ```
   */
  push(options: PenOptions = {}): this {
    const from = this.requirePen('push')
    const prev = this.run.options
    const merged: PenOptions = {
      ...prev,
      ...options,
      style: mergeStyleSpec(prev.style, options.style),
    }
    this.runs.push({ options: merged, builder: path().moveTo(from) })
    this.subpathStart = from
    this.lastOp = undefined
    return this
  }

  /**
   * Hang a label on the statement (TikZ `node[...]`):
   *   - default: placed relative to the CURRENT pen position via
   *     placeText — `{ at: 'south east', distance: 4 }`;
   *   - with `pos`: rides the operation just drawn by arc length —
   *     `{ pos: 0.5, offset: 8 }` (TikZ `node[midway, auto=left]`).
   *     Works on lines, corners (hvTo/vhTo), curves, arcs, and the
   *     closing segment.
   * The pen does not move.
   */
  label(text: string, label: Omit<DrawLabel, 'text'> = {}): this {
    const pen = this.requirePen('label')
    let at: Point
    if (label.pos !== undefined) {
      if (!this.lastOp) {
        throw new Error(
          `pen.label(): 'pos' rides the segment just drawn — none yet ` +
            `(needs a lineTo/close before it).`
        )
      }
      at = pathLabelPoint(this.lastOp, { text, ...label })
    } else {
      at = placeText(pen, text, {
        at: label.at,
        distance: label.distance,
        fontSize: label.options?.fontSize,
        fontFamily: label.options?.fontFamily,
      })
    }
    this.texts.push({
      at,
      text,
      options: { fontSize: DEFAULT_LABEL_FONT_SIZE, ...label.options },
    })
    return this
  }

  /**
   * Expand into picture items: one bare path per styling run (runs
   * without any drawing segments — a lone moveTo, an untouched push —
   * emit nothing) plus the label text items. Called by Picture at
   * render and bounds time — labels paint right after their paths.
   */
  items(): PictureItem[] {
    const items: PictureItem[] = []
    for (const run of this.runs) {
      if (!run.builder.segments.some((s) => s.type !== 'M')) continue
      const { mode, ...renderOptions } = run.options
      items.push({
        kind: 'bare',
        obj: run.builder,
        mode: mode ?? 'draw',
        options: renderOptions,
      })
    }
    for (const t of this.texts) {
      items.push({ kind: 'text', at: t.at, text: t.text, options: t.options })
    }
    return items
  }

  private get run(): PenRun {
    return this.runs[this.runs.length - 1]!
  }

  /**
   * Run a drawing verb against the current run's builder, recording
   * the appended segments as {@link lastOp} (a standalone subpath
   * starting at the pen position) and advancing the pen to the
   * builder's new endpoint.
   */
  private apply(verb: string, draw: (p: Path) => Path): this {
    const from = this.requirePen(verb)
    const before = this.run.builder.segments.length
    this.run.builder = draw(this.run.builder)
    const appended = this.run.builder.segments.slice(before)
    this.lastOp = new Path([{ type: 'M', points: [from] }, ...appended])
    this.penPoint = this.run.builder.currentPoint
    return this
  }

  private requirePen(verb: string): Point {
    if (!this.penPoint) {
      throw new Error(`pen.${verb}(): no pen position yet — start with moveTo.`)
    }
    return this.penPoint
  }

  /** Resolve a point argument: literal PointLike, x/y pair, or name. */
  private pt(a: PenPoint | number, b?: number): Point {
    if (typeof a === 'string') {
      if (!this.host) {
        throw new Error(
          `pen: string coordinates ('${a}') need a picture — create pens via pic.pen().`
        )
      }
      return this.host.resolve(a)
    }
    return typeof a === 'number' ? point(a, b ?? 0) : point(a.x, a.y)
  }
}

/**
 * Inherit a run's style under its overrides. The result stays a RAW
 * {@link StyleSpec} (array form = TikZ option list, later wins) so the
 * path-mode baseline in mergePathMode still applies underneath —
 * unlike mergeStyles, which bakes in DEFAULT_STYLE.
 */
function mergeStyleSpec(
  base: StyleSpec | undefined,
  over: StyleSpec | undefined
): StyleSpec | undefined {
  if (!base) return over
  if (!over) return base
  return [
    ...(Array.isArray(base) ? base : [base]),
    ...(Array.isArray(over) ? over : [over]),
  ]
}

/** Whether `to()` options request a curve (out/in/bend set). */
function hasRouting(o: ToOptions): boolean {
  return o.out !== undefined || o.in !== undefined || (o.bend ?? 0) !== 0
}
