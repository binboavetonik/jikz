/**
 * Axes and the chart frame — jikz's analogue of TikZ's
 * `datavisualization` axes system: scaled axes with nice ticks,
 * gridlines, tick labels, and axis labels, plus the series builders
 * (`line`/`area`/`scatter`/`bars`/`candlestick`/`fn`) that draw data
 * through the frame's scales, and the reference marks
 * (`referenceLine`/`referenceArea`/`referenceDot`) that annotate them.
 *
 * The frame owns two {@link Scale}s — data units ↔ picture coordinates
 * — so series code never touches flipped y coordinates:
 *
 * ```ts
 * const frame = axes(pic, {
 *   at: point(50, 230), width: 320, height: 180,
 *   x: { categories: ['Q1', 'Q2', 'Q3', 'Q4'] },
 *   y: { domain: [0, 80], label: 'value', grid: true },
 * })
 * frame.bars(seriesA, { group: { index: 0, count: 2 } })
 * frame.bars(seriesB, { group: { index: 1, count: 2 } })
 * frame.referenceLine({ y: 50, label: 'goal' })
 * ```
 *
 * The frame also **remembers** every series it draws — id, kind,
 * samples in data and picture space, the CSS class its elements carry
 * — and answers {@link ChartFrame.hitTest}. That model is what the
 * interaction layer (tooltips, crosshairs, legend toggles) reads; the
 * SVG never has to be re-derived from the DOM.
 */
import { JikzError } from '../../core/errors'
import { Point, point } from '../../core/Point'
import type { PointLike } from '../../core/types'
import type { ShapeSet } from '../../geometry/ShapeKind'
import type { ItemContainer, DrawOptions } from '../../picture/Container'
import type { RenderStyle, StyleSpec } from '../../render/StyleMapper'
import { resolveStyle, styleList } from '../../render/StyleMapper'
import type { TextStyle } from '../../text/Label'
import { estimateLabelSize } from '../../text/placeText'
import { line } from '../../geometry/Line'
import { rect } from '../../geometry/Rectangle'
import { pathFromSVG } from '../../path/svgPath'
import {
  plotMarkPath,
  plotMarkFilled,
  type PlotMark,
  type PlotMarkSpec,
} from '../../geometry/PlotMark'
import {
  linearScale,
  bandScale,
  logScale,
  functionScale,
  logTicks,
  spreadTicks,
  niceTicks,
  minorTicksBetween,
  formatTick,
  formatLogTick,
  type AboutStrategy,
  type AxisFunction,
  isFiniteSample,
  toSeries,
  toNumber,
  type Scale,
  type DataSeries,
  type DataInput,
  type DataValue,
  type Categories,
} from './scale'
import { interpolatePath, type Interpolation } from './interpolate'
import {
  normalizeEnter,
  enterKeyframe,
  fadeIn,
  drawIn,
  growIn,
  type EnterKind,
  type EnterOptions,
} from './animate'

/** A fill fading up to its own opacity. */
function enterKeyframeOpacity(to: number, e: EnterOptions) {
  return enterKeyframe('fill-opacity', 0, to, e)
}
import { timeScale, timeTicks, type TimeZone } from './time'
import { lightTheme, resolveTheme, type ChartTheme, type ThemeSpec } from './theme'
import {
  resolveStyleSheet,
  slotOf,
  warnWrapped,
  type StyleSheet,
  type StyleSheetSpec,
} from './stylesheet'

/** Options for one axis of {@link axes}. */
export interface AxisOptions {
  /**
   * Data range the axis covers. Widened outward to nice step
   * boundaries unless {@link exact} is set (TikZ `about` behavior).
   * Default: [0, 1]. Ignored with {@link categories}. A time axis
   * takes `Date`s too.
   */
  domain?: readonly [number | Date, number | Date]
  /**
   * Time axis: samples are epoch milliseconds (or `Date`s), ticks
   * land on calendar boundaries — midnight, the 1st, January 1st —
   * and labels say what changed at each. `true` follows UTC; give
   * `{ timeZone: 'local' }` for the viewer's clock and `locale` for
   * the label language.
   */
  time?: boolean | { timeZone?: TimeZone; locale?: string }
  /**
   * Category names — makes this a **band** axis: one equal band per
   * name, ticks at the band centres labelled with the names, and
   * string samples (`['Q1', 42]`) resolving to their index.
   */
  categories?: readonly string[]
  /** Band axes: fraction of each step left empty around its band (default 0.2). */
  bandPadding?: number
  /**
   * Logarithmic axis — TikZ `logarithmic`: positions are linear in
   * log₁₀, major ticks at powers of ten (with 2…9 as minor ticks),
   * the domain widened to whole decades unless {@link exact}. The
   * domain must be positive; `chart()` drops non-positive samples
   * from the auto domain.
   */
  logarithmic?: boolean
  /**
   * A custom axis function — TikZ's axis `function` key: positions are
   * linear in `forward(value)`, ticks stay round data values (so they
   * crowd where the function is flat — a winning-chance axis puts
   * ±1, ±2, ±5 pawns where they belong). Give the guides with
   * `tickValues`, or let the usual search pick them. See
   * {@link AxisFunction}.
   */
  scale?: AxisFunction
  /** Desired number of tick intervals anchor (default 5). */
  ticks?: number
  /** Explicit tick values — overrides {@link ticks} and nice widening of positions. */
  tickValues?: readonly (number | Date)[]
  /** Extra labelled ticks besides the computed ones — TikZ `also at`. */
  alsoAt?: readonly (number | Date)[]
  /**
   * Minor ticks between consecutive major ticks — TikZ `minor steps
   * between steps` (default 0; a logarithmic axis has its mantissa
   * minors unless this is 0).
   */
  minorTicks?: number
  /** Which round steps the ticks may use (default `'standard'`). See {@link AboutStrategy}. */
  about?: AboutStrategy
  /**
   * The fewest ticks a step may leave on the axis (default 2) — a
   * padded exact range never comes out with one lonely tick.
   */
  minTicks?: number
  /** Widen the domain to include these values — TikZ `include value`. */
  includeValue?: number | readonly number[]
  /** Extra room beyond the domain, in data units: one value for both ends or `[min, max]`. */
  padding?: number | readonly [number, number]
  /** Keep {@link domain} exactly as given; ticks outside it drop off. */
  exact?: boolean
  /** Axis label (below the x axis / above the y axis). */
  label?: string
  /**
   * Gridlines across the plot area: `true`/`'major'` at the major
   * ticks, `'minor'` at the minor ones, `'both'`.
   */
  grid?: boolean | 'major' | 'minor' | 'both'
  /** Tick label formatter (default: compact number; the names on a band axis; `10ⁿ` on a log axis). */
  format?: (v: number) => string
  /** Set false to draw ticks without labels. Default: true. */
  tickLabels?: boolean
  /** Label only every n-th major tick (default 1). */
  labelEvery?: number
  /** Rotate tick labels by this many degrees (clockwise); x axis labels anchor at the tick. */
  rotateLabels?: number
  /** Stagger x tick labels over two rows — TikZ `stack` — so long labels don't collide. */
  stackLabels?: boolean
}

/**
 * The look of the axes — TikZ's axis systems. `'scientific'` (default)
 * puts the axes on the plot area's low edges with outer ticks and
 * standard labels; `'schoolBook'` runs them through the origin with
 * arrow tips, centred ticks and end labels — the function-plot look.
 */
export type AxisSystem = 'scientific' | 'schoolBook'

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
  /** Which axis system (default `'scientific'`). See {@link AxisSystem}. */
  axisSystem?: AxisSystem
  /** Arrow tips on the positive axis ends (default: only for `schoolBook`). */
  arrows?: boolean
  /**
   * Which side of the axis line the tick marks sit — TikZ `outer
   * ticks`/`inner ticks`; `'both'` centres them. Default: outer, or
   * both for `schoolBook`.
   */
  tickSide?: 'outer' | 'inner' | 'both'
  /**
   * Where the axis labels go — TikZ `standard labels` (centred below
   * the x axis, above the y axis) or `end labels` (at the arrow ends).
   * Default: standard, or end for `schoolBook`.
   */
  labelStyle?: 'standard' | 'end'
  /** Clip everything drawn through the frame to the plot area (default false). */
  clip?: boolean
  /** Axis line style (default: recessive slate, 1px). */
  style?: StyleSpec
  /** Tick mark style (default: the axis style). */
  tickStyle?: StyleSpec
  /** Gridline style (default: light slate, 1px). */
  gridStyle?: StyleSpec
  /** Minor gridline style (default: lighter slate, 0.5px). */
  minorGridStyle?: StyleSpec
  /** Minor tick mark length, px (default `tickSize / 2`). */
  minorTickSize?: number
  /** Tick label font size (default 10). */
  fontSize?: number
  /** Axis label font size (default `fontSize + 1`). */
  labelFontSize?: number
  /** Tick mark length, px (default 4). */
  tickSize?: number
  /** Tick and axis label text (default: slate ink, `fontSize` sizes). */
  textStyle?: TextStyle
  /**
   * Paint for series drawn without a `style` — TikZ's `style sheet`.
   * Default: the theme's (`'varyHue'`, the categorical palette);
   * `null` for none (unstyled lines paint ink, bars slate). See
   * {@link StyleSheetSpec}.
   */
  styleSheet?: StyleSheetSpec | null
  /**
   * Every ink that is not a series colour — axes, grid, text,
   * reference marks, and the interactive layer's tooltip and brush:
   * `'light'` (default), `'dark'`, or overrides. The explicit style
   * options above still win. See {@link ChartTheme}.
   */
  theme?: ThemeSpec
}

/** The ink of last resort, where no theme is in reach. */
const INK = lightTheme.ink
/** Series lines without a width of their own, px. */
const SERIES_LINE_WIDTH = 2
/** Default mark extents, px: a scatter mark is the datum, a line mark an adornment. */
const SCATTER_MARK_SIZE = 8
const LINE_MARK_SIZE = 6
/** Canvas gap between grouped bars and between stacked segments, px. */
const BAR_GAP = 2
/** Area fills under their line, so overlapping areas stay readable. */
const AREA_FILL_OPACITY = 0.25

interface ResolvedAxis {
  ticks: number[]
  minor: number[]
  min: number
  max: number
}

