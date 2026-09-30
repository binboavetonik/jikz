/**
 * `chart()` — the one-call datavisualization builder: infer domains
 * from the series, draw axes with nice ticks, paint each series, and
 * collect labeled series into a legend.
 *
 * ```ts
 * chart(pic, {
 *   at: point(50, 230), width: 320, height: 180,
 *   x: { categories: ['Q1', 'Q2', 'Q3', 'Q4'] },
 *   y: { label: 'revenue', grid: true },
 *   series: [
 *     { data: [['Q1', 42], ['Q2', 58], ['Q3', 49], ['Q4', 71]], kind: 'bar', label: '2025' },
 *     { data: [['Q1', 35], ['Q2', 51], ['Q3', 63], ['Q4', 66]], kind: 'bar', label: '2026' },
 *   ],
 *   legend: { place: 'below' },
 * })
 * ```
 *
 * Domains default to `'auto'` — the data extent, widened to nice tick
 * boundaries (bar and area series also pin the baseline at 0, and
 * stacks count their totals). Pass an explicit `[min, max]` per axis
 * to override. Bar series that are not stacked group side by side.
 */
import { point, type Point } from '../../core/Point'
import type { PointLike } from '../../core/types'
import type { ShapeSet } from '../../geometry/ShapeKind'
import type { ItemContainer } from '../../picture/Container'
import type { StyleSpec } from '../../render/StyleMapper'
import type { PlotMark, PlotMarkSpec } from '../../geometry/PlotMark'
import {
  axes,
  ChartFrame,
  type AxisOptions,
  type AxesOptions,
  type Candle,
  type LabelInData,
  type PointStyle,
  type ValueLabels,
} from './frame'
import type { Interpolation } from './interpolate'
import { normalizeEnter, staggered, type EnterKind, type EnterOptions, type ChartEnterOptions } from './animate'
import {
  legend,
  legendSize,
  type LegendOptions,
} from './legend'
import {
  dataDomain,
  includeInDomain,
  stackedDomain,
  toSeries,
  toNumber,
  type DataInput,
  type DataSeries,
} from './scale'

/** One series of a {@link chart}. */
export interface ChartSeriesSpec<T = unknown> {
  /**
   * `[x, y]` pairs in data units (strings on a band axis), or records
   * with accessors. A `'candlestick'` series takes
   * `[x, open, high, low, close]` candles.
   */
  data: DataInput<T> | readonly Candle[]
  /**
   * Series id — the handle the frame's model, `hitTest` and the CSS
   * classes use. Default: `series-<index>`.
   */
  id?: string
  /** How to draw it (default `'line'`). */
  kind?: 'line' | 'scatter' | 'bar' | 'area' | 'candlestick'
  /** Series paint — also the legend swatch. Bars and scatter take a per-point function too. */
  style?: PointStyle
  /** Scatter markers (line/area/scatter series). */
  marks?: PlotMark | PlotMarkSpec
  /** How samples join (line/area series; default `'linear'`). */
  interpolation?: Interpolation
  /** Alias for `interpolation: 'smooth'`. */
  smooth?: boolean
  /** Close a line series back to its start. */
  closed?: boolean
  /** Legend label; unlabeled series stay out of the legend. */
  label?: string
  /** Bar width in picture units (bar/candlestick series). */
  barWidth?: number
  /**
   * Stack name (bar/area series): sits on the previous series in the
   * stack. Bars without a stack group side by side automatically.
   */
  stack?: string
  /** Line/area series: join the neighbours across a non-finite sample. */
  connectGaps?: boolean
  /** Put the series name next to the data. */
  labelInData?: LabelInData
  /** Print each sample's value beside it. */
  valueLabels?: ValueLabels
  /** Rising/falling candle paint (candlestick series). */
  up?: StyleSpec
  down?: StyleSpec
  /** Enter animation for this series — overrides the chart's. */
  enter?: EnterKind | EnterOptions
}

/** Axis options for {@link chart}: the domain may be inferred. */
export interface ChartAxisOptions extends Omit<AxisOptions, 'domain'> {
  /**
   * `[min, max]` to pin the range, or `'auto'` (default) to take the
   * data extent of all series — still widened to nice ticks unless
   * `exact` is set. Ignored on a band axis (`categories`).
   */
  domain?: readonly [number | Date, number | Date] | 'auto'
}

