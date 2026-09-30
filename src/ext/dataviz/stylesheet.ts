/**
 * Style sheets — TikZ `datavisualization`'s `style sheet` mechanism:
 * a series' paint follows its position in the chart, so the caller
 * never has to hand every series a colour. `vary hue` gives the n-th
 * series the n-th hue, `cross marks` gives every series a cross,
 * `vary dashing` the n-th dash pattern; sheets compose.
 *
 * ```ts
 * chart(pic, { ..., styleSheet: 'varyHue' })                    // the default
 * chart(pic, { ..., styleSheet: ['varyHue', 'crossMarks'] })    // composed
 * chart(pic, { ..., styleSheet: { colors: BRAND } })            // your own
 * ```
 *
 * The default palette is eight categorical hues validated for
 * colour-vision deficiency on adjacent series in both light and dark
 * mode. Slots are assigned in fixed order and never re-shuffled, so a
 * series keeps its colour when its neighbours are hidden. A ninth
 * series wraps to slot one with the next dash pattern and a warning —
 * the honest fix is fewer series or small multiples.
 */
import { JikzError, warn } from '../../core/errors'
import type { DashPatternName } from '../../render/StyleMapper'
import type { PlotMark } from '../../geometry/PlotMark'

/**
 * What a style sheet varies per series slot. Absent fields leave the
 * slot alone, so sheets merge: `['varyHue', 'crossMarks']` colours
 * from one and marks from the other.
 */
export interface StyleSheet {
  /** Series colours, slot by slot. */
  colors?: readonly string[]
  /** Line dash patterns, slot by slot (line series only). */
  dashes?: readonly DashPatternName[]
  /** Line widths in px, slot by slot (line series only). */
  widths?: readonly number[]
  /** Plot marks, slot by slot — one entry gives every series that mark. */
  marks?: readonly PlotMark[]
}

/** The built-in sheets, named after TikZ's. */
export type StyleSheetName =
  | 'varyHue'
  | 'varyHueDark'
  | 'strongColors'
  | 'shadesOfBlue'
  | 'shadesOfRed'
  | 'grayScale'
  | 'varyDashing'
  | 'varyThickness'
  | 'crossMarks'
  | 'oMark'
  | 'starMark'
  | 'dotMark'

/**
 * A sheet, by name or by value, or several to compose — later entries
 * win where they overlap.
 */
export type StyleSheetSpec =
  | StyleSheetName
  | StyleSheet
  | readonly (StyleSheetName | StyleSheet)[]

/**
 * The default categorical palette, light canvas: eight hues in the
 * order that keeps every adjacent pair distinguishable under the
 * common colour-vision deficiencies. Slot 1 is blue.
 */
export const VARY_HUE: readonly string[] = [
  '#2a78d6', // blue
  '#eb6834', // orange
  '#1baf7a', // aqua
  '#eda100', // yellow
  '#e87ba4', // magenta
  '#008300', // green
  '#4a3aa7', // violet
  '#e34948', // red
]

/** The same eight hues stepped for a dark canvas. */
export const VARY_HUE_DARK: readonly string[] = [
  '#3987e5',
  '#d95926',
  '#199e70',
  '#c98500',
  '#d55181',
  '#008300',
  '#9085e9',
  '#e66767',
]

/** Dash patterns a wrapped slot cycles through, in this order. */
const WRAP_DASHES: readonly DashPatternName[] = [
  'dashed',
  'dotted',
  'dashdotted',
  'densely dashed',
  'loosely dashed',
  'densely dotted',
  'loosely dotted',
]

/** The built-in sheets. */
export const styleSheets: Readonly<Record<StyleSheetName, StyleSheet>> = {
  varyHue: { colors: VARY_HUE },
  varyHueDark: { colors: VARY_HUE_DARK },
  /** Saturated primaries — TikZ's `strong colors`. Not CVD-validated. */
  strongColors: {
    colors: ['#dc2626', '#2563eb', '#16a34a', '#d97706', '#9333ea', '#0891b2', '#db2777', '#0f172a'],
  },
  /** One hue, light to dark — for ordered series. */
  shadesOfBlue: { colors: ['#86b6ef', '#5598e7', '#2a78d6', '#1c5cab', '#104281'] },
  shadesOfRed: { colors: ['#f4a3a3', '#ec7373', '#e34948', '#b93a3a', '#8b2c2c'] },
  grayScale: { colors: ['#111827', '#374151', '#6b7280', '#9ca3af', '#d1d5db'] },
  varyDashing: { dashes: ['solid', ...WRAP_DASHES] },
  varyThickness: { widths: [0.75, 1.25, 2, 2.75, 3.5] },
  crossMarks: { marks: ['cross'] },
  oMark: { marks: ['circle'] },
  starMark: { marks: ['asterisk'] },
  dotMark: { marks: ['circleFilled'] },
}

/** Merge a {@link StyleSheetSpec} into one sheet. */
export function resolveStyleSheet(spec: StyleSheetSpec): StyleSheet {
  const parts = Array.isArray(spec) ? spec : [spec as StyleSheetName | StyleSheet]
  const merged: StyleSheet = {}
  for (const part of parts) {
    const sheet = typeof part === 'string' ? styleSheets[part as StyleSheetName] : part
    if (!sheet) {
      throw new JikzError(
        'unknown-name',
        `Unknown style sheet "${String(part)}". Known: ${Object.keys(styleSheets).join(', ')}.`
      )
    }
    Object.assign(merged, sheet)
  }
  return merged
}

/** What a sheet assigns to one series slot. */
export interface SeriesSlot {
  color?: string
  dash?: DashPatternName
  width?: number
  mark?: PlotMark
  /** True when `index` ran past the colours and the slot wrapped. */
  wrapped: boolean
}

/**
 * The slot for the series at `index`. Colours wrap with a fresh dash
 * pattern per lap; every other list wraps plainly. Marks with one
 * entry apply to every slot.
 */
export function slotOf(sheet: StyleSheet, index: number): SeriesSlot {
  const at = <T>(list: readonly T[] | undefined): T | undefined =>
    list && list.length ? list[index % list.length] : undefined
  const slot: SeriesSlot = {
    color: at(sheet.colors),
    dash: at(sheet.dashes),
    width: at(sheet.widths),
    mark: at(sheet.marks),
    wrapped: false,
  }
  const n = sheet.colors?.length ?? 0
  if (n > 0 && index >= n) {
    slot.wrapped = true
    if (!sheet.dashes) slot.dash = WRAP_DASHES[(Math.floor(index / n) - 1) % WRAP_DASHES.length]
  }
  return slot
}

/** Warn once per frame when a sheet wraps. */
export function warnWrapped(index: number, n: number): void {
  warn(
    `dataviz: series ${index + 1} wraps the ${n}-colour style sheet — it repeats slot ${(index % n) + 1} with a dash pattern. Fewer series, or small multiples, read better.`
  )
}