/** Sorted, de-duplicated union of tick lists; dates as epoch ms. */
function mergeTicks(...lists: readonly (readonly (number | Date)[])[]): number[] {
  return [...new Set(lists.flat().map(ms))].sort((a, b) => a - b)
}

/** A number or a Date as a number. */
function ms(v: number | Date): number {
  return v instanceof Date ? v.getTime() : v
}

/** The clock a time axis follows. */
function timeZoneOf(o: AxisOptions): TimeZone {
  return typeof o.time === 'object' ? (o.time.timeZone ?? 'utc') : 'utc'
}

function resolveAxis(o: AxisOptions): ResolvedAxis {
  if (o.categories) {
    const n = o.categories.length
    return { ticks: o.categories.map((_, i) => i), minor: [], min: -0.5, max: n - 0.5 }
  }
  const log = !!o.logarithmic
  const time = !!o.time
  // The raw domain: as given, else the explicit ticks' extent, else a
  // unit range. includeValue and padding widen it before it is niced.
  const given = o.tickValues ? mergeTicks(o.tickValues) : []
  let [lo, hi] = o.domain
    ? [ms(o.domain[0]), ms(o.domain[1])]
    : given.length
      ? [given[0]!, given[given.length - 1]!]
      : log
        ? [1, 10]
        : time
          ? [Date.UTC(2026, 0, 1), Date.UTC(2026, 0, 2)]
          : [0, 1]
  if (o.includeValue !== undefined) {
    for (const v of typeof o.includeValue === 'number' ? [o.includeValue] : o.includeValue) {
      if (!Number.isFinite(v)) continue
      lo = Math.min(lo, v)
      hi = Math.max(hi, v)
    }
  }
  if (o.padding !== undefined) {
    const [p0, p1] = typeof o.padding === 'number' ? [o.padding, o.padding] : o.padding
    lo -= p0
    hi += p1
  }
  const alsoAt = o.alsoAt ?? []

  let resolved: ResolvedAxis
  if (log) {
    if (!(lo > 0) || !(hi > 0)) {
      throw new JikzError(
        'invalid-argument',
        `axes: a logarithmic axis needs a positive domain, got [${lo}, ${hi}].`
      )
    }
    const min = o.exact ? lo : 10 ** Math.floor(Math.log10(lo) + 1e-9)
    let max = o.exact ? hi : 10 ** Math.ceil(Math.log10(hi) - 1e-9)
    if (min === max) max = min * 10
    const { major, minor } = logTicks(min, max, (o.minorTicks ?? 1) > 0)
    resolved = {
      ticks: mergeTicks(o.tickValues ?? major, alsoAt),
      minor,
      min,
      max,
    }
  } else if (o.tickValues) {
    resolved = { ticks: mergeTicks(given, alsoAt), minor: [], min: lo, max: hi }
  } else if (time) {
    const tz = timeZoneOf(o)
    const count = o.ticks ?? 5
    const first = timeTicks(lo, hi, count, tz)
    // Nice: the domain runs boundary to boundary, and the ticks are
    // every boundary in between. Exact: only the boundaries inside.
    resolved = o.exact
      ? { ticks: mergeTicks(first.ticks, alsoAt), minor: [], min: lo, max: hi }
      : {
          ticks: mergeTicks(timeTicks(first.min, first.max, count, tz).ticks, alsoAt),
          minor: [],
          min: first.min,
          max: first.max,
        }
  } else {
    const nice = niceTicks(lo, hi, o.ticks ?? 5, o.about, { exact: o.exact, minTicks: o.minTicks })
    resolved = o.exact
      ? { ticks: nice.ticks.filter((t) => t >= lo && t <= hi), minor: [], min: lo, max: hi }
      : { ...nice, minor: [] }
    resolved.ticks = mergeTicks(resolved.ticks, alsoAt)
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
  // A function axis keeps its (data-space) domain but spreads its
  // ticks evenly on the page, through the function.
  if (o.scale && !log && !time && !o.tickValues) {
    resolved.ticks = mergeTicks(spreadTicks(resolved.min, resolved.max, o.ticks ?? 5, o.scale.forward), alsoAt)
  }
  if (!log && (o.minorTicks ?? 0) > 0) {
    resolved.minor = minorTicksBetween(resolved.ticks, o.minorTicks!)
  }
  return resolved
}

/**
 * The data range an axis with these options covers — after
 * `includeValue`, `padding` and nice widening — without drawing it.
 * What `frame.xDomain` / `yDomain` will be.
 */
export function axisDomain(options: AxisOptions): [number, number] {
  const resolved = resolveAxis(options)
  return [resolved.min, resolved.max]
}

/** Normalize the marks shorthand: a bare name is `{ name }`. */
function normalizeMarkSpec(
  marks: PlotMark | ChartMarkSpec | undefined
): ChartMarkSpec | undefined {
  if (marks === undefined) return undefined
  return typeof marks === 'string' ? { name: marks } : marks
}

/**
 * A plot mark on a chart: the core spec plus a **ring** — a band of
 * the canvas colour round a filled mark, so overlapping marks and
 * marks on a line read as separate dots. The ring is drawn *outside*
 * the mark: `size` stays the diameter of the visible dot. (An SVG
 * stroke straddles its outline, which is why a hand-drawn ring eats
 * into the dot.) `true` is 2px.
 */
export interface ChartMarkSpec extends PlotMarkSpec {
  ring?: boolean | number
}

/** A mark spec with the ring's colour resolved from the theme. */
type MarkPaint = ChartMarkSpec & { ringColor?: string }

/** The identifying attributes a series' elements carry (and an entrance, when marks animate). */
type SeriesTag = Pick<DrawOptions, 'className' | 'attributes' | 'animate'>

/**
 * The colour a series paints with — its style's stroke, else its fill,
 * else ink. What a tooltip swatch or an active dot shows.
 */
export function seriesColor(record: Pick<SeriesRecord, 'style'>): string {
  return colorOf(record.style, INK)
}

/**
 * What a style itself says, with no defaults underneath — so "no
 * stroke given" can be told from the default black one.
 */
function ownStyle(style: StyleSpec | undefined): Partial<RenderStyle> {
  return Object.assign({}, ...styleList(style))
}

/** The colour a series style paints with: its stroke, else its fill. */
function colorOf(style: StyleSpec | undefined, fallback = INK): string {
  const pick = (c: string | undefined): string | undefined =>
    c !== undefined && c !== 'none' ? c : undefined
  const own = ownStyle(style)
  return pick(own.stroke) ?? pick(own.fill) ?? fallback
}

/**
 * Paint scatter markers at picture-space points. Mirrors the plot-mark
 * convention: open marks stroke the series color, `*Filled` marks fill
 * it. The color is the series style's stroke — falling back to its
 * fill (a filled series styled `stroke: 'none'` still colors its
 * marks), then to black.
 *
 * With `tag`, every mark carries the series' class and attributes plus
 * its own `data-index`. `styleAt` gives a point its own paint.
 *
 * Package-internal (shared with the legend's sample swatches) — not
 * re-exported from ext/dataviz.
 */
export function drawMarks<S extends ShapeSet>(
  pic: ItemContainer<S>,
  pts: readonly Point[],
  spec: MarkPaint,
  style: StyleSpec | undefined,
  tag?: SeriesTag,
  defaultSize = LINE_MARK_SIZE,
  styleAt?: (index: number) => StyleSpec | undefined
): void {
  const d = plotMarkPath(spec.name, spec.size ?? defaultSize)
  if (!d) return
  const filled = plotMarkFilled(spec.name)
  // The ring is a stroke twice its width painted UNDER the fill
  // (paint-order), so only its outer half shows: the dot keeps its size.
  const ring = filled && spec.ring ? (spec.ring === true ? 2 : spec.ring) : 0
  const paintFor = (s: StyleSpec | undefined): Partial<RenderStyle> => {
    const color = colorOf(s, '#000000')
    if (!filled) return { stroke: color, fill: 'none', strokeWidth: 1.5 }
    return ring > 0
      ? { fill: color, stroke: spec.ringColor ?? '#ffffff', strokeWidth: ring * 2 }
      : { fill: color, stroke: 'none' }
  }
  const paint = paintFor(style)
  const every = Math.max(1, spec.every ?? 1)
  // The glyph is the same at every point — parse once, translate per
  // point (Path.translate returns a new Path).
  const glyph = pathFromSVG(d)
  pts.forEach((p, i) => {
    if (i % every !== 0) return
    const own = styleAt?.(i)
    const ringAttr = ring > 0 ? { 'paint-order': 'stroke' } : undefined
    pic.filldraw(glyph.translate(p.x, p.y), {
      style: own ? paintFor(own) : paint,
      ...(tag
        ? {
            className: tag.className,
            attributes: { ...tag.attributes, 'data-index': i, ...ringAttr },
            animate: tag.animate,
          }
        : ringAttr && { attributes: ringAttr }),
    })
  })
}

/** How a registered series was drawn. */
export type SeriesKind = 'line' | 'scatter' | 'bar' | 'area' | 'candlestick'

/**
 * What the frame remembers about a series it drew — the model the
 * interaction layer reads.
 */
export interface SeriesRecord {
  /** Unique within the frame; `series-<n>` unless the builder was given one. */
  readonly id: string
  readonly kind: SeriesKind
  /** Legend label, when the builder was given one. */
  readonly label?: string
  /** The effective paint: the style sheet's slot, with the builder's `style` layered over it. */
  readonly style?: StyleSpec
  /** The effective mark: the builder's `marks`, else the sheet's, else the kind's default. */
  readonly mark?: PlotMark
  /** The stack this series belongs to, for stacked bars and areas. */
  readonly stack?: string
  /** The drawable samples (gaps removed), in data units, input order. */
  readonly data: DataSeries
  /**
   * The same samples in picture coordinates — where the series shows
   * them: a grouped bar's own column, a stacked segment's top.
   */
  readonly points: readonly Point[]
  /**
   * CSS class every element of the series carries:
   * `jikz-series jikz-series-<id>`. Elements also carry
   * `data-series="<id>"`, and per-point elements (marks, bars)
   * `data-index`.
   */
  readonly className: string
}

/** Identity options every series builder accepts. */
export interface FrameSeriesOptions {
  /**
   * Series id — the handle {@link ChartFrame.seriesById},
   * {@link ChartFrame.hitTest} and the CSS classes use. Must be unique
   * within the frame. Default: `series-<n>`.
   */
  id?: string
  /** Legend label; recorded on the {@link SeriesRecord}. */
  label?: string
  /**
   * Enter animation — the series draws itself in (`'draw'`, lines and
   * areas), grows from its baseline (`'grow'`, bars) or fades in;
   * with timing as {@link EnterOptions}. SMIL, so it plays in static
   * `toSVG()` output too. A kind the series cannot do falls back to
   * a fade.
   */
  enter?: EnterKind | EnterOptions
}

/**
 * Render options a series builder passes through — paint, class, id,
 * attributes, animation. Path labels are excluded: on a series,
 * `label` is the legend label ({@link FrameSeriesOptions}).
 */
export type SeriesDrawOptions = Omit<DrawOptions, 'label' | 'labels'>

/** Paint per point — a spec for all, or a function of the sample (recharts' `Cell`). */
export type PointStyle =
  | StyleSpec
  | ((sample: readonly [number, number], index: number) => StyleSpec)

/**
 * Where a series' name goes when it labels itself in the data — TikZ
 * `label in data`: at its first or last sample, its highest or lowest,
 * or at given sample indices.
 */
export type LabelInData = 'start' | 'end' | 'max' | 'min' | number | readonly number[]

/** Text per sample: `true` for the formatted y value, or a function of the sample. */
export type ValueLabels = boolean | ((sample: readonly [number, number], index: number) => string)

/** Direct-label options shared by the series builders. */
export interface FrameLabelOptions {
  /** Put the series name next to the data (see {@link LabelInData}). */
  labelInData?: LabelInData
  /** Print each sample's value beside it (bars: above the bar). */
  valueLabels?: ValueLabels
  /** Direct-label text (default: 11px primary ink, values 10px secondary). */
  labelStyle?: TextStyle
}

/** Options for {@link ChartFrame.line}. */
export interface FrameLineOptions extends SeriesDrawOptions, FrameSeriesOptions, FrameLabelOptions {
  /** How samples join (default `'linear'`). See {@link Interpolation}. */
  interpolation?: Interpolation
  /** Alias for `interpolation: 'smooth'`. */
  smooth?: boolean
  /** Close the path back to its first sample — TikZ `smooth cycle` / `polygon`. */
  closed?: boolean
  /** Scatter markers at each (or every Nth) data point. */
  marks?: PlotMark | ChartMarkSpec
  /**
   * A non-finite sample (NaN, ±Infinity, a missing field) breaks the
   * line — TikZ's `outlier`, recharts' `connectNulls={false}`. Set
   * true to join the neighbours across the gap instead.
   */
  connectGaps?: boolean
  /**
   * Paint for the part of the series **above** {@link baseline},
   * layered over its own — Chart.js's fill target, an eval ribbon's
   * white half. It changes only what it names: a `fill` recolours
   * the area, a `stroke` the line and its marks. The split is exact
   * at the baseline whatever the interpolation: each half is the
   * whole series, clipped.
   */
  above?: StyleSpec
  /** Paint for the part **below** {@link baseline}. */
  below?: StyleSpec
  /** Where {@link above} and {@link below} divide, in data units (default 0). */
  baseline?: number
}

/** Options for {@link ChartFrame.area}. */
export interface FrameAreaOptions extends Omit<FrameLineOptions, 'closed'> {
  /**
   * Where the fill starts, in data units (default 0, clamped into the
   * y domain) — and where `above`/`below` divide.
   */
  baseline?: number
  /**
   * Stack name: the area sits on top of the previous series in the
   * same stack, and its samples are read as increments.
   */
  stack?: string
}

/** Options for {@link ChartFrame.scatter}. */
export interface FrameScatterOptions
  extends Omit<SeriesDrawOptions, 'style'>,
    FrameSeriesOptions,
    FrameLabelOptions {
  /** Marker (default: the style sheet's, else `circleFilled`). */
  marks?: PlotMark | ChartMarkSpec
  /** Paint: one spec, or a function of the sample for per-point colour. */
  style?: PointStyle
}

/** Options for {@link ChartFrame.bars}. */
export interface FrameBarOptions extends FrameSeriesOptions, FrameLabelOptions {
  /**
   * Bar width in picture units. Default: the band width on a band
   * axis, else 60% of the smallest gap between consecutive x values.
   */
  width?: number
  /**
   * Baseline in data units (default 0), clamped into the y domain.
   * Note the clamp covers the BASELINE only: a bar value outside the
   * y domain still draws outside the plot area (data is never
   * clipped silently). Ignored for stacked bars, which start at 0.
   */
  baseline?: number
  /**
   * Side-by-side grouping: this series takes column `index` of
   * `count` inside each bar slot. `chart()` assigns these for bar
   * series that are not stacked.
   */
  group?: { index: number; count: number }
  /**
   * Stack name: bars sit on top of the previous series in the same
   * stack (positive values up, negative down) with a canvas gap
   * between segments.
   */
  stack?: string
  /** Gap between grouped bars, px (default 2). */
  gap?: number
  /** Bar paint: one spec, or a function of the sample for per-bar colour. */
  style?: PointStyle
}

/** One candle: `[x, open, high, low, close]`. */
export type Candle = readonly [DataValue, number, number, number, number]

/** Options for {@link ChartFrame.candlestick}. */
export interface FrameCandlestickOptions extends FrameSeriesOptions {
  /** Body width, px (default: as {@link FrameBarOptions.width}). */
  width?: number
  /** Paint for a rising candle (close ≥ open; default hollow green). */
  up?: StyleSpec
  /** Paint for a falling candle (default solid red). */
  down?: StyleSpec
}

/** One error bar: `[x, y, error]` (symmetric) or `[x, y, low, high]` (absolute). */
export type ErrorSample =
  | readonly [DataValue, number, number]
  | readonly [DataValue, number, number, number]

/** Options for {@link ChartFrame.errorBars}. */
export interface FrameErrorBarOptions {
  /** Cap width, px (default 6); 0 for none. */
  capWidth?: number
  /** Paint (default: 1px slate). */
  style?: StyleSpec
  /** Tag the bars as part of this series (its class and `data-series`). */
  seriesId?: string
}

/** Options for {@link ChartFrame.fn}. */
export interface FrameFnOptions extends FrameLineOptions {
  /** Sample count across the domain (default 100). */
  samples?: number
  /** X range to sample (default: the x domain). */
  domain?: readonly [number, number]
}

/** Options for {@link ChartFrame.referenceLine}. */
export interface ReferenceLineOptions {
  /** A vertical line at this x … */
  x?: DataValue
  /** … or a horizontal line at this y. */
  y?: number
  /** Text at the line's end (right for horizontal, top for vertical). */
  label?: string
  /** Paint (default: dashed 1px slate). */
  style?: StyleSpec
  labelStyle?: TextStyle
}

/** Options for {@link ChartFrame.referenceArea}. */
export interface ReferenceAreaOptions {
  /** Bounds in data units; a missing bound is the domain's edge. */
  x1?: DataValue
  x2?: DataValue
  y1?: number
  y2?: number
  /** Paint (default: translucent slate, no stroke). */
  style?: StyleSpec
  /** Text centred in the area. */
  label?: string
  labelStyle?: TextStyle
}

/** Options for {@link ChartFrame.referenceDot}. */
export interface ReferenceDotOptions {
  /** Marker (default `circleFilled`, 8px). */
  mark?: PlotMark
  size?: number
  /** A canvas-coloured ring round the dot, outside its size (`true` is 2px). */
  ring?: boolean | number
  /** Paint (default: slate). */
  style?: StyleSpec
  /** Text beside the dot. */
  label?: string
  /** Which side the label goes (default `'north'`). */
  labelAt?: 'north' | 'south' | 'east' | 'west'
  labelStyle?: TextStyle
}

/** How {@link ChartFrame.hitTest} picks samples. */
export interface HitTestOptions {
  /**
   * `'x'` (default): the sample nearest in x, per series — the
   * tooltip convention for line and bar charts. `'y'`: the same along
   * y, for horizontal layouts. `'nearest'`: the single sample nearest
   * in the plane, for scatter plots.
   */
  mode?: 'x' | 'y' | 'nearest'
  /**
   * Furthest the anchor sample may be from the probe, in picture
   * units (along the mode axis, or in the plane for `'nearest'`).
   * Default: unlimited.
   */
  maxDistance?: number
  /** Restrict to these series ids (hidden series stay out of tooltips). */
  ids?: readonly string[]
}

/** One sample a hit test returned. */
export interface HitSample {
  seriesId: string
  /** Index into the series' {@link SeriesRecord.data}. */
  index: number
  /** Data coordinates. */
  x: number
  y: number
  /** Picture coordinates. */
  at: Point
  /** Distance from the probe, in picture units, as the mode measures it. */
  distance: number
}

/** What {@link ChartFrame.hitTest} returns for a probe inside the plot area. */
export interface HitResult {
  /** Data coordinates of the anchor — the nearest sample overall. */
  x: number
  y: number
  /** The anchor in picture coordinates (where a crosshair snaps). */
  at: Point
  /** One sample per series in mode `'x'`/`'y'`; exactly one in `'nearest'`. */
  samples: HitSample[]
}

/** What {@link axes} hands a {@link ChartFrame}. */
export interface ChartFrameInit {
  /** Plot area [minX, minY, maxX, maxY] in picture coords (minY = top). */
  plotArea: [number, number, number, number]
  xScale: Scale
  yScale: Scale
  /** Tick values actually drawn, in data units. */
  xTicks: readonly number[]
  yTicks: readonly number[]
  /** Minor tick values drawn, in data units (default none). */
  xMinorTicks?: readonly number[]
  yMinorTicks?: readonly number[]
  /** Resolved style sheet, or null for none. Default: `varyHue`. */
  styleSheet?: StyleSheet | null
  /**
   * How far the axis decorations (ticks, tick labels, axis labels)
   * extend beyond the plot area on each side, px. Default 0.
   */
  margins?: { left: number; top: number; right: number; bottom: number }
  /**
   * Where text goes when the frame's own container is clipped —
   * direct labels and reference labels must escape the plot area.
   * Default: the frame's container.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  labelContainer?: ItemContainer<any>
  /** Class of the empty group `axes()` leaves for the interaction overlay. */
  overlayClass?: string
  /** Whether the frame's container is clipped to the plot area (`clip: true`). */
  clipped?: boolean
  /** The resolved theme (default: light). */
  theme?: ChartTheme
}

/** A style spec as a list of entries. */
function entries(style: StyleSpec | undefined): (Partial<RenderStyle> | string)[] {
  return style === undefined ? [] : Array.isArray(style) ? [...style] : [style as Partial<RenderStyle> | string]
}

/**
 * A series' paint with one half's layered over it. The half changes
 * only what it names: `above: { fill: green }` recolours the fill and
 * leaves the line the series' own; add `stroke` to recolour that too.
 */
function halfPaint(base: StyleSpec | undefined, half: StyleSpec | undefined): StyleSpec {
  return [...entries(base), ...entries(half)]
}

/** Far enough that a half-plane clip never cuts an unclipped series short. */
const FAR = 1e5

function joinClass(a: string, b: string | undefined): string {
  return b ? `${a} ${b}` : a
}

/** Nearest index in `order` (indices sorted by `key`) to `target`. */
function nearestSorted(
  order: readonly number[],
  key: (i: number) => number,
  target: number
): number {
  let lo = 0
  let hi = order.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (key(order[mid]!) < target) lo = mid + 1
    else hi = mid
  }
  const here = order[lo]!
  if (lo === 0) return here
  const before = order[lo - 1]!
  return Math.abs(key(before) - target) <= Math.abs(key(here) - target) ? before : here
}

