/**
 * Legends — TikZ `datavisualization`'s legend machinery, reduced to
 * the honest core: labeled style swatches in a vertical list, optionally
 * framed.
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
 */
import { point } from '../../core/Point'
import type { PointLike } from '../../core/types'
import type { ShapeSet } from '../../geometry/ShapeKind'
import type { ItemContainer } from '../../picture/Container'
import type { StyleSpec } from '../../render/StyleMapper'
import { estimateLabelSize } from '../../text/placeText'
import { line } from '../../geometry/Line'
import { rect } from '../../geometry/Rectangle'
import type { PlotMark } from '../../geometry/PlotMark'
import { drawMarks } from './frame'

/** One legend row: a swatch plus a label. */
export interface LegendEntry {
  /** Row label. */
  label: string
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

/** Options for {@link legend}. */
export interface LegendOptions {
  /** North west corner of the legend in picture coords. */
  at: PointLike
  /** Rows, top to bottom. */
  entries: readonly LegendEntry[]
  /** Label font size (default 11). */
  fontSize?: number
  /** Row pitch, px (default 18). */
  rowHeight?: number
  /** Line-sample length, px (default 22). */
  sampleLength?: number
  /** Gap between swatch and label, px (default 6). */
  gap?: number
  /** Padding inside the frame, px (default 6). */
  padding?: number
  /** Draw a light box around the legend. */
  frame?: boolean
}

/** Box-sample extent, px. */
const BOX_SAMPLE = 10

interface ResolvedLegendOptions extends LegendOptions {
  fontSize: number
  rowHeight: number
  sampleLength: number
  gap: number
  padding: number
}

function resolve(options: LegendOptions): ResolvedLegendOptions {
  return {
    fontSize: 11,
    rowHeight: 18,
    sampleLength: 22,
    gap: 6,
    padding: 6,
    ...options,
  }
}

/**
 * The size a legend with these options will occupy — for positioning
 * it relative to a plot area (`chart()` uses this for its default
 * north-east placement).
 */
export function legendSize(
  options: Omit<LegendOptions, 'at'> & { at?: PointLike }
): { width: number; height: number } {
  const o = resolve({ at: { x: 0, y: 0 }, ...options })
  const labelWidth = Math.max(
    0,
    ...o.entries.map(
      (e) => estimateLabelSize(e.label, { fontSize: o.fontSize }).width
    )
  )
  return {
    width: o.padding * 2 + o.sampleLength + o.gap + labelWidth,
    height: o.padding * 2 + o.entries.length * o.rowHeight,
  }
}

/**
 * Draw a legend into a picture. Rows paint top to bottom from `at`;
 * with `frame: true` a light box wraps the whole legend (painted
 * first, so swatches sit on top).
 */
export function legend<S extends ShapeSet>(
  pic: ItemContainer<S>,
  options: LegendOptions
): void {
  const o = resolve(options)
  const { width, height } = legendSize(options)

  if (o.frame) {
    pic.filldraw(rect(o.at.x, o.at.y, width, height), {
      style: { fill: '#ffffff', stroke: '#cbd5e1', strokeWidth: 1 },
    })
  }

  o.entries.forEach((entry, i) => {
    const cy = o.at.y + o.padding + i * o.rowHeight + o.rowHeight / 2
    const sx0 = o.at.x + o.padding
    const sx1 = sx0 + o.sampleLength

    if (entry.sample === 'box') {
      pic.filldraw(
        rect(sx0 + (o.sampleLength - BOX_SAMPLE) / 2, cy - BOX_SAMPLE / 2, BOX_SAMPLE, BOX_SAMPLE),
        { style: entry.style ?? { fill: '#64748b', stroke: 'none' } }
      )
    } else {
      pic.draw(line(point(sx0, cy), point(sx1, cy)), {
        style: entry.style ?? { stroke: '#000000' },
      })
      if (entry.mark) {
        drawMarks(
          pic,
          [point((sx0 + sx1) / 2, cy)],
          { name: entry.mark },
          entry.style
        )
      }
    }

    pic.text(point(sx1 + o.gap, cy), entry.label, {
      fontSize: o.fontSize,
      textAnchor: 'start',
      dominantBaseline: 'middle',
    })
  })
}