/**
 * Where `chart()` puts its legend — TikZ's `north east inside`,
 * `east outside`, `below` and kin. Inside placements sit in the plot
 * area (framed by default); outside placements clear the axes and
 * their labels (unframed by default). `'auto'` is the inside corner
 * holding the fewest series samples.
 */
export type LegendPlacement =
  | 'auto'
  | 'northEastInside'
  | 'northWestInside'
  | 'southEastInside'
  | 'southWestInside'
  | 'northInside'
  | 'southInside'
  | 'northEastOutside'
  | 'northWestOutside'
  | 'southEastOutside'
  | 'southWestOutside'
  | 'northOutside'
  | 'southOutside'
  | 'eastOutside'
  | 'westOutside'
  | 'above'
  | 'below'
  | 'left'
  | 'right'

/** Legend options inside {@link ChartOptions} — placement optional. */
export type ChartLegendOptions = Omit<LegendOptions, 'at' | 'entries'> & {
  /**
   * North west corner. Overrides {@link place}.
   */
  at?: PointLike
  /**
   * Named placement relative to the plot area (default `'auto'`). A
   * legend above or below the axes lays its entries out in one row
   * unless `columns`/`rows` say otherwise.
   */
  place?: LegendPlacement
}

/** Options for {@link chart}. */
export interface ChartOptions extends Omit<AxesOptions, 'x' | 'y'> {
  x?: ChartAxisOptions
  y?: ChartAxisOptions
  /** The data to draw, in paint order. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  series: readonly ChartSeriesSpec<any>[]
  /**
   * `true` for a framed legend auto-placed in the emptiest inside
   * corner of the plot area, or legend options with a `place` or an
   * `at` (and `frame: false` to drop the box). Only series with a
   * `label` get an entry.
   */
  legend?: boolean | ChartLegendOptions
  /**
   * Enter animation for every series, staggered in paint order:
   * `'draw'`, `'grow'`, `'fade'`, or {@link ChartEnterOptions}. A
   * series' own `enter` wins. SMIL — plays in static SVG output too.
   */
  enter?: EnterKind | ChartEnterOptions
}

function resolveDomain(
  domain: readonly [number | Date, number | Date] | 'auto' | undefined,
  auto: [number, number]
): readonly [number | Date, number | Date] {
  return domain === undefined || domain === 'auto' ? auto : domain
}

/** Inset between the plot area's border and an inside legend, px. */
const LEGEND_INSET = 8
/** Gap between the axis decorations and an outside legend, px. */
const LEGEND_GAP = 10

/**
 * Picture-space points the drawn series cover, for legend collision
 * scoring. Line and scatter series are their samples; a bar also
 * fills the column between the baseline and its top, so that span is
 * sampled too.
 */
function coveredPoints(frame: ChartFrame): Point[] {
  const pts: Point[] = []
  const baseline = frame.y(0)
  for (const s of frame.series) {
    for (const p of s.points) {
      pts.push(p)
      if (s.kind !== 'bar' && s.kind !== 'area') continue
      for (let i = 1; i <= 4; i++) {
        pts.push(point(p.x, p.y + ((baseline - p.y) * i) / 4))
      }
    }
  }
  return pts
}

/**
 * The inside corner of the plot area holding the fewest series points —
 * so `legend: true` lands in white space instead of on the data. Ties
 * keep the first candidate, which is the conventional north east.
 */
function freestCorner(frame: ChartFrame, size: { width: number; height: number }): Point {
  const candidates = (['northEastInside', 'northWestInside', 'southEastInside', 'southWestInside'] as const)
    .map((place) => placeLegend(frame, place, size))
  const pts = coveredPoints(frame)
  let best = candidates[0]!
  let bestScore = Infinity
  for (const c of candidates) {
    const score = pts.filter(
      (p) =>
        p.x >= c.x - LEGEND_INSET &&
        p.x <= c.x + size.width + LEGEND_INSET &&
        p.y >= c.y - LEGEND_INSET &&
        p.y <= c.y + size.height + LEGEND_INSET
    ).length
    if (score < bestScore) {
      bestScore = score
      best = c
    }
  }
  return best
}