/**
 * Sample indices a {@link LabelInData} names, among those `visible`
 * allows — so on a clipped, zoomed frame `'end'` is the last sample
 * on the plot, not one far off it.
 */
function labelIndices(data: DataSeries, at: LabelInData, visible: (i: number) => boolean): number[] {
  const inRange = (i: number): boolean => i >= 0 && i < data.length && visible(i)
  if (typeof at === 'number') return inRange(at) ? [at] : []
  if (typeof at !== 'string') return at.filter(inRange)
  const candidates = data.map((_, i) => i).filter(visible)
  if (candidates.length === 0) return []
  if (at === 'start') return [candidates[0]!]
  if (at === 'end') return [candidates[candidates.length - 1]!]
  let best = candidates[0]!
  for (const i of candidates) {
    if (at === 'max' ? data[i]![1] > data[best]![1] : data[i]![1] < data[best]![1]) best = i
  }
  return [best]
}

/** Where a label goes relative to its sample, by what it marks. */
function labelSide(at: LabelInData): 'north' | 'south' | 'east' | 'west' {
  if (at === 'end') return 'east'
  if (at === 'start') return 'west'
  if (at === 'min') return 'south'
  return 'north'
}

/** Direct series labels: primary text. Value labels: secondary. */
const DIRECT_LABEL_SIZE = 11
const VALUE_LABEL_SIZE = 10

