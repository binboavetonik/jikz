/**
 * Colours the way TikZ writes them.
 *
 * xcolor's expression syntax mixes named colours by percentage:
 * `blue!30` is 30% blue over white, `blue!30!black` 30% blue over
 * black, and `a!p!b!q!c` chains left to right. {@link color} evaluates
 * such an expression to a hex string; {@link mix} is the operation
 * underneath. The 19 xcolor base colours are in {@link xcolor}.
 */
import { JikzError } from './errors'

/** xcolor's base colours, as hex. */
export const xcolor: Readonly<Record<string, string>> = Object.freeze({
  red: '#ff0000',
  green: '#00ff00',
  blue: '#0000ff',
  cyan: '#00ffff',
  magenta: '#ff00ff',
  yellow: '#ffff00',
  black: '#000000',
  gray: '#808080',
  white: '#ffffff',
  darkgray: '#404040',
  lightgray: '#bfbfbf',
  brown: '#bf8040',
  lime: '#bfff00',
  olive: '#808000',
  orange: '#ff8000',
  pink: '#ffbfbf',
  purple: '#bf0040',
  teal: '#008080',
  violet: '#800080',
})

export interface RGB {
  r: number
  g: number
  b: number
}

/**
 * Parse a colour to RGB: `#rgb`, `#rrggbb`, `rgb(r, g, b)`, an xcolor
 * base name, or a name registered with {@link defineColor}.
 */
export function parseColor(spec: string): RGB {
  const s = spec.trim()
  const named = defined[s.toLowerCase()] ?? xcolor[s.toLowerCase()]
  if (named) return parseColor(named)
  let m = s.match(/^#([0-9a-f]{3})$/i)
  if (m) {
    const h = m[1]!
    return { r: parseInt(h[0]! + h[0]!, 16), g: parseInt(h[1]! + h[1]!, 16), b: parseInt(h[2]! + h[2]!, 16) }
  }
  m = s.match(/^#([0-9a-f]{6})$/i)
  if (m) {
    const h = m[1]!
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) }
  }
  m = s.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i)
  if (m) return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) }
  throw new JikzError(
    'invalid-argument',
    `color: cannot parse "${spec}" (expected #hex, rgb(), an xcolor name, or a defineColor() name).`
  )
}

/** RGB to `#rrggbb`. */
export function toHex({ r, g, b }: RGB): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

/**
 * Mix two colours: `weight` is the share of `a`, so `mix('blue',
 * 'white', 0.3)` is xcolor's `blue!30` and `mix(a, b, 0.5)` the
 * midpoint. Mixed in RGB, as xcolor mixes rgb-model colours.
 */
export function mix(a: string, b: string, weight: number): string {
  const w = Math.max(0, Math.min(1, weight))
  const p = parseColor(a)
  const q = parseColor(b)
  return toHex({
    r: p.r * w + q.r * (1 - w),
    g: p.g * w + q.g * (1 - w),
    b: p.b * w + q.b * (1 - w),
  })
}

const defined: Record<string, string> = {}

/**
 * Name a colour — xcolor's `\definecolor` / `\colorlet`. The value may
 * itself be an expression. Names are case-insensitive and resolve
 * before the xcolor base names.
 */
export function defineColor(name: string, spec: string): string {
  const hex = color(spec)
  defined[name.toLowerCase()] = hex
  return hex
}

/**
 * Evaluate an xcolor expression to `#rrggbb`: a colour, `a!p` (p% of
 * `a` over white), `a!p!b`, or a chain `a!p!b!q!c` evaluated left to
 * right. Plain colours (`'#2563eb'`, `'blue'`, `'rgb(0,0,255)'`) pass
 * through to hex.
 */
export function color(expr: string): string {
  const parts = expr.split('!').map((s) => s.trim())
  if (parts.length === 1) return toHex(parseColor(parts[0]!))
  let acc = toHex(parseColor(parts[0]!))
  for (let i = 1; i < parts.length; i += 2) {
    const pct = Number(parts[i])
    if (!Number.isFinite(pct)) {
      throw new JikzError('invalid-argument', `color: "${expr}" — expected a percentage after "!", got "${parts[i]}".`)
    }
    const other = parts[i + 1] ?? 'white'
    acc = mix(acc, other, pct / 100)
  }
  return acc
}
