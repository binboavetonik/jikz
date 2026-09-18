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
import { JikzError } from '../core/errors'
import { Point, point } from '../core/Point'
import { degToRad } from '../utils/math'
import type { PointLike } from '../core/types'
import { Path, path } from '../path/Path'
import { shortenPath } from '../path/PathOperations'
import { bezierControlPoints, type BezierRouteOptions } from '../path/bezier'
import {
  placeText,
  DEFAULT_LABEL_FONT_SIZE,
} from '../text/placeText'
import { pathLabelPoint, pathTangentAngle } from '../text/shapeLabels'
import { readableAngle, type Label } from '../text/Label'
import { Frame, isRelative, type RelativePoint } from './Frame'
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
  /** Trim the statement's first segment by this many px (TikZ `shorten <`). */
  shortenStart?: number
  /** Trim the statement's last segment by this many px (TikZ `shorten >`). */
  shortenEnd?: number
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
  /** The frame the pen's coordinates are written in. */
  readonly frame?: Frame
  /** A label with the container's `every.text` and the label default folded in. */
  labelStyle?(label: Label): Label
  /** Register a named node (the pen's `node` verb). */
  node?(name: string, options: Record<string, unknown>): unknown
}

/** Keys of the pen's `arc` — TikZ `arc[start angle, end angle, radius]`. */
export interface PenArcOptions {
  /** Start angle, degrees, in the picture's frame. Default 0. */
  start?: number
  /** End angle; give `end` or `delta`. */
  end?: number
  /** Angle swept from `start`; give `end` or `delta`. */
  delta?: number
  /** Radius, in coordinate units. */
  radius?: number
  /** Elliptical radii, in coordinate units (override `radius`). */
  xRadius?: number
  yRadius?: number
}

/** Keys of the pen's `grid` — TikZ `grid[step, xstep, ystep]`. */
export interface PenGridOptions {
  /** Grid step in coordinate units (default 1). */
  step?: number
  xstep?: number
  ystep?: number
}

/** Keys of the pen's `circle`/`ellipse`, in coordinate units. */
export interface PenCircleOptions {
  radius?: number
  xRadius?: number
  yRadius?: number
}

/**
 * A point, a named reference — `"A"`, `"A.north"`, `"A.45"` — or a
 * relative step `rel(dx, dy)` (TikZ `++(dx, dy)`) from the pen.
 */