type Run = { data: (readonly [number, number])[]; points: Point[] }

/**
 * A framed chart: two scales (data ↔ picture coords), the plot area,
 * the resolved ticks, the series drawn so far, and series builders
 * that draw through it. What {@link axes} and `chart()` return.
 */
export class ChartFrame {
  /** Plot area [minX, minY, maxX, maxY] in picture coords (minY = top). */
  readonly plotArea: [number, number, number, number]
  readonly xScale: Scale
  readonly yScale: Scale
  /** Tick values actually drawn, in data units. */
  readonly xTicks: readonly number[]
  readonly yTicks: readonly number[]
  /** Minor tick values drawn, in data units. */
  readonly xMinorTicks: readonly number[]
  readonly yMinorTicks: readonly number[]
  /** The (possibly nice-widened) data ranges the scales cover. */
  readonly xDomain: readonly [number, number]
  readonly yDomain: readonly [number, number]
  /**
   * The plot area plus its axis decorations — [minX, minY, maxX, maxY]
   * — what an outside legend clears.
   */
  readonly outerArea: [number, number, number, number]
  /** The style sheet unstyled series draw from, or null. */
  readonly styleSheet: StyleSheet | null
  /**
   * CSS class of the empty `<g>` `axes()` adds for the interaction
   * overlay: where `attachChart` paints crosshairs and active dots,
   * outside any clip. Empty when the frame was built without one.
   */
  readonly overlayClass: string

  /**
   * The theme the frame was built with — what its builders, the
   * legend and the interactive layer take their inks from.
   */
  readonly theme: ChartTheme
  /**
   * Whether what the frame draws is clipped to the plot area. A
   * clipped frame also drops what the clip cannot reach — labels are
   * drawn outside it — and keeps hits on the plot: a label, reference
   * label or hit whose anchor lies off the plot area is skipped.
   */
  readonly clipped: boolean

  /** Text that must not be clipped goes here. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly labels: ItemContainer<any>
  private readonly registry: SeriesRecord[] = []
  private warnedWrap = false
  /**
   * Per series id: the sample indices a hit may land on — all of
   * them, or on a clipped frame those on the plot area — sorted by
   * picture x, and by picture y.
   */
  private readonly orders = new Map<string, { byX: number[]; byY: number[] }>()
  /** Per stack name, per x: the running positive and negative totals. */
  private readonly stacks = new Map<string, Map<number, { pos: number; neg: number }>>()

  constructor(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private readonly pic: ItemContainer<any>,
    init: ChartFrameInit
  ) {
    this.plotArea = init.plotArea
    this.xScale = init.xScale
    this.yScale = init.yScale
    this.labels = init.labelContainer ?? pic
    this.overlayClass = init.overlayClass ?? ''
    this.clipped = init.clipped ?? false
    this.theme = init.theme ?? lightTheme
    this.xTicks = init.xTicks
    this.yTicks = init.yTicks
    this.xMinorTicks = init.xMinorTicks ?? []
    this.yMinorTicks = init.yMinorTicks ?? []
    this.xDomain = init.xScale.domain
    this.yDomain = init.yScale.domain
    const m = init.margins ?? { left: 0, top: 0, right: 0, bottom: 0 }
    const [x0, y0, x1, y1] = init.plotArea
    this.outerArea = [x0 - m.left, y0 - m.top, x1 + m.right, y1 + m.bottom]
    this.styleSheet =
      init.styleSheet === undefined
        ? resolveStyleSheet((init.theme ?? lightTheme).styleSheet)
        : init.styleSheet
  }

  /** Map an x data value to a picture x coordinate. */
  x(v: DataValue): number {
    return this.xScale.map(toNumber(v, this.xScale.categories))
  }

  /** Map a y data value to a picture y coordinate. */
  y(v: DataValue): number {
    return this.yScale.map(toNumber(v, this.yScale.categories))
  }

  /** Map a data point to a picture point. */
  point(xv: DataValue, yv: DataValue): Point {
    return point(this.x(xv), this.y(yv))
  }

  /** Picture x coordinate → data x. */
  invertX(px: number): number {
    return this.xScale.invert(px)
  }

  /** Picture y coordinate → data y. */
  invertY(py: number): number {
    return this.yScale.invert(py)
  }

  /** Whether a picture point lies inside the plot area. */
  contains(p: PointLike): boolean {
    const [x0, y0, x1, y1] = this.plotArea
    return p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1
  }

  /**
   * Whether an anchor is drawable on this frame: anywhere when it is
   * not clipped, on the plot area (half a pixel of slack for edge
   * samples) when it is.
   */
  private onPlot(p: PointLike): boolean {
    if (!this.clipped) return true
    const [x0, y0, x1, y1] = this.plotArea
    return p.x >= x0 - 0.5 && p.x <= x1 + 0.5 && p.y >= y0 - 0.5 && p.y <= y1 + 0.5
  }

  /** The category lists string samples resolve through. */
  get categories(): Categories {
    return { x: this.xScale.categories, y: this.yScale.categories }
  }

  /** The series drawn through this frame, in paint order. */
  get series(): readonly SeriesRecord[] {
    return this.registry
  }

  /** A drawn series by id. */
  seriesById(id: string): SeriesRecord | undefined {
    return this.registry.find((s) => s.id === id)
  }

  /** Normalize builder input through this frame's categories. */
  private samples<T>(data: DataInput<T>): DataSeries {
    return toSeries(data, this.categories)
  }

  /**
   * Record a series and mint the tag its elements carry. Every builder
   * goes through here, so ids, classes and samples cannot disagree.
   * `points` overrides the plain mapping when the series shows its
   * samples elsewhere (grouped columns, stacked tops).
   */
  private register(
    kind: SeriesKind,
    raw: DataSeries,
    options: FrameSeriesOptions & { style?: StyleSpec; mark?: PlotMark; stack?: string },
    points?: readonly Point[]
  ): { record: SeriesRecord; tag: SeriesTag } {
    const index = this.registry.length
    const id = options.id ?? `series-${index}`
    if (this.orders.has(id)) {
      throw new JikzError('invalid-argument', `ChartFrame: duplicate series id "${id}".`)
    }
    const data = raw.filter(isFiniteSample)
    const pts = points ?? data.map(([xv, yv]) => this.point(xv, yv))
    const safe = id.replace(/[^A-Za-z0-9_-]/g, '-')
    const className = `jikz-series jikz-series-${safe}`

    // The style sheet fills in what the builder was not given: paint
    // by kind from the slot's colour, and the slot's mark.
    const slot = this.styleSheet ? slotOf(this.styleSheet, index) : undefined
    if (slot?.wrapped && !this.warnedWrap) {
      this.warnedWrap = true
      warnWrapped(index, this.styleSheet!.colors!.length)
    }
    // The slot is the BASE paint; the builder's style layers over it,
    // so `style: { dash: 'dashed' }` keeps the slot's colour and
    // `style: { stroke: 'red' }` replaces it — TikZ's order too, where
    // the sheet sets the visualizer style before the user's options.
    let base: Partial<RenderStyle> | undefined
    if (kind === 'line') {
      base = {
        stroke: slot?.color ?? this.theme.ink,
        strokeWidth: slot?.width ?? SERIES_LINE_WIDTH,
        ...(slot?.dash && slot.dash !== 'solid' && { dash: slot.dash }),
      }
    } else if (kind === 'area') {
      const color = slot?.color ?? this.theme.ink
      base = {
        stroke: color,
        strokeWidth: slot?.width ?? SERIES_LINE_WIDTH,
        fill: color,
        fillOpacity: AREA_FILL_OPACITY,
        ...(slot?.dash && slot.dash !== 'solid' && { dash: slot.dash }),
      }
    } else if (kind === 'bar') {
      base = { fill: slot?.color ?? this.theme.bar, stroke: 'none' }
    } else if (kind === 'scatter' && slot?.color) {
      base = { stroke: slot.color }
    }
    const style: StyleSpec | undefined =
      options.style === undefined
        ? base
        : base === undefined
          ? options.style
          : [base, ...(Array.isArray(options.style) ? options.style : [options.style])]
    const mark = options.mark ?? slot?.mark ?? (kind === 'scatter' ? 'circleFilled' : undefined)

    const record: SeriesRecord = {
      id,
      kind,
      label: options.label,
      style,
      mark,
      stack: options.stack,
      data,
      points: pts,
      className,
    }
    // Sorted in PICTURE space, which is what hitTest searches — the y
    // range is flipped, so data order and picture order differ there.
    const indices = data.map((_, i) => i).filter((i) => this.onPlot(pts[i]!))
    this.orders.set(id, {
      byX: [...indices].sort((a, b) => pts[a]!.x - pts[b]!.x),
      byY: [...indices].sort((a, b) => pts[a]!.y - pts[b]!.y),
    })
    this.registry.push(record)
    return { record, tag: { className, attributes: { 'data-series': id } } }
  }

