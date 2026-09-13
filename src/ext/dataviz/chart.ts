/**
 * `chart()` — the one-call datavisualization builder: infer domains
 * from the series, draw axes with nice ticks, paint each series, and
 * collect labeled series into a legend.
 *
 * ```ts
 * chart(pic, {
 *   at: point(50, 230), width: 320, height: 180,
 *   y: { label: 'ms', grid: true },
 *   series: [
 *     { data: quicksort, label: 'quicksort', style: { stroke: '#2563eb' }, marks: 'o' },
 *     { data: mergesort, label: 'mergesort', style: { stroke: '#dc2626' }, smooth: true },
 *   ],
 *   legend: true,
 * })
 * ```
 *
 * Domains default to `'auto'` — the data extent, widened to nice tick
 * boundaries (bar series also pin the baseline at 0). Pass an explicit
 * `[min, max]` per axis to override.
 */
import { point } from '../../core/Point'
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
} from './frame'
import {
  legend,
  legendSize,
  type LegendOptions,
} from './legend'
import {
  dataDomain,
  includeInDomain,
  type DataSeries,
} from './scale'

/** One series of a {@link chart}. */
export interface ChartSeriesSpec {
  /** `[x, y]` pairs in data units. */
  data: DataSeries
  /** How to draw it (default `'line'`). */
  kind?: 'line' | 'scatter' | 'bar'
  /** Series paint — also the legend swatch. */
  style?: StyleSpec
  /** Scatter markers (line/scatter series). */
  marks?: PlotMark | PlotMarkSpec
  /** Catmull-Rom smoothing (line series). */
  smooth?: boolean
  /** Legend label; unlabeled series stay out of the legend. */
  label?: string
  /** Bar width in picture units (bar series). */
  barWidth?: number
}

/** Axis options for {@link chart}: the domain may be inferred. */
export interface ChartAxisOptions extends Omit<AxisOptions, 'domain'> {
  /**
   * `[min, max]` to pin the range, or `'auto'` (default) to take the
   * data extent of all series — still widened to nice ticks unless
   * `exact` is set.
   */
  domain?: [number, number] | 'auto'
}

/** Legend options inside {@link ChartOptions} — placement optional. */
export type ChartLegendOptions = Omit<LegendOptions, 'at' | 'entries'> & {
  /** North west corner; default: inside the plot area, north east. */
  at?: PointLike
}

/** Options for {@link chart}. */
export interface ChartOptions extends Omit<AxesOptions, 'x' | 'y'> {
  x?: ChartAxisOptions
  y?: ChartAxisOptions
  /** The data to draw, in paint order. */
  series: readonly ChartSeriesSpec[]
  /**
   * `true` for a framed legend at the default position (north east,
   * inside the plot area), or legend options with an optional `at`.
   * Only series with a `label` get an entry.
   */
  legend?: boolean | ChartLegendOptions
}

function resolveDomain(
  domain: [number, number] | 'auto' | undefined,
  auto: [number, number]
): [number, number] {
  return domain === undefined || domain === 'auto' ? auto : domain
}

function scatterMarkOf(s: ChartSeriesSpec): PlotMark | undefined {
  if (s.kind === 'bar') return undefined
  if (s.kind === 'scatter' && s.marks === undefined) return 'circleFilled'
  if (s.marks === undefined) return undefined
  return typeof s.marks === 'string' ? s.marks : s.marks.name
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

  const allData = series.map((s) => s.data)
  const hasBars = series.some((s) => s.kind === 'bar')

  let yAuto = dataDomain(allData, 1)
  if (hasBars) yAuto = includeInDomain(yAuto, 0)

  const xDomain = resolveDomain(xo?.domain, dataDomain(allData, 0))
  const yDomain = resolveDomain(yo?.domain, yAuto)

  const frame = axes(pic, {
    ...axesRest,
    x: { ...xo, domain: xDomain },
    y: { ...yo, domain: yDomain },
  })

  for (const s of series) {
    const kind = s.kind ?? 'line'
    if (kind === 'bar') {
      frame.bars(s.data, { style: s.style, width: s.barWidth })
    } else if (kind === 'scatter') {
      frame.scatter(s.data, { style: s.style, marks: s.marks })
    } else {
      frame.line(s.data, { style: s.style, marks: s.marks, smooth: s.smooth })
    }
  }

  const entries = series
    .filter((s) => s.label !== undefined)
    .map((s) => ({
      label: s.label!,
      style: s.style,
      sample: (s.kind === 'bar' ? 'box' : 'line') as 'box' | 'line',
      mark: scatterMarkOf(s),
    }))

  if (legendOpt && entries.length > 0) {
    const lo: ChartLegendOptions = legendOpt === true ? {} : legendOpt
    const at =
      lo.at ??
      (() => {
        const size = legendSize({ ...lo, entries })
        return point(frame.area[2] - size.width - 8, frame.area[1] + 8)
      })()
    legend(pic, { ...lo, at, entries })
  }

  return frame
}
