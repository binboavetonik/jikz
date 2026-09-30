/**
 * Legends — TikZ `datavisualization`'s legend machinery, reduced to
 * the honest core: labeled style swatches in a grid of rows and
 * columns, optionally framed.
 *
 * ```ts
 * legend(pic, {
 *   at: point(300, 30),
 *   entries: [
 *     { label: '2025', style: { stroke: '#2563eb' }, mark: 'o' },
 *     { label: '2026', style: { fill: '#f59e0b', stroke: 'none' }, sample: 'box' },
 *   ],
 *   frame: true,
 * })
 * ```
 *
 * `chart()` places its legend for you — inside a corner or outside
 * the axes ({@link LegendPlacement}); this function takes a point.
 */
import { point } from '../../core/Point'
import type { PointLike } from '../../core/types'
import type { ShapeSet } from '../../geometry/ShapeKind'
import type { ItemContainer } from '../../picture/Container'
import type { RenderStyle, StyleSpec } from '../../render/StyleMapper'
import type { TextStyle } from '../../text/Label'
import { estimateLabelSize } from '../../text/placeText'
import { line } from '../../geometry/Line'
import { rect } from '../../geometry/Rectangle'
import type { PlotMark } from '../../geometry/PlotMark'
import { drawMarks } from './frame'

/** One legend row: a swatch plus a label. */
export interface LegendEntry {
  /** Row label. */
  label: string
  /**
   * The series this entry stands for. When set, the swatch and label
   * carry `class="jikz-legend-entry jikz-legend-<id>"` and
   * `data-series="<id>"` — the hook for hover highlight and click
   * toggles. `chart()` sets it to the series id.
   */
  id?: string
  /** Swatch paint. */
  style?: StyleSpec
  /**
   * Swatch kind: a short line (for line/scatter series) or a small
   * filled box (for bar series). Default: `'line'`.
   */
  sample?: 'line' | 'box'
  /** Scatter mark drawn at the line sample's midpoint. */
  mark?: PlotMark
}

/** How entries fill a legend grid — TikZ's `down then right` / `right then down`. */
export type LegendFillOrder = 'downThenRight' | 'rightThenDown'

/** Options for {@link legend}. */
export interface LegendOptions {
  /** North west corner of the legend in picture coords. */
  at: PointLike
  /** Rows, top to bottom. */
  entries: readonly LegendEntry[]
  /**
   * Grid shape: give `columns` or `rows` (the other follows from the
   * entry count). Default: one column.
   */
  columns?: number
  rows?: number
  /** Fill order of the grid (default `'downThenRight'`). */
  fillOrder?: LegendFillOrder
  /** Label font size (default 11). */
  fontSize?: number
  /** Label ink and font (default: slate ink at `fontSize`). */
  textStyle?: TextStyle
  /** Row pitch, px (default 18). */
  rowHeight?: number
  /** Line-sample length, px (default 22). */
  sampleLength?: number
  /** Gap between swatch and label, px (default 6). */
  gap?: number
  /** Gap between columns, px (default 14). */
  columnGap?: number
  /** Padding inside the frame, px (default 6). */
  padding?: number
  /**
   * Draw a box around the legend: `true` for the default light frame,
   * or a StyleSpec merged over it (e.g. on a dark canvas).
   */
  frame?: boolean | StyleSpec
}

/** Box-sample extent, px. */
const BOX_SAMPLE = 10
const LEGEND_TEXT: TextStyle = { fill: '#334155' }

interface ResolvedLegendOptions extends LegendOptions {
  columns: number
  rows: number
  fillOrder: LegendFillOrder
  fontSize: number
  rowHeight: number
  sampleLength: number
  gap: number
  columnGap: number
  padding: number
}

function resolve(options: LegendOptions): ResolvedLegendOptions {
  // Per-field ??, not a spread: an explicit `fontSize: undefined`
  // would otherwise DEFEAT the default (the Node shape:undefined trap).
  const n = options.entries.length
  let columns = options.columns
  let rows = options.rows
  if (columns !== undefined) {
    columns = Math.max(1, Math.floor(columns))
    rows = Math.max(1, Math.ceil(n / columns))
  } else if (rows !== undefined) {
    rows = Math.max(1, Math.floor(rows))
    columns = Math.max(1, Math.ceil(n / rows))
  } else {
    columns = 1
    rows = Math.max(1, n)
  }
  return {
    ...options,
    columns,
    rows,
    fillOrder: options.fillOrder ?? 'downThenRight',
    fontSize: options.fontSize ?? 11,
    rowHeight: options.rowHeight ?? 18,
    sampleLength: options.sampleLength ?? 22,
    gap: options.gap ?? 6,
    columnGap: options.columnGap ?? 14,
    padding: options.padding ?? 6,
  }
}