  /** Merge the series tag over a caller's own class and attributes. */
  private tagged(tag: SeriesTag, draw: SeriesDrawOptions): DrawOptions {
    return {
      ...draw,
      className: joinClass(tag.className!, draw.className),
      attributes: { ...draw.attributes, ...tag.attributes },
    }
  }

  /**
   * Paint a series once, or — when it has `above`/`below` paints —
   * once per side of the baseline, each pass clipped to its
   * half-plane. No zero crossings are computed: both passes draw the
   * whole series, so the split is exact for any interpolation.
   */
  private halves(
    baseline: number,
    above: StyleSpec | undefined,
    below: StyleSpec | undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    paint: (target: ItemContainer<any>, half: StyleSpec | undefined, split: boolean) => void
  ): void {
    if (above === undefined && below === undefined) {
      paint(this.pic, undefined, false)
      return
    }
    const [x0, y0, x1, y1] = this.plotArea
    const yb = this.y(baseline)
    const left = x0 - FAR
    const width = x1 - x0 + 2 * FAR
    // "Above" in data is towards the top of the plot area.
    const upper = rect(left, y0 - FAR, width, Math.max(0, yb - (y0 - FAR)))
    const lower = rect(left, yb, width, Math.max(0, y1 + FAR - yb))
    const dataUp = this.y(baseline + 1) <= yb || !Number.isFinite(this.y(baseline + 1))
    this.pic.scope({ clip: dataUp ? upper : lower, className: 'jikz-above' }, (s) => paint(s, above, true))
    this.pic.scope({ clip: dataUp ? lower : upper, className: 'jikz-below' }, (s) => paint(s, below, true))
  }

  /** Draw options with an enter animation added to the caller's own. */
  private animated(
    draw: DrawOptions,
    animation: import('../../render/Renderer').SVGAnimation | import('../../render/Renderer').SVGAnimation[] | undefined
  ): DrawOptions {
    if (!animation) return draw
    const own = draw.animate ? (Array.isArray(draw.animate) ? draw.animate : [draw.animate]) : []
    const added = Array.isArray(animation) ? animation : [animation]
    return { ...draw, animate: [...own, ...added] }
  }

  /**
   * Push a value onto a stack at x: returns the segment it occupies,
   * from the previous total to the new one (sign-aware).
   */
  private stackPush(name: string, x: number, y: number): { from: number; to: number } {
    let stack = this.stacks.get(name)
    if (!stack) {
      stack = new Map()
      this.stacks.set(name, stack)
    }
    const entry = stack.get(x) ?? { pos: 0, neg: 0 }
    stack.set(x, entry)
    if (y >= 0) {
      const from = entry.pos
      entry.pos += y
      return { from, to: entry.pos }
    }
    const from = entry.neg
    entry.neg += y
    return { from, to: entry.neg }
  }

  /** Runs of consecutive drawable samples, split at gaps. */
  private runs(raw: DataSeries, connectGaps: boolean): Run[] {
    const runs: Run[] = []
    let run: Run = { data: [], points: [] }
    for (const sample of raw) {
      if (isFiniteSample(sample)) {
        run.data.push(sample)
        run.points.push(this.point(sample[0], sample[1]))
      } else if (!connectGaps && run.points.length) {
        runs.push(run)
        run = { data: [], points: [] }
      }
    }
    if (run.points.length) runs.push(run)
    return runs
  }

  /** Series-name and value labels for a drawn series. */
  private directLabels(
    record: SeriesRecord,
    options: FrameLabelOptions,
    tag: SeriesTag,
    valueAt?: (index: number) => { at: Point; side: 'north' | 'south' }
  ): void {
    const { labelInData, valueLabels, labelStyle } = options
    if (labelInData !== undefined) {
      const side = labelSide(labelInData)
      const text = record.label ?? record.id
      const visible = (i: number): boolean => this.onPlot(record.points[i]!)
      for (const i of labelIndices(record.data, labelInData, visible)) {
        this.labels.text(record.points[i]!, text, {
          at: side,
          distance: 6,
          style: { fill: this.theme.labelText, fontSize: DIRECT_LABEL_SIZE, ...labelStyle },
          className: joinClass('jikz-series-label', tag.className),
          attributes: tag.attributes,
        })
      }
    }
    if (valueLabels) {
      const format =
        typeof valueLabels === 'function'
          ? valueLabels
          : (s: readonly [number, number]) => formatTick(s[1])
      record.data.forEach((sample, i) => {
        const where = valueAt?.(i) ?? { at: record.points[i]!, side: 'north' as const }
        if (!this.onPlot(where.at)) return
        this.labels.text(where.at, format(sample, i), {
          at: where.side,
          distance: 4,
          style: { fill: this.theme.tickText, fontSize: VALUE_LABEL_SIZE, ...labelStyle },
          className: joinClass('jikz-value-label', tag.className),
          attributes: { ...tag.attributes, 'data-index': i },
        })
      })
    }
  }

  /**
   * Draw a polyline (or smooth curve) through data points. A gap in
   * the data (a non-finite sample) breaks the line unless
   * `connectGaps` is set.
   *
   * ```ts
   * frame.line(series, { style: { stroke: '#2563eb' }, marks: 'o' })
   * frame.line(series, { interpolation: 'stepAfter' })
   * ```
   */
  line<T>(data: DataInput<T>, options: FrameLineOptions = {}): this {
    const {
      smooth = false,
      interpolation = smooth ? 'smooth' : 'linear',
      closed = false,
      marks,
      connectGaps = false,
      above,
      below,
      baseline = 0,
      id,
      label,
      enter,
      labelInData,
      valueLabels,
      labelStyle,
      ...rest
    } = options
    const raw = this.samples(data)
    const markSpec = normalizeMarkSpec(marks)
    const { record, tag } = this.register('line', raw, {
      id,
      label,
      style: rest.style,
      mark: markSpec?.name,
    })
    const draw: SeriesDrawOptions = { ...rest, style: record.style }

    // A run of one point has no path to draw, but marks still paint —
    // a one-point series is a scatter of one.
    const d = this.runs(raw, connectGaps)
      .map((run) => interpolatePath(run.points, interpolation, closed))
      .filter(Boolean)
      .join(' ')
    if (d) {
      this.halves(baseline, above, below, (target, half, split) => {
        const style = split ? halfPaint(record.style, half) : record.style
        const { options: lineDraw, animation } = this.strokeEnter(this.tagged(tag, { ...draw, style }), enter)
        target.draw(pathFromSVG(d), this.animated(lineDraw, animation))
      })
    }

    if (record.mark) {
      const spec = { ...markSpec, name: record.mark, ringColor: this.theme.surface }
      const e = normalizeEnter(enter)
      drawMarks(
        this.pic,
        record.points,
        spec,
        record.style,
        this.animated(this.tagged(tag, draw), e && fadeIn(e)),
        LINE_MARK_SIZE,
        this.markHalves(record, baseline, above, below)
      )
    }
    this.directLabels(record, { labelInData, valueLabels, labelStyle }, tag)
    return this
  }

  /** Per-mark paint for a sign-split series: each mark takes its side's. */
  private markHalves(
    record: SeriesRecord,
    baseline: number,
    above: StyleSpec | undefined,
    below: StyleSpec | undefined
  ): ((index: number) => StyleSpec | undefined) | undefined {
    if (above === undefined && below === undefined) return undefined
    return (i) => halfPaint(record.style, record.data[i]![1] >= baseline ? above : below)
  }

  /**
   * A stroke's enter animation: `draw` makes the path draw itself in
   * (`pathLength="1"` + a unit dash, offset 1 → 0) unless the stroke
   * is dashed, in which case — and for `grow` — it fades.
   */
  private strokeEnter(
    options: DrawOptions,
    enter: EnterKind | EnterOptions | undefined
  ): { options: DrawOptions; animation: import('../../render/Renderer').SVGAnimation | undefined } {
    const e = normalizeEnter(enter)
    if (!e) return { options, animation: undefined }
    const resolved = options.style ? resolveStyle(options.style) : undefined
    const dashed = !!resolved?.strokeDasharray || (!!resolved?.dash && resolved.dash !== 'solid')
    if (e.enter === 'draw' && !dashed) {
      const own = options.style ? (Array.isArray(options.style) ? options.style : [options.style]) : []
      return {
        options: {
          ...options,
          style: [...own, { strokeDasharray: '1', strokeDashoffset: 0 }],
          attributes: { ...options.attributes, pathLength: 1 },
        },
        animation: drawIn(e),
      }
    }
    return { options, animation: fadeIn(e) }
  }

