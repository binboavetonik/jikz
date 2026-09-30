/**
 * Pie and donut charts — the one non-Cartesian chart worth having.
 * Slices take their colours from a style sheet, sit on a 2px canvas
 * gap, and label themselves inside when there is room.
 *
 * ```ts
 * pie(pic, {
 *   at: point(120, 120), radius: 90, innerRadius: 45,
 *   slices: [{ value: 42, label: 'search' }, { value: 31, label: 'direct' }, { value: 27, label: 'referral' }],
 *   labels: 'percent',
 * })
 * ```
 */
import { point } from '../../core/Point'
import type { PointLike } from '../../core/types'
import type { ShapeSet } from '../../geometry/ShapeKind'
import type { ItemContainer } from '../../picture/Container'
import type { StyleSpec } from '../../render/StyleMapper'
import type { TextStyle } from '../../text/Label'
import { pathFromSVG } from '../../path/svgPath'
import { resolveStyleSheet, slotOf, type StyleSheetSpec } from './stylesheet'
import { formatTick } from './scale'

/** One slice of a {@link pie}. */
export interface PieSlice {
  /** Its size; non-positive slices are skipped. */
  value: number
  /** Its name — the legend label and the `'label'` text. */
  label?: string
  /** Handle for the CSS class and `data-series` (default: the label, else the index). */
  id?: string
  /** Paint (default: the style sheet's slot). */
  style?: StyleSpec
}

/** What to print on a slice. */
export type PieLabels =
  | 'percent'
  | 'value'
  | 'label'
  | false
  | ((slice: PieSlice, fraction: number) => string)

/** Options for {@link pie}. */
export interface PieOptions {
  /** Centre, in picture coords. */
  at: PointLike
  /** Outer radius, px. */
  radius: number
  /** Inner radius for a donut, px (default 0). */
  innerRadius?: number
  slices: readonly PieSlice[]
  /** Where the first slice starts, degrees clockwise from east (default -90: the top). */
  startAngle?: number
  /** Slice paint for slices without a style (default `'varyHue'`). */
  styleSheet?: StyleSheetSpec
  /** Canvas gap between slices, px (default 2; 0 for none). */
  gap?: number
  /** Text on the slices (default `'percent'`). */
  labels?: PieLabels
  /** Slices thinner than this fraction label outside the pie (default 0.08). */
  minInsideFraction?: number
  /** Label text (default: 11px; white inside, primary ink outside). */
  textStyle?: TextStyle
}

/** One drawn slice. */
export interface PieSliceResult {
  id: string
  label?: string
  value: number
  fraction: number
  /** Degrees clockwise from east. */
  startAngle: number
  endAngle: number
  /** The effective paint — what a legend swatch should show. */
  style: StyleSpec
}

/** What {@link pie} returns. */
export interface PieResult {
  slices: readonly PieSliceResult[]
  total: number
}

const RAD = Math.PI / 180

/** Snap float noise (cos 90° ≈ 6e-17) so path data prints clean. */
function snap(v: number): number {
  return Math.abs(v) < 1e-9 ? 0 : v
}

function polar(c: PointLike, r: number, deg: number): { x: number; y: number } {
  return { x: snap(c.x + r * Math.cos(deg * RAD)), y: snap(c.y + r * Math.sin(deg * RAD)) }
}

/** SVG path data for a ring sector from `a0` to `a1` degrees. */
function sectorPath(c: PointLike, r: number, ri: number, a0: number, a1: number): string {
  const sweep = a1 - a0
  const large = sweep > 180 ? 1 : 0
  const o0 = polar(c, r, a0)
  const o1 = polar(c, r, a1)
  if (ri > 0) {
    const i0 = polar(c, ri, a0)
    const i1 = polar(c, ri, a1)
    return `M ${o0.x} ${o0.y} A ${r} ${r} 0 ${large} 1 ${o1.x} ${o1.y} L ${i1.x} ${i1.y} A ${ri} ${ri} 0 ${large} 0 ${i0.x} ${i0.y} Z`
  }
  return `M ${c.x} ${c.y} L ${o0.x} ${o0.y} A ${r} ${r} 0 ${large} 1 ${o1.x} ${o1.y} Z`
}