/** Grid cell of entry `i`. */
function cellOf(o: ResolvedLegendOptions, i: number): { row: number; column: number } {
  return o.fillOrder === 'downThenRight'
    ? { row: i % o.rows, column: Math.floor(i / o.rows) }
    : { row: Math.floor(i / o.columns), column: i % o.columns }
}

/** Width of each column: swatch, gap, and its widest label. */
function columnWidths(o: ResolvedLegendOptions): number[] {
  const widths = new Array<number>(o.columns).fill(0)
  o.entries.forEach((e, i) => {
    const { column } = cellOf(o, i)
    const w = estimateLabelSize(e.label, { fontSize: o.fontSize }).width
    widths[column] = Math.max(widths[column]!, w)
  })
  return widths.map((w) => o.sampleLength + o.gap + w)
}

/**
 * The size a legend with these options will occupy — for positioning
 * it relative to a plot area (`chart()` uses this for its placements).
 */
export function legendSize(
  options: Omit<LegendOptions, 'at'> & { at?: PointLike }
): { width: number; height: number } {
  const o = resolve({ at: { x: 0, y: 0 }, ...options })
  const widths = columnWidths(o)
  return {
    width: o.padding * 2 + widths.reduce((a, b) => a + b, 0) + o.columnGap * (o.columns - 1),
    height: o.padding * 2 + o.rows * o.rowHeight,
  }
}

/**
 * Draw a legend into a picture. Entries fill a grid from `at` (one
 * column unless `columns`/`rows` say otherwise); with `frame` set a
 * box wraps the whole legend (painted first, so swatches sit on top)
 * — `true` for the default light frame, or a StyleSpec merged over it.
 */
export function legend<S extends ShapeSet>(
  pic: ItemContainer<S>,
  options: LegendOptions
): void {
  const o = resolve(options)
  const { width, height } = legendSize(options)
  const widths = columnWidths(o)
  const columnX: number[] = []
  let cx = o.at.x + o.padding
  for (const w of widths) {
    columnX.push(cx)
    cx += w + o.columnGap
  }
  const text: TextStyle = { ...LEGEND_TEXT, ...o.textStyle, fontSize: o.fontSize }

  if (o.frame) {
    const base: Partial<RenderStyle> = { fill: '#ffffff', stroke: '#cbd5e1', strokeWidth: 1 }
    const frameStyle: StyleSpec =
      typeof o.frame === 'object'
        ? Array.isArray(o.frame)
          ? [base, ...o.frame]
          : [base, o.frame]
        : base
    pic.filldraw(rect(o.at.x, o.at.y, width, height), { style: frameStyle })
  }

  o.entries.forEach((entry, i) => {
    const { row, column } = cellOf(o, i)
    const cy = o.at.y + o.padding + row * o.rowHeight + o.rowHeight / 2
    const sx0 = columnX[column]!
    const sx1 = sx0 + o.sampleLength
    const tag = entry.id
      ? {
          className: `jikz-legend-entry jikz-legend-${entry.id.replace(/[^A-Za-z0-9_-]/g, '-')}`,
          attributes: { 'data-series': entry.id },
        }
      : {}

    if (entry.sample === 'box') {
      pic.filldraw(
        rect(sx0 + (o.sampleLength - BOX_SAMPLE) / 2, cy - BOX_SAMPLE / 2, BOX_SAMPLE, BOX_SAMPLE),
        { style: entry.style ?? { fill: '#64748b', stroke: 'none' }, ...tag }
      )
    } else {
      pic.draw(line(point(sx0, cy), point(sx1, cy)), {
        style: entry.style ?? { stroke: '#0f172a', strokeWidth: 2 },
        ...tag,
      })
      if (entry.mark) {
        drawMarks(pic, [point((sx0 + sx1) / 2, cy)], { name: entry.mark }, entry.style, tag)
      }
    }

    pic.text(point(sx1 + o.gap, cy), entry.label, {
      style: text,
      textAnchor: 'start',
      dominantBaseline: 'middle',
      ...tag,
    })
  })
}