  /**
   * Draw a filled area between the data and a baseline — or, with
   * `stack`, on top of the previous series in that stack. The top
   * edge is a line with the same interpolation choices.
   *
   * ```ts
   * frame.area(visits, { stack: 'traffic', label: 'organic' })
   * frame.area(visits, { stack: 'traffic', label: 'paid' })
   * ```
   */
  area<T>(data: DataInput<T>, options: FrameAreaOptions = {}): this {
    const {
      smooth = false,
      interpolation = smooth ? 'smooth' : 'linear',
      marks,
      connectGaps = false,
      baseline = 0,
      stack,
      above,
      below,
      id,
      label,
      enter,
      labelInData,
      valueLabels,
      labelStyle,
      ...rest
    } = options
    const raw = this.samples(data)
    const [yMin, yMax] = this.yDomain
    const base = Math.min(yMax, Math.max(yMin, Number.isFinite(baseline) ? baseline : 0))
    // A stacked area has no sign to split on: its samples are increments.
    const splitAbove = stack === undefined ? above : undefined
    const splitBelow = stack === undefined ? below : undefined

    // Resolve the vertical extent of every sample first: a stacked
    // area's samples are increments on the running total.
    const tops: (readonly [number, number])[] = []
    const bottoms: number[] = []
    for (const sample of raw) {
      if (!isFiniteSample(sample)) {
        tops.push(sample)
        bottoms.push(NaN)
        continue
      }
      if (stack !== undefined) {
        const seg = this.stackPush(stack, sample[0], sample[1])
        tops.push([sample[0], seg.to])
        bottoms.push(seg.from)
      } else {
        tops.push(sample)
        bottoms.push(base)
      }
    }
    const markSpec = normalizeMarkSpec(marks)
    const finite = tops.filter(isFiniteSample)
    const { record, tag } = this.register(
      'area',
      raw,
      { id, label, style: rest.style, mark: markSpec?.name, stack },
      finite.map(([xv, yv]) => this.point(xv, yv))
    )
    const draw: SeriesDrawOptions = { ...rest, style: record.style }

    // One closed subpath per run for the fill: the top edge forward,
    // the bottom edge back (its path re-based from M to L), then Z.
    // The stroke is the top edge alone — an area is a line with a
    // fill under it, not an outlined polygon.
    const fills: string[] = []
    const edges: string[] = []
    let run: { top: Point[]; bottom: Point[] } = { top: [], bottom: [] }
    const flush = (): void => {
      if (run.top.length >= 2) {
        const top = interpolatePath(run.top, interpolation)
        const bottom = interpolatePath([...run.bottom].reverse(), interpolation).replace(/^M/, 'L')
        fills.push(`${top} ${bottom} Z`)
        edges.push(top)
      }
      run = { top: [], bottom: [] }
    }
    tops.forEach((sample, i) => {
      if (isFiniteSample(sample)) {
        run.top.push(this.point(sample[0], sample[1]))
        run.bottom.push(this.point(sample[0], bottoms[i]!))
      } else if (!connectGaps) {
        flush()
      }
    })
    flush()
    if (fills.length) {
      const e = normalizeEnter(enter)
      this.halves(base, splitAbove, splitBelow, (target, half, split) => {
        const fillStyle = split ? halfPaint(record.style, half) : record.style
        const edgeStyle = fillStyle
        // The fill fades to its own opacity while the edge draws in.
        const fillOpacity = fillStyle ? (resolveStyle(fillStyle).fillOpacity ?? 1) : 1
        const fillAnim = e && (e.enter === 'draw' ? enterKeyframeOpacity(fillOpacity, e) : fadeIn(e))
        target.fill(
          pathFromSVG(fills.join(' ')),
          this.animated(this.tagged(tag, { ...draw, style: [...entries(fillStyle), { stroke: 'none' }] }), fillAnim)
        )
        const { options: edgeDraw, animation } = this.strokeEnter(
          this.tagged(tag, { ...draw, style: [...entries(edgeStyle), { fill: 'none' }] }),
          enter
        )
        target.draw(pathFromSVG(edges.join(' ')), this.animated(edgeDraw, animation))
      })
    }

    if (record.mark) {
      const spec = { ...markSpec, name: record.mark, ringColor: this.theme.surface }
      const e = normalizeEnter(enter)
      drawMarks(
        this.pic,
        record.points,
        spec,
        record.style,
        this.animated(this.tagged(tag, draw), e && fadeIn(e)),
        LINE_MARK_SIZE,
        this.markHalves(record, base, splitAbove, splitBelow)
      )
    }
    this.directLabels(record, { labelInData, valueLabels, labelStyle }, tag)
    return this
  }

  /**
   * Draw scatter markers at data points (no connecting line).
   *
   * ```ts
   * frame.scatter(samples, { marks: { name: 'cross', size: 6 }, style: { stroke: '#dc2626' } })
   * frame.scatter(samples, { style: ([, y]) => ({ stroke: y > 50 ? RED : BLUE }) })
   * ```
   */
  scatter<T>(data: DataInput<T>, options: FrameScatterOptions = {}): this {
    const { marks, id, label, enter, labelInData, valueLabels, labelStyle, style, ...rest } = options
    const markSpec = normalizeMarkSpec(marks)
    const raw = this.samples(data)
    const { record, tag } = this.register('scatter', raw, {
      id,
      label,
      style: typeof style === 'function' ? undefined : style,
      mark: markSpec?.name,
    })
    const draw: SeriesDrawOptions = { ...rest, style: record.style }
    const spec = { ...markSpec, name: record.mark!, ringColor: this.theme.surface }
    const styleAt =
      typeof style === 'function' ? (i: number) => style(record.data[i]!, i) : undefined
    const e = normalizeEnter(enter)
    drawMarks(
      this.pic,
      record.points,
      spec,
      record.style,
      this.animated(this.tagged(tag, draw), e && fadeIn(e)),
      SCATTER_MARK_SIZE,
      styleAt
    )
    this.directLabels(record, { labelInData, valueLabels, labelStyle }, tag)
    return this
  }

