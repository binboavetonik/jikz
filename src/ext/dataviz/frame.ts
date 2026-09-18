/**
 * Axes and the chart frame — jikz's analogue of TikZ's
 * `datavisualization` axes system: scaled axes with nice ticks,
 * gridlines, tick labels, and axis labels, plus the series builders
 * (`line`/`scatter`/`bars`) that draw data through the frame's scales.
 *
 * The frame owns two {@link Scale}s — data units → picture coordinates
 * — so series code never touches flipped y coordinates:
 *
 * ```ts
 * const frame = axes(pic, {
 *   at: point(50, 230), width: 320, height: 180,
 *   x: { domain: [0, 10], label: 'time', grid: true },
 *   y: { domain: [0, 80], label: 'value', grid: true },
 * })
 * frame.line(seriesA, { style: { stroke: '#2563eb' }, marks: 'o' })
 * frame.bars(seriesB, { style: { fill: '#f59e0b', stroke: 'none' } })
 * ```
 */
import { Point, point } from '../../core/Point'
import type { PointLike } from '../../core/types'
import type { ShapeSet } from '../../geometry/ShapeKind'
import type { ItemContainer, DrawOptions } from '../../picture/Container'
import type { RenderStyle, StyleSpec } from '../../render/StyleMapper'
import { resolveStyle } from '../../render/StyleMapper'
import { line } from '../../geometry/Line'
import { rect } from '../../geometry/Rectangle'
import { Plot } from '../../geometry/Plot'
import { polylinePath } from '../../path/Path'
import { pathFromSVG } from '../../path/svgPath'
import {
  plotMarkPath,
  plotMarkFilled,
  type PlotMark,
  type PlotMarkSpec,
} from '../../geometry/PlotMark'
import {
  linearScale,
  niceTicks,
  formatTick,
  isFiniteSample,
  type Scale,
  type DataSeries,
} from './scale'

/** Options for one axis of {@link axes}. */
export interface AxisOptions {
  /**
   * Data range the axis covers. Widened outward to nice step
   * boundaries unless {@link exact} is set (TikZ `about` behavior).
   * Default: [0, 1].
   */
  domain?: [number, number]
  /** Desired number of tick intervals anchor (default 5). */
  ticks?: number
  /** Explicit tick values — overrides {@link ticks} and nice widening of positions. */
  tickValues?: readonly number[]
  /** Keep {@link domain} exactly as given; ticks outside it drop off. */
  exact?: boolean
  /** Axis label (below the x axis / above the y axis). */
  label?: string
  /** Gridlines across the plot area at each tick. */
  grid?: boolean
  /** Tick label formatter (default: compact number). */
  format?: (v: number) => string
  /** Set false to draw ticks without labels. Default: true. */
  tickLabels?: boolean
}

/** Options for {@link axes}. */
export interface AxesOptions {
  /** Origin of the plot area (south west corner) in picture coords. */
  at: PointLike
  /** Plot area width, px. */
  width: number
  /** Plot area height, px. */
  height: number
  /** X axis configuration. */
  x?: AxisOptions
  /** Y axis configuration. */
  y?: AxisOptions
  /** Arrow tips on the positive axis ends (TikZ dataviz default look). */
  arrows?: boolean
  /** Axis line style (default: dark slate, 1.5px). */
  style?: StyleSpec
  /** Tick mark style (default: the axis style). */
  tickStyle?: StyleSpec
  /** Gridline style (default: light slate, 1px). */
  gridStyle?: StyleSpec
  /** Tick label font size (default 10). */
  fontSize?: number
  /** Axis label font size (default `fontSize + 1`). */
  labelFontSize?: number
  /** Tick mark length, px (default 4). */
  tickSize?: number
}

const DEFAULT_AXIS_STYLE: Partial<RenderStyle> = { stroke: '#334155', strokeWidth: 1.5 }
const DEFAULT_GRID_STYLE: Partial<RenderStyle> = { stroke: '#e2e8f0', strokeWidth: 1 }
const DEFAULT_BAR_STYLE: Partial<RenderStyle> = { fill: '#64748b', stroke: 'none' }

interface ResolvedAxis {
  ticks: number[]
  min: number
  max: number
}