/** The north west corner of a legend of `size` at a named placement. */
function placeLegend(
  frame: ChartFrame,
  place: Exclude<LegendPlacement, 'auto'>,
  size: { width: number; height: number }
): Point {
  const [x0, y0, x1, y1] = frame.plotArea
  const [ox0, oy0, ox1, oy1] = frame.outerArea
  const { width: w, height: h } = size
  const midX = (x0 + x1) / 2 - w / 2
  const midY = (y0 + y1) / 2 - h / 2
  switch (place) {
    case 'northEastInside':
      return point(x1 - w - LEGEND_INSET, y0 + LEGEND_INSET)
    case 'northWestInside':
      return point(x0 + LEGEND_INSET, y0 + LEGEND_INSET)
    case 'southEastInside':
      return point(x1 - w - LEGEND_INSET, y1 - h - LEGEND_INSET)
    case 'southWestInside':
      return point(x0 + LEGEND_INSET, y1 - h - LEGEND_INSET)
    case 'northInside':
      return point(midX, y0 + LEGEND_INSET)
    case 'southInside':
      return point(midX, y1 - h - LEGEND_INSET)
    case 'northEastOutside':
      return point(ox1 + LEGEND_GAP, y0)
    case 'southEastOutside':
      return point(ox1 + LEGEND_GAP, y1 - h)
    case 'northWestOutside':
      return point(ox0 - LEGEND_GAP - w, y0)
    case 'southWestOutside':
      return point(ox0 - LEGEND_GAP - w, y1 - h)
    case 'eastOutside':
    case 'right':
      return point(ox1 + LEGEND_GAP, midY)
    case 'westOutside':
    case 'left':
      return point(ox0 - LEGEND_GAP - w, midY)
    case 'northOutside':
    case 'above':
      return point(midX, oy0 - LEGEND_GAP - h)
    case 'southOutside':
    case 'below':
      return point(midX, oy1 + LEGEND_GAP)
  }
}

const HORIZONTAL_PLACES: readonly LegendPlacement[] = ['northOutside', 'southOutside', 'above', 'below']

function isCandles(data: ChartSeriesSpec['data']): data is readonly Candle[] {
  return Array.isArray(data) && data.length > 0 && (data[0] as readonly unknown[]).length === 5
}

/**
 * Draw a complete chart: axes + series + optional legend. Returns the
 * {@link ChartFrame} so further custom drawing can map through the
 * same scales.
 */