  /**
   * Draw vertical bars centered on each x value, from the baseline to
   * the y value — grouped side by side with `group`, or stacked with
   * `stack`.
   *
   * ```ts
   * frame.bars([['Q1', 42], ['Q2', 58]], { style: { fill: '#f59e0b', stroke: 'none' } })
   * frame.bars(a, { group: { index: 0, count: 2 } })
   * frame.bars(b, { stack: 'total' })
   * ```
   */
  bars<T>(data: DataInput<T>, options: FrameBarOptions = {}): this {
    const {
      width,
      baseline = 0,
      group,
      stack,
      gap = BAR_GAP,
      style,
      id,
      label,
      enter,
      labelInData,
      valueLabels,
      labelStyle,
    } = options
    const samples = this.samples(data).filter(isFiniteSample)
    const e = normalizeEnter(enter)
    const [yMin, yMax] = this.yDomain
    // A non-finite baseline falls back to 0 rather than NaN-ing every bar.
    const from = Number.isFinite(baseline) ? baseline : 0
    const base = Math.min(yMax, Math.max(yMin, from))

    const slotW = width ?? this.xScale.bandwidth ?? this.defaultBarWidth(samples)
    let w = slotW
    let offset = 0
    if (group && group.count > 1) {
      const count = Math.max(1, Math.floor(group.count))
      const index = Math.min(count - 1, Math.max(0, Math.floor(group.index)))
      w = Math.max(1, (slotW - gap * (count - 1)) / count)
      offset = -slotW / 2 + w * (index + 0.5) + gap * index
    }

    // Each bar's vertical extent in data units, plus where its value shows.
    const segments = samples.map(([xv, yv]) =>
      stack !== undefined ? this.stackPush(stack, xv, yv) : { from: base, to: yv }
    )
    const points = samples.map(([xv], i) => point(this.x(xv) + offset, this.y(segments[i]!.to)))
    const { record, tag } = this.register(
      'bar',
      samples,
      { id, label, style: typeof style === 'function' ? undefined : style, stack },
      points
    )
    const styleAt =
      typeof style === 'function'
        ? (i: number): StyleSpec => {
            const own = style(samples[i]!, i)
            return record.style
              ? [
                  ...(Array.isArray(record.style) ? record.style : [record.style]),
                  ...(Array.isArray(own) ? own : [own]),
                ]
              : own
          }
        : (): StyleSpec | undefined => record.style

    samples.forEach((_, i) => {
      const { from: f } = segments[i]!
      const p = points[i]!
      const y0 = this.y(f)
      const y1 = p.y
      let top = Math.min(y0, y1)
      let height = Math.abs(y1 - y0)
      // A stacked segment sitting on another leaves a canvas gap
      // toward it, so the stack reads as parts.
      if (stack !== undefined && f !== 0 && height > gap) {
        height -= gap
        top = y0 > y1 ? y1 : y0 + gap
      }
      const animation = e && (e.enter === 'grow' ? growIn(y0, top, height, e) : fadeIn(e))
      this.pic.filldraw(
        rect(p.x - w / 2, top, w, height),
        this.animated(
          { style: styleAt(i), className: tag.className, attributes: { ...tag.attributes, 'data-index': i } },
          animation
        )
      )
    })
    this.directLabels(record, { labelInData, valueLabels, labelStyle }, tag, (i) => ({
      at: points[i]!,
      side: samples[i]![1] < 0 ? 'south' : 'north',
    }))
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
        return Math.abs(this.xScale.map(minGap) - this.xScale.map(0)) * 0.6
      }
    }
    return ((this.plotArea[2] - this.plotArea[0]) * 0.6) / Math.max(1, data.length)
  }

  /**
   * Candlesticks — TikZ's `candle stick plot`: a wick from low to
   * high and a body from open to close, hollow when rising and solid
   * when falling. The series' samples are `[x, close]`.
   *
   * ```ts
   * frame.candlestick([[1, 10, 14, 9, 13], [2, 13, 15, 11, 12]])
   * ```
   */
  candlestick(data: readonly Candle[], options: FrameCandlestickOptions = {}): this {
    const { width, up, down, id, label, enter } = options
    const e = normalizeEnter(enter)
    const cats = this.xScale.categories
    const candles = data
      .map(([x, open, high, low, close]) => [toNumber(x, cats), open, high, low, close] as const)
      .filter((c) => c.every(Number.isFinite))
    const { candle, surface } = this.theme
    const upStyle: StyleSpec = up ?? { stroke: candle.up, strokeWidth: 1.5, fill: surface }
    const downStyle: StyleSpec = down ?? { stroke: candle.down, strokeWidth: 1.5, fill: candle.down }
    const closes = candles.map(([x, , , , close]) => [x, close] as const)
    const { record, tag } = this.register('candlestick', closes, { id, label, style: upStyle })
    const w = width ?? this.xScale.bandwidth ?? this.defaultBarWidth(closes)
    candles.forEach(([x, open, high, low, close], i) => {
      const cx = this.x(x)
      const style = close >= open ? upStyle : downStyle
      const attrs = { ...tag.attributes, 'data-index': i }
      const anim = e && fadeIn(e)
      this.pic.draw(
        line(point(cx, this.y(high)), point(cx, this.y(low))),
        this.animated({ style, className: tag.className, attributes: attrs }, anim)
      )
      const yo = this.y(open)
      const yc = this.y(close)
      this.pic.filldraw(
        rect(cx - w / 2, Math.min(yo, yc), w, Math.max(1, Math.abs(yc - yo))),
        this.animated({ style, className: tag.className, attributes: attrs }, anim)
      )
    })
    void record
    return this
  }

  /**
   * Error bars: a vertical range at each sample, capped. Not a series
   * of its own — pass `seriesId` to tag them as part of one.
   *
   * ```ts
   * frame.errorBars([[1, 4, 0.5], [2, 6, 0.8]])           // ± error
   * frame.errorBars([[1, 4, 3.2, 4.9]], { seriesId: 'a' }) // absolute low/high
   * ```
   */
  errorBars(data: readonly ErrorSample[], options: FrameErrorBarOptions = {}): this {
    const { capWidth = 6, style = { stroke: this.theme.reference, strokeWidth: 1 }, seriesId } = options
    const cats = this.xScale.categories
    const tag: SeriesTag = seriesId
      ? {
          className: joinClass('jikz-error-bar', this.seriesById(seriesId)?.className),
          attributes: { 'data-series': seriesId },
        }
      : { className: 'jikz-error-bar' }
    data.forEach((sample, i) => {
      const x = toNumber(sample[0], cats)
      const y = sample[1]
      const lo = sample.length === 3 ? y - sample[2] : sample[2]
      const hi = sample.length === 3 ? y + sample[2] : sample[3]
      if (![x, lo, hi].every(Number.isFinite)) return
      const cx = this.x(x)
      const yLo = this.y(lo)
      const yHi = this.y(hi)
      const draw = { style, className: tag.className, attributes: { ...tag.attributes, 'data-index': i } }
      this.pic.draw(line(point(cx, yHi), point(cx, yLo)), draw)
      if (capWidth > 0) {
        this.pic.draw(line(point(cx - capWidth / 2, yHi), point(cx + capWidth / 2, yHi)), draw)
        this.pic.draw(line(point(cx - capWidth / 2, yLo), point(cx + capWidth / 2, yLo)), draw)
      }
    })
    return this
  }

  /**
   * Plot a function of x — TikZ's `function` data format: sampled
   * across the x domain (or `domain`) and drawn as a line. A NaN
   * result is a gap.
   *
   * ```ts
   * frame.fn((x) => Math.sin(x), { samples: 200, label: 'sin' })
   * ```
   */
  fn(f: (x: number) => number, options: FrameFnOptions = {}): this {
    const { samples = 100, domain = this.xDomain, ...rest } = options
    const n = Math.max(2, Math.floor(samples))
    const [a, b] = domain
    const pairs: (readonly [number, number])[] = []
    for (let i = 0; i < n; i++) {
      const x = a + ((b - a) * i) / (n - 1)
      pairs.push([x, f(x)])
    }
    return this.line(pairs, rest)
  }

  /**
   * A reference line across the plot area at `x` or `y` — recharts'
   * `ReferenceLine`, the "goal line" idiom.
   *
   * ```ts
   * frame.referenceLine({ y: 1500, label: 'goal', style: { stroke: '#dc2626' } })
   * ```
   */
  referenceLine(options: ReferenceLineOptions): this {
    const { x, y, label, style, labelStyle } = options
    const [x0, y0, x1, y1] = this.plotArea
    const paint: StyleSpec = style ?? { stroke: this.theme.reference, strokeWidth: 1, dash: 'dashed' }
    const text: TextStyle = {
      fontSize: VALUE_LABEL_SIZE,
      fill: colorOf(paint, this.theme.reference),
      ...labelStyle,
    }
    if (y !== undefined) {
      const py = this.y(y)
      this.pic.draw(line(point(x0, py), point(x1, py)), { style: paint, className: 'jikz-reference' })
      if (label && this.onPlot(point(x1, py))) {
        this.labels.text(point(x1, py), label, {
          at: 'north west',
          distance: 3,
          style: text,
          className: 'jikz-reference-label',
        })
      }
    }
    if (x !== undefined) {
      const px = this.x(x)
      this.pic.draw(line(point(px, y1), point(px, y0)), { style: paint, className: 'jikz-reference' })
      if (label && this.onPlot(point(px, y0))) {
        this.labels.text(point(px, y0), label, {
          at: 'north east',
          distance: 3,
          style: text,
          className: 'jikz-reference-label',
        })
      }
    }
    return this
  }

  /**
   * A shaded band over part of the plot area — recharts'
   * `ReferenceArea`. Missing bounds run to the domain's edge.
   *
   * ```ts
   * frame.referenceArea({ y1: 40, y2: 60, label: 'target' })
   * frame.referenceArea({ x1: 'Q2', x2: 'Q3' })
   * ```
   */
  referenceArea(options: ReferenceAreaOptions): this {
    const { x1, x2, y1, y2, label, style, labelStyle } = options
    const [ax0, ay0, ax1, ay1] = this.plotArea
    const px0 = x1 === undefined ? ax0 : this.x(x1)
    const px1 = x2 === undefined ? ax1 : this.x(x2)
    const py0 = y1 === undefined ? ay1 : this.y(y1)
    const py1 = y2 === undefined ? ay0 : this.y(y2)
    const left = Math.min(px0, px1)
    const top = Math.min(py0, py1)
    const w = Math.abs(px1 - px0)
    const h = Math.abs(py1 - py0)
    this.pic.filldraw(rect(left, top, w, h), {
      style: style ?? { fill: this.theme.referenceArea, fillOpacity: 0.15, stroke: 'none' },
      className: 'jikz-reference',
    })
    if (label) {
      // On a clipped frame the label sits in the part of the area that
      // shows, and goes with it when none does.
      let [lx0, ly0, lx1, ly1] = [left, top, left + w, top + h]
      if (this.clipped) {
        lx0 = Math.max(lx0, ax0)
        ly0 = Math.max(ly0, ay0)
        lx1 = Math.min(lx1, ax1)
        ly1 = Math.min(ly1, ay1)
      }
      if (lx1 > lx0 && ly1 > ly0) {
        this.labels.text(point((lx0 + lx1) / 2, (ly0 + ly1) / 2), label, {
          style: { fill: this.theme.tickText, fontSize: VALUE_LABEL_SIZE, ...labelStyle },
          className: 'jikz-reference-label',
        })
      }
    }
    return this
  }

  /**
   * A single marked point — recharts' `ReferenceDot`.
   *
   * ```ts
   * frame.referenceDot(3, 42, { label: 'peak' })
   * ```
   */
  referenceDot(x: DataValue, y: DataValue, options: ReferenceDotOptions = {}): this {
    const {
      mark = 'circleFilled',
      size = SCATTER_MARK_SIZE,
      style,
      label,
      labelAt = 'north',
      labelStyle,
      ring,
    } = options
    const p = this.point(x, y)
    const paint: StyleSpec = style ?? { stroke: this.theme.reference, fill: this.theme.reference }
    drawMarks(this.pic, [p], { name: mark, size, ring, ringColor: this.theme.surface }, paint, {
      className: 'jikz-reference',
    })
    if (label && this.onPlot(p)) {
      this.labels.text(p, label, {
        at: labelAt,
        distance: size / 2 + 3,
        style: { fill: this.theme.labelText, fontSize: DIRECT_LABEL_SIZE, ...labelStyle },
        className: 'jikz-reference-label',
      })
    }
    return this
  }

  /**
   * The samples nearest a picture point — what a tooltip shows and
   * where a crosshair snaps. Returns null when the probe is outside
   * the plot area, no series has samples, or the nearest sample is
   * further than `maxDistance`.
   *
   * ```ts
   * const hit = frame.hitTest(cursor)              // per-series nearest x
   * const one = frame.hitTest(cursor, { mode: 'nearest', maxDistance: 12 })
   * ```
   */
  hitTest(p: PointLike, options: HitTestOptions = {}): HitResult | null {
    const { mode = 'x', maxDistance = Infinity, ids } = options
    if (!this.contains(p)) return null
    const series = ids
      ? this.registry.filter((s) => ids.includes(s.id))
      : this.registry

    const sampleAt = (s: SeriesRecord, index: number, distance: number): HitSample => {
      const [x, y] = s.data[index]!
      return { seriesId: s.id, index, x, y, at: s.points[index]!, distance }
    }

    if (mode === 'nearest') {
      let best: HitSample | undefined
      for (const s of series) {
        for (const i of this.orders.get(s.id)!.byX) {
          const q = s.points[i]!
          const distance = Math.hypot(q.x - p.x, q.y - p.y)
          if (!best || distance < best.distance) best = sampleAt(s, i, distance)
        }
      }
      if (!best || best.distance > maxDistance) return null
      return { x: best.x, y: best.y, at: best.at, samples: [best] }
    }

    const component = mode === 'x' ? 0 : 1
    const probe = mode === 'x' ? p.x : p.y
    const samples: HitSample[] = []
    for (const s of series) {
      const order = this.orders.get(s.id)!
      // No sample to hit: an empty series, or on a clipped frame one
      // whose samples all lie off the plot.
      if (order.byX.length === 0) continue
      const key = (i: number): number =>
        component === 0 ? s.points[i]!.x : s.points[i]!.y
      const index = nearestSorted(component === 0 ? order.byX : order.byY, key, probe)
      samples.push(sampleAt(s, index, Math.abs(key(index) - probe)))
    }
    if (samples.length === 0) return null
    const anchor = samples.reduce((a, b) => (b.distance < a.distance ? b : a))
    if (anchor.distance > maxDistance) return null
    return { x: anchor.x, y: anchor.y, at: anchor.at, samples }
  }
}

