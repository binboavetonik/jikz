/**
 * Data visualization — jikz's analogue of TikZ's `datavisualization`
 * library: scaled axes with nice ticks and gridlines, a legend, and
 * `line`/`scatter`/`bar` series builders on top of the plot marks.
 *
 * Two levels, like TikZ's:
 *
 * - **`chart()`** — the one-call builder: auto domains from the data,
 *   axes, series, legend.
 * - **`axes()` + `legend()`** — the pieces, for layouts the builder
 *   doesn't anticipate. `axes()` returns a {@link ChartFrame} whose
 *   `x`/`y` scales map data units to picture coordinates, so custom
 *   drawing stays in data space.
 *
 * Nothing here registers shapes — dataviz is pure drawing on the
 * public container verbs, so it composes with any shape set.
 *
 * ```ts
 * import { picture, point } from 'jikz'
 * import { chart } from 'jikz'   // or './ext/dataviz'
 *
 * const pic = picture()
 * chart(pic, {
 *   at: point(50, 230), width: 320, height: 180,
 *   x: { label: 'n', ticks: 5 },
 *   y: { label: 'ms', grid: true },
 *   series: [
 *     { data: [[1, 4], [2, 9], [3, 15]], label: 'measured', marks: 'o' },
 *   ],
 *   legend: true,
 * })
 * ```
 */

export { chart } from './chart'
export type {
  ChartOptions,
  ChartSeriesSpec,
  ChartAxisOptions,
  ChartLegendOptions,
} from './chart'

export { axes, ChartFrame } from './frame'
export type {
  AxesOptions,
  AxisOptions,
  FrameLineOptions,
  FrameScatterOptions,
  FrameBarOptions,
} from './frame'

export { legend, legendSize } from './legend'
export type { LegendOptions, LegendEntry } from './legend'

export {
  linearScale,
  niceNumber,
  niceTicks,
  dataDomain,
  includeInDomain,
  formatTick,
  mapSeries,
} from './scale'
export type { Scale, NiceTicks, DataSeries } from './scale'
