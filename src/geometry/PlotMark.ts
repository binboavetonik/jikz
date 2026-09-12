/**
 * Plot marks — scatter-point markers for data plots (TikZ `plotmarks`).
 *
 * Each mark is SVG path data centered on the origin and fitting in a
 * `size × size` box. Open marks are stroked; `*Filled` marks are
 * filled. The renderer paints marks with the plot's resolved stroke
 * color, so a mark inherits the line color unless the caller overrides
 * it.
 *
 * TikZ spellings are accepted as aliases: `*` = `asterisk`, `+` =
 * `plus`, `x`/`X` = `cross`, `o` = `circle`.
 */

export type PlotMark =
  | 'none'
  | 'asterisk'        // * — six spokes
  | '*'               // Alias for 'asterisk'
  | 'plus'            // +
  | '+'               // Alias for 'plus'
  | 'cross'           // ×
  | 'x'               // Alias for 'cross'
  | 'X'               // Alias for 'cross'
  | 'circle'          // o (open)
  | 'o'               // Alias for 'circle'
  | 'circleFilled'
  | 'square'
  | 'squareFilled'
  | 'triangle'
  | 'triangleFilled'
  | 'diamond'
  | 'diamondFilled'
  | 'pentagon'
  | 'pentagonFilled'
  | 'oplus'           // circle with a plus
  | 'otimes'          // circle with a cross

/**
 * Marker configuration for a {@link Plot}.
 */
export interface PlotMarkSpec {
  name: PlotMark
  /** Mark extent in px (default 5). */
  size?: number
  /** Draw every Nth point (default 1 = every point). */
  every?: number
}

/** Canonical mark names (aliases excluded), for introspection. */
export const PLOT_MARK_NAMES: readonly PlotMark[] = [
  'asterisk',
  'plus',
  'cross',
  'circle',
  'circleFilled',
  'square',
  'squareFilled',
  'triangle',
  'triangleFilled',
  'diamond',
  'diamondFilled',
  'pentagon',
  'pentagonFilled',
  'oplus',
  'otimes',
]

/** Marks painted with fill rather than stroke. */
const FILLED_MARKS = new Set<PlotMark>([
  'circleFilled',
  'squareFilled',
  'triangleFilled',
  'diamondFilled',
  'pentagonFilled',
])

/** Whether a mark name is painted with fill (vs stroke). */
export function plotMarkFilled(name: string): boolean {
  return FILLED_MARKS.has(normalizePlotMark(name) as PlotMark)
}

const DEG = Math.PI / 180

function normalizePlotMark(name: string): string {
  switch (name) {
    case '*': return 'asterisk'
    case '+': return 'plus'
    case 'x':
    case 'X': return 'cross'
    case 'o': return 'circle'
    default: return name
  }
}

function fmt(n: number): string {
  return Math.abs(n) < 1e-9 ? '0' : Number(n.toFixed(3)).toString()
}

/** Regular n-gon outline centered on the origin, circumradius `r`. */
function polygonPath(r: number, n: number, startDeg: number): string {
  const pts: string[] = []
  for (let i = 0; i < n; i++) {
    const a = (startDeg + (i * 360) / n) * DEG
    pts.push(`${fmt(Math.cos(a) * r)} ${fmt(Math.sin(a) * r)}`)
  }
  return `M ${pts.join(' L ')} Z`
}

/** Full circle centered on the origin (two 180° arcs, same sweep). */
function circlePath(r: number): string {
  return `M ${r} 0 A ${r} ${r} 0 1 0 ${-r} 0 A ${r} ${r} 0 1 0 ${r} 0 Z`
}

/**
 * SVG path data for a plot mark centered on the origin, fitting a
 * `size × size` box. Returns '' for `none` and unknown names.
 */
export function plotMarkPath(name: string, size = 5): string {
  const r = size / 2

  switch (normalizePlotMark(name)) {
    case 'none':
      return ''
    case 'asterisk': {
      const c = fmt(r * Math.cos(60 * DEG))
      const s = fmt(r * Math.sin(60 * DEG))
      return `M 0 ${-r} L 0 ${r} M ${-c} ${-s} L ${c} ${s} M ${c} ${-s} L ${-c} ${s}`
    }
    case 'plus':
      return `M ${-r} 0 L ${r} 0 M 0 ${-r} L 0 ${r}`
    case 'cross':
      return `M ${-r} ${-r} L ${r} ${r} M ${r} ${-r} L ${-r} ${r}`
    case 'circle':
    case 'circleFilled':
      return circlePath(r)
    case 'square':
    case 'squareFilled':
      return `M ${-r} ${-r} L ${r} ${-r} L ${r} ${r} L ${-r} ${r} Z`
    case 'triangle':
    case 'triangleFilled':
      return polygonPath(r, 3, -90)
    case 'diamond':
    case 'diamondFilled':
      return polygonPath(r, 4, -90)
    case 'pentagon':
    case 'pentagonFilled':
      return polygonPath(r, 5, -90)
    case 'oplus':
      return `${circlePath(r)} M ${-r} 0 L ${r} 0 M 0 ${-r} L 0 ${r}`
    case 'otimes':
      return `${circlePath(r)} M ${-r} ${-r} L ${r} ${r} M ${r} ${-r} L ${-r} ${r}`
    default:
      return ''
  }
}
