/**
 * Sparklines — TikZ's `datavisualization.sparklines`: a word-sized
 * line with no axes, optionally filled, with a normal band and a
 * mark on the last value. Fits in a table cell or a stat tile.
 *
 * ```ts
 * sparkline(pic, [4, 6, 3, 8, 9, 5, 11], { at: point(10, 30), width: 80, height: 20, endMark: true })
 * ```
 */
import { point, type Point } from '../../core/Point'
import type { PointLike } from '../../core/types'
import type { ShapeSet } from '../../geometry/ShapeKind'
import type { ItemContainer } from '../../picture/Container'
import type { StyleSpec } from '../../render/StyleMapper'
import { rect } from '../../geometry/Rectangle'
import { pathFromSVG } from '../../path/svgPath'
import { drawMarks } from './frame'
import { interpolatePath, type Interpolation } from './interpolate'
import { linearScale, dataDomain, toSeries, type DataInput, type Scale, type DataSeries } from './scale'
import { resolveStyleSheet } from './stylesheet'
import { resolveTheme, type ThemeSpec } from './theme'

/** Options for {@link sparkline}. */
export interface SparklineOptions {
  /** South west corner of the box, in picture coords. */
  at: PointLike
  /** Box size, px. */
  width: number
  height: number
  /** Line paint (default: the palette's first hue, 1.5px). */
  style?: StyleSpec
  /** Fill under the line: `true` for a light tint of the line colour, or a paint. */
  fill?: boolean | StyleSpec
  /** Mark the last sample with a dot (default false). */
  endMark?: boolean
  /** Shade a normal range `[low, high]` in y behind the line. */
  band?: readonly [number, number]
  /** Band paint (default: translucent slate). */
  bandStyle?: StyleSpec
  /** Pin the y range (default: the data extent). */
  domain?: readonly [number, number]
  /** How samples join (default `'linear'`). */
  interpolation?: Interpolation
  /** CSS class on the line (and `-fill`, `-band`, `-end` suffixes on the rest). */
  className?: string
  /** Line and band inks: `'light'` (default), `'dark'`, or overrides. */
  theme?: ThemeSpec
}

/** What {@link sparkline} returns: its scales and the drawn points. */
export interface SparklineResult {
  xScale: Scale
  yScale: Scale
  points: readonly Point[]
  /** The last sample's picture point, or undefined for empty data. */
  last?: Point
}

/**
 * Draw a sparkline. `data` is `[x, y]` pairs, records, or a bare list
 * of y values (x is then the index).
 */
export function sparkline<S extends ShapeSet, T>(
  pic: ItemContainer<S>,
  data: DataInput<T> | readonly number[],
  options: SparklineOptions
): SparklineResult {
  const {
    at,
    width,
    height,
    style,
    fill,
    endMark = false,
    band,
    bandStyle,
    domain,
    interpolation = 'linear',
    className,
  } = options
  const series: DataSeries =
    Array.isArray(data) && data.every((v) => typeof v === 'number')
      ? (data as readonly number[]).map((y, i) => [i, y] as const)
      : toSeries(data as DataInput<T>)
  const finite = series.filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y))
  const x0 = at.x
  const yBase = at.y
  const [xMin, xMax] = dataDomain([finite], 0)
  let [yMin, yMax] = domain ?? dataDomain([finite], 1)
  if (band) {
    yMin = Math.min(yMin, band[0])
    yMax = Math.max(yMax, band[1])
  }
  if (yMin === yMax) {
    yMin -= 0.5
    yMax += 0.5
  }
  const xScale = linearScale(xMin === xMax ? [xMin - 0.5, xMax + 0.5] : [xMin, xMax], [x0, x0 + width])
  const yScale = linearScale([yMin, yMax], [yBase, yBase - height])
  const points = finite.map(([x, y]) => point(xScale.map(x), yScale.map(y)))
  const theme = resolveTheme(options.theme)
  const color = resolveStyleSheet(theme.styleSheet).colors?.[0] ?? theme.ink
  const linePaint: StyleSpec = style ?? { stroke: color, strokeWidth: 1.5 }
  const cls = (suffix: string): string | undefined => (className ? `${className}${suffix}` : undefined)

  if (band) {
    const top = yScale.map(band[1])
    pic.filldraw(rect(x0, top, width, yScale.map(band[0]) - top), {
      style: bandStyle ?? { fill: theme.referenceArea, fillOpacity: 0.15, stroke: 'none' },
      className: cls('-band'),
    })
  }
  if (fill && points.length >= 2) {
    const top = interpolatePath(points, interpolation)
    const first = points[0]!
    const lastP = points[points.length - 1]!
    const d = `${top} L ${lastP.x} ${yBase} L ${first.x} ${yBase} Z`
    pic.filldraw(pathFromSVG(d), {
      style: fill === true ? { fill: color, fillOpacity: 0.15, stroke: 'none' } : fill,
      className: cls('-fill'),
    })
  }
  const d = interpolatePath(points, interpolation)
  if (d) pic.draw(pathFromSVG(d), { style: linePaint, className })
  const last = points[points.length - 1]
  if (endMark && last) {
    drawMarks(pic, [last], { name: 'circleFilled', size: 5 }, linePaint, {
      className: cls('-end'),
    })
  }
  return { xScale, yScale, points, last }
}