export function chart<S extends ShapeSet>(
  pic: ItemContainer<S>,
  options: ChartOptions
): ChartFrame {
  const { series, legend: legendOpt, x: xo, y: yo, ...axesRest } = options
  const categories = { x: xo?.categories, y: yo?.categories }

  // The numeric samples each series contributes to the extents: pairs
  // as they are, candles as their low and high.
  const extents: DataSeries[] = series.map((s) => {
    if (s.kind === 'candlestick' && isCandles(s.data)) {
      return s.data.flatMap(([x, , high, low]) => {
        const xv = toNumber(x, categories.x)
        return [[xv, low] as const, [xv, high] as const]
      })
    }
    return toSeries(s.data as DataInput, categories)
  })
  // A logarithmic axis cannot show zero or negatives: they leave the
  // auto domain (the builders still skip them at draw time).
  const positiveOnly = (list: DataSeries[], component: 0 | 1): DataSeries[] =>
    list.map((s) => s.filter((p) => p[component] > 0))
  if (xo?.logarithmic) extents.splice(0, extents.length, ...positiveOnly(extents, 0))
  if (yo?.logarithmic) extents.splice(0, extents.length, ...positiveOnly(extents, 1))
  const pinsBaseline = !yo?.logarithmic && series.some((s) => s.kind === 'bar' || s.kind === 'area')
  const stacks = new Map<string, DataSeries[]>()
  series.forEach((s, i) => {
    if (s.stack === undefined || (s.kind !== 'bar' && s.kind !== 'area')) return
    const group = stacks.get(s.stack) ?? []
    group.push(extents[i]!)
    stacks.set(s.stack, group)
  })

  let yAuto = dataDomain(
    extents.filter((_, i) => series[i]!.stack === undefined),
    1
  )
  if (stacks.size > 0) {
    const [lo, hi] = stackedDomain([...stacks.values()])
    // Unstacked series alone decide the extent when there are none
    // stacked; otherwise the two extents merge.
    yAuto = extents.some((_, i) => series[i]!.stack === undefined)
      ? [Math.min(yAuto[0], lo), Math.max(yAuto[1], hi)]
      : [lo, hi]
  }
  if (pinsBaseline) yAuto = includeInDomain(yAuto, 0)

  const xDomain = resolveDomain(xo?.domain, dataDomain(extents, 0))
  const yDomain = resolveDomain(yo?.domain, yAuto)

  const frame = axes(pic, {
    ...axesRest,
    x: { ...xo, domain: xDomain },
    y: { ...yo, domain: yDomain },
  })

  // Bars that are not stacked take one column each, side by side;
  // each stack is one column too.
  const columns: string[] = []
  series.forEach((s, i) => {
    if (s.kind !== 'bar') return
    const key = s.stack ?? `#${i}`
    if (!columns.includes(key)) columns.push(key)
  })

  const chartEnter = normalizeEnter(options.enter) as ChartEnterOptions | undefined
  series.forEach((s, i) => {
    const kind = s.kind ?? 'line'
    const enter = s.enter ?? (chartEnter && staggered(chartEnter, i))
    const identity = { id: s.id ?? `series-${i}`, label: s.label, enter }
    if (kind === 'candlestick') {
      frame.candlestick(isCandles(s.data) ? s.data : [], {
        ...identity,
        width: s.barWidth,
        up: s.up,
        down: s.down,
      })
      return
    }
    const data = s.data as DataInput
    const labels = { labelInData: s.labelInData, valueLabels: s.valueLabels }
    if (kind === 'bar') {
      const key = s.stack ?? `#${i}`
      frame.bars(data, {
        ...identity,
        ...labels,
        style: s.style,
        width: s.barWidth,
        stack: s.stack,
        group: { index: columns.indexOf(key), count: columns.length },
      })
    } else if (kind === 'scatter') {
      frame.scatter(data, { ...identity, ...labels, style: s.style, marks: s.marks })
    } else if (kind === 'area') {
      frame.area(data, {
        ...identity,
        ...labels,
        style: s.style as StyleSpec | undefined,
        marks: s.marks,
        smooth: s.smooth,
        interpolation: s.interpolation,
        connectGaps: s.connectGaps,
        stack: s.stack,
      })
    } else {
      frame.line(data, {
        ...identity,
        ...labels,
        style: s.style as StyleSpec | undefined,
        marks: s.marks,
        smooth: s.smooth,
        interpolation: s.interpolation,
        closed: s.closed,
        connectGaps: s.connectGaps,
      })
    }
  })

  // Entries come from the frame's records, so they show the EFFECTIVE
  // paint and mark — the style sheet's, when the spec gave none.
  const entries = frame.series
    .filter((s) => s.label !== undefined)
    .map((s) => ({
      id: s.id,
      label: s.label!,
      style: s.style,
      sample: (s.kind === 'bar' || s.kind === 'area' || s.kind === 'candlestick' ? 'box' : 'line') as
        | 'box'
        | 'line',
      mark: s.mark,
    }))

  if (legendOpt && entries.length > 0) {
    const { place = 'auto', at: atOpt, ...lo }: ChartLegendOptions =
      legendOpt === true ? {} : legendOpt
    const outside = place.endsWith('Outside') || ['above', 'below', 'left', 'right'].includes(place)
    // A legend above or below the axes reads as one row.
    if (HORIZONTAL_PLACES.includes(place) && lo.columns === undefined && lo.rows === undefined) {
      lo.columns = entries.length
    }
    const size = legendSize({ ...lo, entries })
    const at =
      atOpt ?? (place === 'auto' ? freestCorner(frame, size) : placeLegend(frame, place, size))
    // A legend inside the plot area sits on top of the data, so it is
    // framed unless the caller opts out; outside, it is bare.
    legend(pic, { frame: !outside, ...lo, at, entries })
  }

  return frame
}