/** A full ring (or disc): two arcs, since one arc cannot close on itself. */
function ringPath(c: PointLike, r: number, ri: number): string {
  const disc = (rr: number, sweep: 0 | 1): string => {
    const a = polar(c, rr, 0)
    const b = polar(c, rr, 180)
    return `M ${a.x} ${a.y} A ${rr} ${rr} 0 1 ${sweep} ${b.x} ${b.y} A ${rr} ${rr} 0 1 ${sweep} ${a.x} ${a.y} Z`
  }
  return ri > 0 ? `${disc(r, 1)} ${disc(ri, 0)}` : disc(r, 1)
}

/**
 * Draw a pie or donut. Returns each slice's angles and effective paint
 * — enough to build a `legend()` beside it.
 */
export function pie<S extends ShapeSet>(pic: ItemContainer<S>, options: PieOptions): PieResult {
  const {
    at,
    radius,
    innerRadius = 0,
    slices,
    startAngle = -90,
    styleSheet = 'varyHue',
    gap = 2,
    labels = 'percent',
    minInsideFraction = 0.08,
    textStyle,
  } = options
  const sheet = resolveStyleSheet(styleSheet)
  const positive = slices.filter((s) => Number.isFinite(s.value) && s.value > 0)
  const total = positive.reduce((sum, s) => sum + s.value, 0)
  const results: PieSliceResult[] = []
  if (total <= 0) return { slices: results, total: 0 }

  const format = (slice: PieSlice, fraction: number): string | undefined => {
    if (labels === false) return undefined
    if (typeof labels === 'function') return labels(slice, fraction)
    if (labels === 'value') return formatTick(slice.value)
    if (labels === 'label') return slice.label
    return `${Math.round(fraction * 100)}%`
  }

  let angle = startAngle
  positive.forEach((slice, i) => {
    const fraction = slice.value / total
    const sweep = fraction * 360
    const a0 = angle
    const a1 = angle + sweep
    angle = a1
    const slot = slotOf(sheet, i)
    const base: StyleSpec = {
      fill: slot.color ?? '#64748b',
      stroke: gap > 0 ? '#ffffff' : 'none',
      strokeWidth: gap,
    }
    const style: StyleSpec = slice.style
      ? [base, ...(Array.isArray(slice.style) ? slice.style : [slice.style])]
      : base
    const id = slice.id ?? slice.label ?? String(i)
    const safe = id.replace(/[^A-Za-z0-9_-]/g, '-')
    const full = fraction >= 0.9999
    const d = full ? ringPath(at, radius, innerRadius) : sectorPath(at, radius, innerRadius, a0, a1)
    pic.filldraw(pathFromSVG(d), {
      style,
      className: `jikz-series jikz-series-${safe} jikz-pie-slice`,
      attributes: { 'data-series': id, 'data-index': i, ...(full && innerRadius > 0 && { 'fill-rule': 'evenodd' }) },
    })
    results.push({ id, label: slice.label, value: slice.value, fraction, startAngle: a0, endAngle: a1, style })

    const text = format(slice, fraction)
    if (text) {
      const mid = (a0 + a1) / 2
      const inside = fraction >= minInsideFraction
      const r = inside ? (radius + innerRadius) / 2 : radius + 10
      const p = polar(at, r, mid)
      const cos = Math.cos(mid * RAD)
      pic.text(point(p.x, p.y), text, {
        style: { fill: inside ? '#ffffff' : '#334155', fontSize: 11, ...textStyle },
        textAnchor: inside ? 'middle' : cos > 0.2 ? 'start' : cos < -0.2 ? 'end' : 'middle',
        dominantBaseline: 'middle',
        className: `jikz-pie-label jikz-series-${safe}`,
        attributes: { 'data-series': id, 'data-index': i },
      })
    }
  })
  return { slices: results, total }
}