function resolveAxis(o: AxisOptions): ResolvedAxis {
  let resolved: ResolvedAxis
  if (o.tickValues) {
    const ticks = [...o.tickValues].sort((a, b) => a - b)
    const [min, max] = o.domain ?? [ticks[0] ?? 0, ticks[ticks.length - 1] ?? 1]
    resolved = { ticks, min, max }
  } else {
    const domain = o.domain ?? [0, 1]
    const nice = niceTicks(domain[0], domain[1], o.ticks ?? 5)
    resolved = o.exact
      ? {
          ticks: nice.ticks.filter((t) => t >= domain[0] && t <= domain[1]),
          min: domain[0],
          max: domain[1],
        }
      : nice
  }
  // A flat domain (single tick value, all-equal tick values, or an
  // explicit [v, v]) would hand linearScale a degenerate domain and
  // throw. Widen symmetrically, the niceTicks convention.
  if (resolved.min === resolved.max) {
    resolved = {
      ...resolved,
      min: resolved.min - 0.5,
      max: resolved.max + 0.5,
    }
  }
  return resolved
}

/** Normalize the marks shorthand: a bare name is `{ name }`. */
function normalizeMarkSpec(
  marks: PlotMark | PlotMarkSpec | undefined
): PlotMarkSpec | undefined {
  if (marks === undefined) return undefined
  return typeof marks === 'string' ? { name: marks } : marks
}

/**
 * Paint scatter markers at picture-space points. Mirrors the plot-mark
 * convention: open marks stroke the series color, `*Filled` marks fill
 * it. The color is the series style's stroke — falling back to its
 * fill (a filled series styled `stroke: 'none'` still colors its
 * marks), then to black.
 *
 * Package-internal (shared with the legend's sample swatches) — not
 * re-exported from ext/dataviz.
 */
export function drawMarks<S extends ShapeSet>(
  pic: ItemContainer<S>,
  pts: readonly Point[],
  spec: PlotMarkSpec,
  style: StyleSpec | undefined
): void {
  const d = plotMarkPath(spec.name, spec.size ?? 5)
  if (!d) return
  const pick = (c: string | undefined): string | undefined =>
    c !== undefined && c !== 'none' ? c : undefined
  const resolved = style ? resolveStyle(style) : undefined
  const color = pick(resolved?.stroke) ?? pick(resolved?.fill) ?? '#000000'
  const paint: Partial<RenderStyle> = plotMarkFilled(spec.name)
    ? { fill: color, stroke: 'none' }
    : { stroke: color, fill: 'none', strokeWidth: 1.5 }
  const every = Math.max(1, spec.every ?? 1)
  // The glyph is the same at every point — parse once, translate per
  // point (Path.translate returns a new Path).
  const glyph = pathFromSVG(d)
  pts.forEach((p, i) => {
    if (i % every !== 0) return
    pic.filldraw(glyph.translate(p.x, p.y), { style: paint })
  })
}

/** Options for {@link ChartFrame.line}. */
export interface FrameLineOptions extends DrawOptions {
  /** Catmull-Rom smoothing through the data points. */
  smooth?: boolean
  /** Scatter markers at each (or every Nth) data point. */
  marks?: PlotMark | PlotMarkSpec
}

/** Options for {@link ChartFrame.scatter}. */
export interface FrameScatterOptions extends DrawOptions {
  /** Marker (default `circleFilled`). */
  marks?: PlotMark | PlotMarkSpec
}

/** Options for {@link ChartFrame.bars}. */
export interface FrameBarOptions {
  /**
   * Bar width in picture units. Default: 60% of the smallest gap
   * between consecutive x values.
   */
  width?: number
  /**
   * Baseline in data units (default 0), clamped into the y domain.
   * Note the clamp covers the BASELINE only: a bar value outside the
   * y domain still draws outside the plot area (data is never
   * clipped silently).
   */
  baseline?: number
  /** Bar paint (default: solid slate). */
  style?: StyleSpec
}

/**
 * A framed chart: two scales (data → picture coords), the plot area,
 * the resolved ticks, and series builders that draw through it. What
 * {@link axes} and `chart()` return.
 */
