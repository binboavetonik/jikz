/**
 * Chart themes — every ink a chart paints that is not a series colour:
 * axes, grid, tick and label text, legend, reference marks, the canvas
 * colour gaps and rings are cut in, and the interactive layer's
 * tooltip, crosshair, brush and zoom box. One object themes the static
 * chart and its overlay together, because the frame carries it.
 *
 * ```ts
 * chart(pic, { ..., theme: 'dark' })
 * chart(pic, { ..., theme: { base: 'dark', surface: '#101418', accent: '#f59e0b' } })
 * ```
 *
 * `lightTheme` is what dataviz always drew; `darkTheme` is the same
 * roles stepped for a dark canvas, with the dark column of the
 * categorical palette as its style sheet.
 */
import type { StyleSheetSpec } from './stylesheet'

/** The inks of a chart, by role. */
export interface ChartTheme {
  /** Unstyled series lines when there is no style sheet colour. */
  ink: string
  /** Axis lines, tick marks and the crosshair. */
  axis: string
  grid: string
  minorGrid: string
  /** Tick labels and value labels — secondary text. */
  tickText: string
  /** Axis labels, direct series labels, reference-dot labels — primary text. */
  labelText: string
  legendText: string
  legendFrame: { fill: string; stroke: string }
  /** Reference lines and dots, error bars. */
  reference: string
  /** Reference areas and sparkline bands (drawn translucent). */
  referenceArea: string
  /** Unstyled bars when there is no style sheet colour. */
  bar: string
  /**
   * The canvas colour: what gaps between slices and stacked segments,
   * rings round active dots, hollow candles and brush handles are cut
   * in. Set it to the colour the chart sits on.
   */
  surface: string
  /** Text drawn on a series colour (labels inside pie slices). */
  onSeries: string
  /** The brush window and the zoom selection. */
  accent: string
  /** The brush strip's simplified series. */
  brushStrip: { stroke: string; fill: string }
  candle: { up: string; down: string }
  /**
   * The tooltip. These are fallbacks: each is also a CSS custom
   * property (`--jikz-tooltip-bg`, `-text`, `-muted`, `-border`,
   * `-shadow`) a host can set instead.
   */
  tooltip: { background: string; text: string; muted: string; border: string; shadow: string }
  /** The style sheet series draw from when none is named. */
  styleSheet: StyleSheetSpec
}

/** The light theme: what dataviz drew before themes existed. */
export const lightTheme: ChartTheme = {
  ink: '#0f172a',
  axis: '#94a3b8',
  grid: '#e2e8f0',
  minorGrid: '#f1f5f9',
  tickText: '#475569',
  labelText: '#334155',
  legendText: '#334155',
  legendFrame: { fill: '#ffffff', stroke: '#cbd5e1' },
  reference: '#64748b',
  referenceArea: '#94a3b8',
  bar: '#64748b',
  surface: '#ffffff',
  onSeries: '#ffffff',
  accent: '#2a78d6',
  brushStrip: { stroke: '#cbd5e1', fill: '#e2e8f0' },
  candle: { up: '#1baf7a', down: '#e34948' },
  tooltip: {
    background: '#ffffff',
    text: '#0f172a',
    muted: '#475569',
    border: '#cbd5e1',
    shadow: 'rgba(15,23,42,.12)',
  },
  styleSheet: 'varyHue',
}

/** The dark theme: the same roles on a dark slate canvas. */
export const darkTheme: ChartTheme = {
  ink: '#f1f5f9',
  axis: '#64748b',
  grid: '#334155',
  minorGrid: '#1e293b',
  tickText: '#94a3b8',
  labelText: '#cbd5e1',
  legendText: '#cbd5e1',
  legendFrame: { fill: '#1e293b', stroke: '#475569' },
  reference: '#94a3b8',
  referenceArea: '#94a3b8',
  bar: '#94a3b8',
  surface: '#0f172a',
  onSeries: '#ffffff',
  accent: '#3987e5',
  brushStrip: { stroke: '#475569', fill: '#334155' },
  candle: { up: '#199e70', down: '#e66767' },
  tooltip: {
    background: '#1e293b',
    text: '#f1f5f9',
    muted: '#94a3b8',
    border: '#475569',
    shadow: 'rgba(0,0,0,.45)',
  },
  styleSheet: 'varyHueDark',
}

/** A theme's overrides: any role, over `base` (default `'light'`). */
export type ChartThemeOverrides = {
  [K in keyof ChartTheme]?: ChartTheme[K] extends object
    ? ChartTheme[K] extends StyleSheetSpec
      ? ChartTheme[K]
      : Partial<ChartTheme[K]>
    : ChartTheme[K]
} & { base?: 'light' | 'dark' }

/** A theme by name, or overrides on one. */
export type ThemeSpec = 'light' | 'dark' | ChartThemeOverrides

/** Resolve a {@link ThemeSpec} to a full theme. Default: light. */
export function resolveTheme(spec?: ThemeSpec | ChartTheme): ChartTheme {
  if (spec === undefined || spec === 'light') return lightTheme
  if (spec === 'dark') return darkTheme
  const { base, ...over } = spec as ChartThemeOverrides
  const from = base === 'dark' ? darkTheme : lightTheme
  return {
    ...from,
    ...over,
    legendFrame: { ...from.legendFrame, ...over.legendFrame },
    brushStrip: { ...from.brushStrip, ...over.brushStrip },
    candle: { ...from.candle, ...over.candle },
    tooltip: { ...from.tooltip, ...over.tooltip },
    styleSheet: over.styleSheet ?? from.styleSheet,
  } as ChartTheme
}