export type PenPoint = PointLike | string | RelativePoint

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
    const frame = this.frame
    const routed = frame.identity
      ? options
      : {
          ...options,
          ...(options.out !== undefined ? { out: frame.angle(options.out) } : {}),
          ...(options.in !== undefined ? { in: frame.angle(options.in) } : {}),
        }
    const [c1, c2] = bezierControlPoints(from, end, routed)
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
    const f = this.frame
    return this.apply('arcTo', (p) =>
      p.arcTo(f.length(rx), f.length(ry), f.angle(rotation), largeArc, f.flipsY ? !sweep : sweep, e)
    )
  }

  /** Circular endpoint arc — {@link arcTo} with `rx = ry = radius`. */
  circularArcTo(radius: number, largeArc: boolean, sweep: boolean, end: PenPoint): this {
    const e = this.pt(end)
    const f = this.frame
    return this.apply('circularArcTo', (p) =>
      p.circularArcTo(f.length(radius), largeArc, f.flipsY ? !sweep : sweep, e)
    )
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
   * TikZ `rectangle (corner)`: the axis-aligned rectangle with the pen
   * position and `corner` as opposite corners, as its own closed
   * subpath. The pen moves to `corner`, as in TikZ.
   */
  rectangle(corner: PenPoint): this
  rectangle(x: number, y: number): this
  rectangle(a: PenPoint | number, b?: number): this {
    const from = this.requirePen('rectangle')
    const c = this.pt(a, b)
    return this.subpath(
      'rectangle',
      (p) => p.lineTo({ x: c.x, y: from.y }).lineTo(c).lineTo({ x: from.x, y: c.y }).close().moveTo(c),
      c
    )
  }

  /**
   * TikZ `circle[radius]` / `circle (r)`: a circle centred on the pen
   * position, as its own subpath; the pen stays put. Radii are in
   * coordinate units.
   */
  circle(radius: number): this
  circle(options: PenCircleOptions): this
  circle(a: number | PenCircleOptions): this {
    const o = typeof a === 'number' ? { radius: a } : a
    const rx = this.frame.length(o.xRadius ?? o.radius ?? 1)
    const ry = this.frame.length(o.yRadius ?? o.radius ?? 1)
    const c = this.requirePen('circle')
    return this.subpath(
      'circle',
      (p) =>
        p
          .moveTo({ x: c.x + rx, y: c.y })
          .arcTo(rx, ry, 0, false, true, { x: c.x - rx, y: c.y })
          .arcTo(rx, ry, 0, false, true, { x: c.x + rx, y: c.y })
          .close()
          .moveTo(c),
      c
    )
  }

  /** TikZ `ellipse[x radius, y radius]` / `ellipse (a and b)` — see {@link circle}. */
  ellipse(xRadius: number, yRadius: number): this {
    return this.circle({ xRadius, yRadius })
  }

  /**
   * TikZ `arc[start angle=…, end angle=…, radius=…]`: the arc of the
   * circle (or ellipse) on which the pen position sits at `start`,
   * swept to `end` (or by `delta`). Angles are frame angles — in a
   * `frame: 'math'` picture, counter-clockwise from east, as in TikZ.
   * The pen moves to the arc's end.
   */
  arc(options: PenArcOptions): this
  arc(start: number, end: number, radius: number): this
  arc(a: PenArcOptions | number, b?: number, c?: number): this {
    const o: PenArcOptions = typeof a === 'number' ? { start: a, end: b, radius: c } : a
    const from = this.requirePen('arc')
    const f = this.frame
    const rx = f.length(o.xRadius ?? o.radius ?? 1)
    const ry = f.length(o.yRadius ?? o.radius ?? 1)
    const start = o.start ?? 0
    const end = o.end ?? (o.delta !== undefined ? start + o.delta : start + 90)
    // Screen angles from here on.
    const s = f.angle(start)
    const e = f.angle(end)
    const sr = degToRad(s)
    const er = degToRad(e)
    const snap = (v: number) => Math.round(v * 1e9) / 1e9 // cos(90°) is 6e-17, not 0
    const center = { x: from.x - rx * Math.cos(sr), y: from.y - ry * Math.sin(sr) }
    const to = point(snap(center.x + rx * Math.cos(er)), snap(center.y + ry * Math.sin(er)))
    const sweep = e > s // increasing screen angle is clockwise = SVG sweep 1
    const largeArc = Math.abs(e - s) > 180
    return this.apply('arc', (p) => p.arcTo(rx, ry, 0, largeArc, sweep, to))
  }

  /**
   * TikZ `grid[step] (corner)`: grid lines every `step` coordinate
   * units over the box between the pen position and `corner`. The pen
   * moves to `corner`.
   */
  grid(corner: PenPoint, options?: PenGridOptions): this
  grid(x: number, y: number, options?: PenGridOptions): this
  grid(a: PenPoint | number, b?: number | PenGridOptions, c?: PenGridOptions): this {
    const from = this.requirePen('grid')
    const o = (typeof a === 'number' ? c : (b as PenGridOptions | undefined)) ?? {}
    const to = typeof a === 'number' ? this.pt(a, typeof b === 'number' ? b : 0) : this.pt(a as PenPoint)
    const f = this.frame
    const xs = f.length(o.xstep ?? o.step ?? 1)
    const ys = f.length(o.ystep ?? o.step ?? 1)
    const x0 = Math.min(from.x, to.x)
    const x1 = Math.max(from.x, to.x)
    const y0 = Math.min(from.y, to.y)
    const y1 = Math.max(from.y, to.y)
    const eps = 1e-9
    return this.subpath(
      'grid',
      (p) => {
        let q = p
        for (let x = x0; x <= x1 + eps; x += xs) q = q.moveTo({ x, y: y0 }).lineTo({ x, y: y1 })
        for (let y = y0; y <= y1 + eps; y += ys) q = q.moveTo({ x: x0, y }).lineTo({ x: x1, y })
        return q.moveTo(to)
      },
      to
    )
  }

  /**
   * TikZ `parabola[bend=(b)] (end)`: a parabola from the pen position
   * to `end`. With no bend the vertex is the pen position; with one,
   * the curve passes through the vertex `bend` on its way. Exact —
   * each half is one quadratic Bézier.
   */
  parabola(end: PenPoint, options: { bend?: PenPoint } = {}): this {
    const from = this.requirePen('parabola')
    const e = this.pt(end)
    if (options.bend === undefined) {
      return this.apply('parabola', (p) => p.quadraticTo({ x: (from.x + e.x) / 2, y: from.y }, e))
    }
    const v = this.pt(options.bend)
    return this.apply('parabola', (p) =>
      p.quadraticTo({ x: (from.x + v.x) / 2, y: v.y }, v).quadraticTo({ x: (e.x + v.x) / 2, y: v.y }, e)
    )
  }

  /**
   * TikZ `sin (end)`: a quarter sine wave from the pen to `end`,
   * scaled into that box — level at the pen, steepest at the end. One
   * cubic Bézier, within 0.2% of the true curve.
   */
  sin(end: PenPoint): this {
    const from = this.requirePen('sin')
    const e = this.pt(end)
    const dx = e.x - from.x
    const dy = e.y - from.y
    return this.apply('sin', (p) =>
      p.curveTo({ x: from.x + 0.36 * dx, y: from.y + 0.5655 * dy }, { x: from.x + 0.64 * dx, y: e.y }, e)
    )
  }

  /** TikZ `cos (end)`: a quarter cosine wave — level at the pen, steepest at `end`. */
  cos(end: PenPoint): this {
    const from = this.requirePen('cos')
    const e = this.pt(end)
    const dx = e.x - from.x
    const dy = e.y - from.y
    return this.apply('cos', (p) =>
      p.curveTo({ x: from.x + 0.36 * dx, y: from.y }, { x: from.x + 0.64 * dx, y: from.y + 0.5655 * dy }, e)
    )
  }

  /**
   * TikZ `node[…] (name) {text}` on a path: a real, named node placed
   * at the pen position — or riding the operation just drawn with
   * `pos` — taking the same options as `pic.node()`. The pen does not
   * move; the node paints after the path, as in TikZ.
   */
  node(name: string, options: Record<string, unknown> & { pos?: number; offset?: number } = {}): this {
    if (!this.host?.node) {
      throw new JikzError('invalid-argument', 'pen.node(): needs a picture — create pens via pic.pen().')
    }
    const { pos, offset, ...rest } = options
    let at: Point
    if (pos !== undefined) {
      if (!this.lastOp) {
        throw new JikzError('invalid-argument', `pen.node(): 'pos' rides the segment just drawn — none yet.`)
      }
      at = pathLabelPoint(this.lastOp, { text: '', pos, offset: offset ?? 0 })
    } else {
      at = this.requirePen('node')
    }
    // The host maps `at` through the frame; hand it a frame coordinate.
    this.host.node(name, { ...rest, at: this.frame.unmap(at) })
    return this
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
      throw new JikzError('invalid-argument', 
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
  label(text: string, spec: Omit<Label, 'text'> = {}): this {
    const pen = this.requirePen('label')
    const raw: Label = { text, ...spec }
    const label = this.host?.labelStyle?.(raw) ?? {
      ...raw,
      style: { fontSize: DEFAULT_LABEL_FONT_SIZE, ...raw.style },
    }
    let at: Point
    if (label.pos !== undefined) {
      if (!this.lastOp) {
        throw new JikzError('invalid-argument', 
          `pen.label(): 'pos' rides the segment just drawn — none yet ` +
            `(needs a lineTo/close before it).`
        )
      }
      at = pathLabelPoint(this.lastOp, label)
    } else {
      at = placeText(pen, text, {
        at: label.at,
        distance: label.distance,
        fontSize: label.style?.fontSize,
        fontFamily: label.style?.fontFamily,
      })
    }
    this.texts.push({
      at,
      text,
      options: {
        style: label.style,
        ...(label.sloped && label.pos !== undefined && this.lastOp
          ? { rotate: readableAngle(pathTangentAngle(this.lastOp, label.pos)) }
          : {}),
      },
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
    const drawn = this.runs.filter((r) => r.builder.segments.some((s) => s.type !== 'M'))
    for (const run of this.runs) {
      if (!run.builder.segments.some((s) => s.type !== 'M')) continue
      const { mode, shortenStart, shortenEnd, ...renderOptions } = run.options
      // A verb that parks the pen (`rectangle`, `circle`, `grid`) leaves
      // a trailing move; it draws nothing, so it is not emitted.
      const segs = run.builder.segments
      let end = segs.length
      while (end > 0 && segs[end - 1]!.type === 'M') end--
      let obj = end === segs.length ? run.builder : new Path(segs.slice(0, end))
      // `shorten <` applies to the statement's first run, `shorten >` to its last.
      const trimStart = run === drawn[0] ? (shortenStart ?? 0) : 0
      const trimEnd = run === drawn[drawn.length - 1] ? (shortenEnd ?? 0) : 0
      if (trimStart > 0 || trimEnd > 0) obj = shortenPath(obj, trimStart, trimEnd)
      items.push({
        kind: 'bare',
        obj,
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

  /**
   * Run a verb that draws its own closed subpath and leaves the pen at
   * `after` (TikZ `rectangle`, `circle`, `grid`): like {@link apply},
   * but the pen position is set explicitly rather than read back from
   * the builder.
   */
  private subpath(verb: string, draw: (p: Path) => Path, after: Point): this {
    this.apply(verb, draw)
    this.penPoint = after
    return this
  }

  private requirePen(verb: string): Point {
    if (!this.penPoint) {
      throw new JikzError('no-pen-position', `pen.${verb}(): no pen position yet — start with moveTo.`)
    }
    return this.penPoint
  }

  /** The frame this pen's coordinates are written in. */
  private get frame(): Frame {
    return this.host?.frame ?? Frame.SCREEN
  }

  /** Resolve a point argument: literal PointLike, x/y pair, relative step, or name. */
  private pt(a: PenPoint | number, b?: number): Point {
    if (typeof a === 'string') {
      if (!this.host) {
        throw new JikzError('invalid-argument', 
          `pen: string coordinates ('${a}') need a picture — create pens via pic.pen().`
        )
      }
      return this.host.resolve(a)
    }
    if (isRelative(a)) {
      const from = this.requirePen('relative coordinate')
      return from.add(this.frame.vector(a.dx, a.dy))
    }
    return this.frame.point(typeof a === 'number' ? { x: a, y: b ?? 0 } : a)
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