export class ChartFrame {
  constructor(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private readonly pic: ItemContainer<any>,
    /** Plot area [minX, minY, maxX, maxY] in picture coords (minY = top). */
    readonly area: [number, number, number, number],
    readonly xScale: Scale,
    readonly yScale: Scale,
    /** Tick values actually drawn, in data units. */
    readonly xTicks: readonly number[],
    readonly yTicks: readonly number[],
    /** The (possibly nice-widened) data ranges the scales cover. */
    readonly xDomain: readonly [number, number],
    readonly yDomain: readonly [number, number]
  ) {}

  /** Map an x data value to a picture x coordinate. */
  x(v: number): number {
    return this.xScale(v)
  }

  /** Map a y data value to a picture y coordinate. */
  y(v: number): number {
    return this.yScale(v)
  }

  /** Map a data point to a picture point. */
  point(xv: number, yv: number): Point {
    return point(this.x(xv), this.y(yv))
  }

  private dataPoints(data: DataSeries): Point[] {
    return data.filter(isFiniteSample).map(([xv, yv]) => this.point(xv, yv))
  }

  /**
   * Draw a polyline (or smooth curve) through data points.
   *
   * ```ts
   * frame.line(series, { style: { stroke: '#2563eb' }, marks: 'o' })
   * ```
   */
  line(data: DataSeries, options: FrameLineOptions = {}): this {
    const { smooth = false, marks, ...draw } = options
    const pts = this.dataPoints(data)
    // Fewer than two points: no path to draw, but marks still paint —
    // a one-point series is a scatter of one.
    if (pts.length >= 2) {
      const p = smooth
        ? pathFromSVG(new Plot(pts).toSVGPathSmooth())
        : polylinePath(pts)
      this.pic.draw(p, draw)
    }
    const spec = normalizeMarkSpec(marks)
    if (spec) drawMarks(this.pic, pts, spec, draw.style)
    return this
  }

  /**
   * Draw scatter markers at data points (no connecting line).
   *
   * ```ts
   * frame.scatter(samples, { marks: { name: 'cross', size: 6 }, style: { stroke: '#dc2626' } })
   * ```
   */
  scatter(data: DataSeries, options: FrameScatterOptions = {}): this {
    const { marks = 'circleFilled', ...draw } = options
    const pts = this.dataPoints(data)
    drawMarks(this.pic, pts, normalizeMarkSpec(marks)!, draw.style)
    return this
  }

  /**
   * Draw vertical bars centered on each x value, from the baseline to
   * the y value.
   *
   * ```ts
   * frame.bars([[1, 42], [2, 58]], { style: { fill: '#f59e0b', stroke: 'none' } })
   * ```
   */
  bars(data: DataSeries, options: FrameBarOptions = {}): this {
    const { width, baseline = 0, style = DEFAULT_BAR_STYLE } = options
    const [yMin, yMax] = this.yDomain
    // Bars skip non-finite samples like every other series builder, and
    // a non-finite baseline falls back to 0 rather than NaN-ing them all.
    const samples = data.filter(isFiniteSample)
    const from = Number.isFinite(baseline) ? baseline : 0
    const base = Math.min(yMax, Math.max(yMin, from))
    const w = width ?? this.defaultBarWidth(samples)
    for (const [xv, yv] of samples) {
      const cx = this.x(xv)
      const y0 = this.y(base)
      const y1 = this.y(yv)
      const top = Math.min(y0, y1)
      this.pic.filldraw(rect(cx - w / 2, top, w, Math.abs(y1 - y0)), { style })
    }
    return this
  }

  private defaultBarWidth(data: DataSeries): number {
    if (data.length > 1) {
      const xs = data.map((d) => d[0]).sort((a, b) => a - b)
      let minGap = Infinity
      for (let i = 1; i < xs.length; i++) {
        minGap = Math.min(minGap, xs[i]! - xs[i - 1]!)
      }
      if (Number.isFinite(minGap) && minGap > 0) {
        return Math.abs(this.x(minGap) - this.x(0)) * 0.6
      }
    }
    return ((this.area[2] - this.area[0]) * 0.6) / Math.max(1, data.length)
  }
}

