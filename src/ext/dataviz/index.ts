/**
 * Data visualization — jikz's analogue of TikZ's `datavisualization`
 * library: scaled axes (linear or categorical bands) with nice ticks
 * and gridlines, style sheets, legends, and `line`/`area`/`scatter`/
 * `bars`/`candlestick`/`fn` series builders on top of the plot marks,
 * plus reference marks, sparklines and pies.
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
 * The frame is also the **chart model**: it remembers every series it
 * drew (samples in data and picture space, the CSS class and
 * `data-series` attribute their elements carry) and answers
 * `hitTest()` — the read side for tooltips, crosshairs and legend
 * toggles, without re-deriving anything from the DOM. `attachChart()`
 * is the thin DOM adapter over it, and `chartView()` the loop that
 * re-renders on zoom, brush, resize and new data.
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

export { chart, chartDomains } from './chart'
export type {
  ChartOptions,
  ChartSeriesSpec,
  ChartAxisOptions,
  ChartLegendOptions,
  LegendPlacement,
} from './chart'

export { axes, axisDomain, ChartFrame, seriesColor } from './frame'
export type {
  AxesOptions,
  AxisOptions,
  AxisSystem,
  ChartFrameInit,
  ChartMarkSpec,
  FrameSeriesOptions,
  SeriesDrawOptions,
  FrameLabelOptions,
  FrameLineOptions,
  FrameAreaOptions,
  FrameScatterOptions,
  FrameBarOptions,
  FrameCandlestickOptions,
  FrameErrorBarOptions,
  FrameFnOptions,
  ReferenceLineOptions,
  ReferenceAreaOptions,
  ReferenceDotOptions,
  Candle,
  ErrorSample,
  PointStyle,
  LabelInData,
  ValueLabels,
  SeriesKind,
  SeriesRecord,
  HitTestOptions,
  HitSample,
  HitResult,
} from './frame'

export { interpolatePath, stepPoints } from './interpolate'

export {
  parseDuration,
  normalizeEnter,
  enterKeyframe,
  fadeIn,
  drawIn,
  growIn,
  staggered,
} from './animate'
export type { EnterKind, EnterOptions, ChartEnterOptions } from './animate'

export {
  timeScale,
  timeTicks,
  formatTime,
  chooseInterval,
  floorTime,
  offsetTime,
  intervalMs,
} from './time'
export type {
  TimeZone,
  TimeInterval,
  TimeTicks,
  TimeFormatOptions,
  TimeScaleOptions,
} from './time'
export type { Interpolation } from './interpolate'

export {
  attachChart,
  defaultTooltip,
  placeTooltip,
  tooltipFits,
  viewBoxOf,
  viewportTransformOf,
} from './interact'
export type {
  ChartInteractionOptions,
  ChartTooltipOptions,
  ChartController,
  TooltipBounds,
} from './interact'

export { lightTheme, darkTheme, resolveTheme } from './theme'
export type { ChartTheme, ChartThemeOverrides, ThemeSpec } from './theme'

export { chartView, windowSamples } from './view'
export type { ChartViewOptions, ChartView, ChartBrushOptions } from './view'

export { sparkline } from './sparkline'
export type { SparklineOptions, SparklineResult } from './sparkline'

export { pie } from './pie'
export type { PieOptions, PieSlice, PieLabels, PieResult, PieSliceResult } from './pie'

export { legend, legendSize } from './legend'
export type { LegendOptions, LegendEntry, LegendFillOrder } from './legend'

export {
  styleSheets,
  resolveStyleSheet,
  slotOf,
  VARY_HUE,
  VARY_HUE_DARK,
} from './stylesheet'
export type {
  StyleSheet,
  StyleSheetName,
  StyleSheetSpec,
  SeriesSlot,
} from './stylesheet'

export {
  linearScale,
  bandScale,
  logScale,
  functionScale,
  spreadTicks,
  logTicks,
  minorTicksBetween,
  formatLogTick,
  niceNumber,
  niceTicks,
  dataDomain,
  includeInDomain,
  formatTick,
  mapSeries,
  toSeries,
  toNumber,
  stackedDomain,
} from './scale'
export type {
  Scale,
  ScaleKind,
  Tick,
  LinearScaleOptions,
  LogScaleOptions,
  FunctionScaleOptions,
  AxisFunction,
  BandScaleOptions,
  AboutStrategy,
  NiceTicks,
  NiceTicksOptions,
  DataSeries,
  DataPair,
  DataValue,
  DataRecords,
  DataInput,
  Categories,
} from './scale'