/** The scale for one axis: a band over its categories, else linear. */
function scaleFor(
  o: AxisOptions,
  resolved: ResolvedAxis,
  range: readonly [number, number],
  format: ((v: number) => string) | undefined
): Scale {
  if (o.categories) {
    const band = bandScale(o.categories, range, { padding: o.bandPadding })
    return format ? { ...band, format } : band
  }
  if (o.logarithmic) {
    return logScale([resolved.min, resolved.max], range, { format: format ?? formatLogTick })
  }
  if (o.time) {
    const opts = typeof o.time === 'object' ? o.time : {}
    return timeScale([resolved.min, resolved.max], range, { ...opts, format })
  }
  if (o.scale) {
    return functionScale([resolved.min, resolved.max], range, { ...o.scale, format })
  }
  return linearScale([resolved.min, resolved.max], range, { format: format ?? formatTick })
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
    axisSystem = 'scientific',
    style,
    tickStyle,
    gridStyle,
    minorGridStyle,
    fontSize = 10,
    labelFontSize = fontSize + 1,
    tickSize = 4,
    minorTickSize = tickSize / 2,
    textStyle,
    styleSheet,
    clip = false,
  } = options
  const school = axisSystem === 'schoolBook'
  const arrows = options.arrows ?? school
  const tickSide = options.tickSide ?? (school ? 'both' : 'outer')
  const labelStyle = options.labelStyle ?? (school ? 'end' : 'standard')
  const theme = resolveTheme(options.theme)
  const tickText: TextStyle = { fill: theme.tickText, ...textStyle, fontSize }
  const labelText: TextStyle = { fill: theme.labelText, ...textStyle, fontSize: labelFontSize }
  const xo = options.x ?? {}
  const yo = options.y ?? {}

  const xa = resolveAxis(xo)
  const ya = resolveAxis(yo)

  const x0 = at.x
  const yBase = at.y
  const xEnd = x0 + width
  const yTop = yBase - height

  const xScale = scaleFor(xo, xa, [x0, xEnd], xo.format)
  const yScale = scaleFor(yo, ya, [yBase, yTop], yo.format)
  const fmtX = xScale.format
  const fmtY = yScale.format

  // Where the axis lines run: the low edges, or through the origin
  // (clamped into the area) for the school book system.
  const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))
  const xAxisY = school && !yo.logarithmic && !yo.categories ? yScale.map(clamp(0, ya.min, ya.max)) : yBase
  const yAxisX = school && !xo.logarithmic && !xo.categories ? xScale.map(clamp(0, xa.min, xa.max)) : x0
  // A true origin shows one "0", not one per axis.
  const sharedOrigin =
    school && xa.ticks.includes(0) && ya.ticks.includes(0) && xAxisY === yScale.map(0) && yAxisX === xScale.map(0)

  const axisDefault: Partial<RenderStyle> = { stroke: theme.axis, strokeWidth: 1 }
  const axisPaint: StyleSpec = style ?? axisDefault
  const tickPaint: StyleSpec = tickStyle ?? style ?? axisDefault
  const gridPaint: StyleSpec = gridStyle ?? { stroke: theme.grid, strokeWidth: 1 }
  const minorGridPaint: StyleSpec = minorGridStyle ?? { stroke: theme.minorGrid, strokeWidth: 0.5 }
  const gridOf = (g: AxisOptions['grid']): { major: boolean; minor: boolean } => ({
    major: g === true || g === 'major' || g === 'both',
    minor: g === 'minor' || g === 'both',
  })
  const xGrid = gridOf(xo.grid)
  const yGrid = gridOf(yo.grid)

  // ── Gridlines (behind everything drawn later): minor, then major ──
  if (xGrid.minor) {
    for (const t of xa.minor) {
      const px = xScale.map(t)
      pic.draw(line(point(px, yBase), point(px, yTop)), { style: minorGridPaint })
    }
  }
  if (yGrid.minor) {
    for (const t of ya.minor) {
      const py = yScale.map(t)
      pic.draw(line(point(x0, py), point(xEnd, py)), { style: minorGridPaint })
    }
  }
  if (xGrid.major) {
    for (const t of xa.ticks) {
      const px = xScale.map(t)
      pic.draw(line(point(px, yBase), point(px, yTop)), { style: gridPaint })
    }
  }
  if (yGrid.major) {
    for (const t of ya.ticks) {
      const py = yScale.map(t)
      pic.draw(line(point(x0, py), point(xEnd, py)), { style: gridPaint })
    }
  }

  // ── Axis lines ─────────────────────────────────────────────────────
  if (arrows) {
    pic.edge(point(x0, xAxisY), point(xEnd, xAxisY), {
      arrowStart: 'none',
      arrowEnd: 'to',
      style: axisPaint,
    })
    pic.edge(point(yAxisX, yBase), point(yAxisX, yTop), {
      arrowStart: 'none',
      arrowEnd: 'to',
      style: axisPaint,
    })
  } else {
    pic.draw(line(point(x0, xAxisY), point(xEnd, xAxisY)), { style: axisPaint })
    pic.draw(line(point(yAxisX, yBase), point(yAxisX, yTop)), { style: axisPaint })
  }

  // ── Ticks and tick labels ──────────────────────────────────────────
  // A tick mark's extent on each side of the axis line, by tickSide:
  // outer marks go away from the plot area, inner ones into it.
  const extent = (size: number): { out: number; in: number } =>
    tickSide === 'both' ? { out: size / 2, in: size / 2 } : tickSide === 'inner' ? { out: 0, in: size } : { out: size, in: 0 }
  const major = extent(tickSize)
  const minor = extent(minorTickSize)
  const xLabelOffset = major.out + fontSize * 0.9
  const rotX = xo.rotateLabels ?? 0
  const rotY = yo.rotateLabels ?? 0
  const everyX = Math.max(1, Math.floor(xo.labelEvery ?? 1))
  const everyY = Math.max(1, Math.floor(yo.labelEvery ?? 1))

  for (const t of xa.minor) {
    const px = xScale.map(t)
    pic.draw(line(point(px, xAxisY - minor.in), point(px, xAxisY + minor.out)), { style: tickPaint })
  }
  xa.ticks.forEach((t, i) => {
    const px = xScale.map(t)
    pic.draw(line(point(px, xAxisY - major.in), point(px, xAxisY + major.out)), { style: tickPaint })
    if (xo.tickLabels === false || i % everyX !== 0) return
    if (sharedOrigin && t === 0) return
    const stagger = xo.stackLabels && i % 2 === 1 ? fontSize * 1.2 : 0
    pic.text(point(px, xAxisY + xLabelOffset + stagger), fmtX(t), {
      style: tickText,
      textAnchor: rotX > 0 ? 'start' : rotX < 0 ? 'end' : 'middle',
      ...(rotX && { rotate: rotX, dominantBaseline: 'middle' as const }),
    })
  })
  for (const t of ya.minor) {
    const py = yScale.map(t)
    pic.draw(line(point(yAxisX - minor.out, py), point(yAxisX + minor.in, py)), { style: tickPaint })
  }
  ya.ticks.forEach((t, i) => {
    const py = yScale.map(t)
    pic.draw(line(point(yAxisX - major.out, py), point(yAxisX + major.in, py)), { style: tickPaint })
    if (yo.tickLabels === false || i % everyY !== 0) return
    if (sharedOrigin && t === 0) return
    pic.text(point(yAxisX - major.out - 4, py), fmtY(t), {
      style: tickText,
      textAnchor: 'end',
      dominantBaseline: 'middle',
      ...(rotY && { rotate: rotY }),
    })
  })
  if (sharedOrigin) {
    pic.text(point(yAxisX - major.out - 4, xAxisY + xLabelOffset), '0', {
      style: tickText,
      textAnchor: 'end',
    })
  }

  // ── Axis labels ────────────────────────────────────────────────────
  if (xo.label) {
    if (labelStyle === 'end') {
      pic.text(point(xEnd + 6, xAxisY), xo.label, {
        style: labelText,
        textAnchor: 'start',
        dominantBaseline: 'middle',
      })
    } else {
      pic.text(point((x0 + xEnd) / 2, yBase + tickSize + fontSize + 14), xo.label, {
        style: labelText,
        textAnchor: 'middle',
      })
    }
  }
  if (yo.label) {
    if (labelStyle === 'end') {
      pic.text(point(yAxisX, yTop - 8), yo.label, {
        style: labelText,
        textAnchor: 'middle',
      })
    } else {
      // Above the axis and to its RIGHT: centred on x0 it reached back
      // over the tick-label column, and one tick-label height of
      // clearance is what keeps it off the topmost tick.
      pic.text(point(x0, yTop - fontSize - labelFontSize), yo.label, {
        style: labelText,
        textAnchor: 'start',
      })
    }
  }

  // ── Margins: how far the decorations reach past the plot area ─────
  const yLabelWidth =
    yo.tickLabels === false
      ? 0
      : Math.max(0, ...ya.ticks.map((t) => estimateLabelSize(fmtY(t), { fontSize }).width))
  const xLabelWidth = xo.label ? estimateLabelSize(xo.label, { fontSize: labelFontSize }).width : 0
  const margins = {
    left: yAxisX === x0 ? major.out + 4 + yLabelWidth : 0,
    top: yo.label ? (labelStyle === 'end' ? labelFontSize + 8 : fontSize + labelFontSize + 4) : 0,
    right: xo.label && labelStyle === 'end' ? xLabelWidth + 6 : 0,
    // The x label's baseline sits at tickSize + fontSize + 14; its
    // descenders reach about a third of its size below that.
    bottom:
      xAxisY !== yBase
        ? 0
        : xo.label && labelStyle === 'standard'
          ? tickSize + fontSize + 14 + labelFontSize * 0.35
          : major.out + (xo.tickLabels === false ? 0 : fontSize + 4) + (xo.stackLabels ? fontSize * 1.2 : 0),
  }

  // With clip, everything drawn through the frame lands in a scope
  // clipped to the plot area — axes and grid stay outside it.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let target: ItemContainer<any> = pic
  if (clip) {
    pic.scope({ clip: rect(x0, yTop, width, height), className: 'jikz-plot-area' }, (scope) => {
      target = scope
    })
  }
  // The interaction overlay: an empty group named by the plot area's
  // corner, so several frames in one picture stay apart. Items paint
  // in insertion order, so it precedes the series here; `attachChart`
  // moves it to the end of the DOM so crosshair and dots sit on top.
  const overlayClass = `jikz-chart-overlay-${Math.round(x0)}-${Math.round(yTop)}`
  pic.scope({ className: `jikz-chart-overlay ${overlayClass}` }, () => {})

  return new ChartFrame(target, {
    plotArea: [x0, yTop, xEnd, yBase],
    xScale,
    yScale,
    xTicks: xa.ticks,
    yTicks: ya.ticks,
    xMinorTicks: xa.minor,
    yMinorTicks: ya.minor,
    margins,
    labelContainer: pic,
    overlayClass,
    clipped: clip,
    theme,
    styleSheet: styleSheet === undefined ? undefined : styleSheet && resolveStyleSheet(styleSheet),
  })
}