/**
 * Draw scaled axes with nice ticks into a picture and return the
 * {@link ChartFrame} that maps data through them. Gridlines paint
 * first (behind series drawn afterwards), then axes, ticks and labels.
 */
export function axes<S extends ShapeSet>(
  pic: ItemContainer<S>,
  options: AxesOptions
): ChartFrame {
  const {
    at,
    width,
    height,
    arrows = false,
    style,
    tickStyle,
    gridStyle,
    fontSize = 10,
    labelFontSize = fontSize + 1,
    tickSize = 4,
  } = options
  const xo = options.x ?? {}
  const yo = options.y ?? {}

  const xa = resolveAxis(xo)
  const ya = resolveAxis(yo)

  const x0 = at.x
  const yBase = at.y
  const xEnd = x0 + width
  const yTop = yBase - height

  const xScale = linearScale([xa.min, xa.max], [x0, xEnd])
  const yScale = linearScale([ya.min, ya.max], [yBase, yTop])

  const axisPaint: StyleSpec = style ?? DEFAULT_AXIS_STYLE
  const tickPaint: StyleSpec = tickStyle ?? style ?? DEFAULT_AXIS_STYLE
  const gridPaint: StyleSpec = gridStyle ?? DEFAULT_GRID_STYLE
  const fmtX = xo.format ?? formatTick
  const fmtY = yo.format ?? formatTick

  // ── Gridlines (behind everything drawn later) ──────────────────────
  if (xo.grid) {
    for (const t of xa.ticks) {
      const px = xScale(t)
      pic.draw(line(point(px, yBase), point(px, yTop)), { style: gridPaint })
    }
  }
  if (yo.grid) {
    for (const t of ya.ticks) {
      const py = yScale(t)
      pic.draw(line(point(x0, py), point(xEnd, py)), { style: gridPaint })
    }
  }

  // ── Axis lines ─────────────────────────────────────────────────────
  if (arrows) {
    pic.edge(point(x0, yBase), point(xEnd, yBase), {
      arrowStart: 'none',
      arrowEnd: 'to',
      style: axisPaint,
    })
    pic.edge(point(x0, yBase), point(x0, yTop), {
      arrowStart: 'none',
      arrowEnd: 'to',
      style: axisPaint,
    })
  } else {
    pic.draw(line(point(x0, yBase), point(xEnd, yBase)), { style: axisPaint })
    pic.draw(line(point(x0, yBase), point(x0, yTop)), { style: axisPaint })
  }

  // ── Ticks and tick labels ──────────────────────────────────────────
  for (const t of xa.ticks) {
    const px = xScale(t)
    pic.draw(line(point(px, yBase), point(px, yBase + tickSize)), { style: tickPaint })
    if (xo.tickLabels !== false) {
      pic.text(point(px, yBase + tickSize + fontSize * 0.9), fmtX(t), {
        style: { fontSize },
        textAnchor: 'middle',
      })
    }
  }
  for (const t of ya.ticks) {
    const py = yScale(t)
    pic.draw(line(point(x0 - tickSize, py), point(x0, py)), { style: tickPaint })
    if (yo.tickLabels !== false) {
      pic.text(point(x0 - tickSize - 4, py), fmtY(t), {
        style: { fontSize },
        textAnchor: 'end',
        dominantBaseline: 'middle',
      })
    }
  }

  // ── Axis labels ────────────────────────────────────────────────────
  if (xo.label) {
    pic.text(point((x0 + xEnd) / 2, yBase + tickSize + fontSize + 14), xo.label, {
      style: { fontSize: labelFontSize },
      textAnchor: 'middle',
    })
  }
  if (yo.label) {
    // Above the axis and to its RIGHT: centred on x0 it reached back
    // over the tick-label column, and one tick-label height of
    // clearance is what keeps it off the topmost tick.
    pic.text(point(x0, yTop - fontSize - labelFontSize), yo.label, {
      style: { fontSize: labelFontSize },
      textAnchor: 'start',
    })
  }

  return new ChartFrame(
    pic,
    [x0, yTop, xEnd, yBase],
    xScale,
    yScale,
    xa.ticks,
    ya.ticks,
    [xa.min, xa.max],
    [ya.min, ya.max]
  )
}
