/**
 * Lengths. jikz coordinates are pixels; TikZ writes `2cm`, `10pt`,
 * `3mm`. These convert at 96 px per inch, the CSS reference pixel —
 * so `cm(1)` is what a browser shows as one centimetre.
 *
 * `pt` is TeX's point (1/72.27 in), which is what a TikZ source means
 * by `pt`; `bp` is the PostScript/CSS "big point" (1/72 in).
 */
import { JikzError } from './errors'

export const PX_PER_INCH = 96
export const PX_PER_CM = PX_PER_INCH / 2.54
export const PX_PER_MM = PX_PER_CM / 10
export const PX_PER_PT = PX_PER_INCH / 72.27
export const PX_PER_BP = PX_PER_INCH / 72

/** Centimetres to px. */
export const cm = (v: number): number => v * PX_PER_CM
/** Millimetres to px. */
export const mm = (v: number): number => v * PX_PER_MM
/** Inches to px. */
export const inch = (v: number): number => v * PX_PER_INCH
/** TeX points to px. */
export const pt = (v: number): number => v * PX_PER_PT
/** Big points (1/72 in) to px. */
export const bp = (v: number): number => v * PX_PER_BP

const UNITS: Record<string, number> = {
  cm: PX_PER_CM,
  mm: PX_PER_MM,
  in: PX_PER_INCH,
  pt: PX_PER_PT,
  bp: PX_PER_BP,
  px: 1,
}

/**
 * A TikZ length to px: `'2cm'`, `'10pt'`, `'3mm'`, `'1in'`, `'12px'`,
 * or a bare number (already px). Whitespace between number and unit
 * is fine; an unknown unit throws.
 */
export function length(spec: string | number): number {
  if (typeof spec === 'number') return spec
  const m = spec.trim().match(/^(-?\d*\.?\d+)\s*([a-z]*)$/i)
  if (!m) {
    throw new JikzError('invalid-argument', `length: cannot parse "${spec}" (expected e.g. "2cm", "10pt", "3mm").`)
  }
  const unit = (m[2] ?? '').toLowerCase()
  const factor = unit === '' ? 1 : UNITS[unit]
  if (factor === undefined) {
    throw new JikzError(
      'invalid-argument',
      `length: unknown unit "${m[2]}" in "${spec}" (known: ${Object.keys(UNITS).join(', ')}).`
    )
  }
  return parseFloat(m[1]!) * factor
}
