/**
 * Text measurement for auto-sizing nodes.
 *
 * Two backends:
 *
 *   - Browser: an offscreen `<canvas>` 2D context's `measureText`,
 *     which gives real advance widths for the actual font. The canvas
 *     is created lazily and cached; no DOM attachment required.
 *   - Node / fallback: a font-metrics approximation — average advance
 *     width per font family as a fraction of the em size. Coarse by
 *     design (proportional fonts vary per glyph); treat the result as
 *     an estimate, not a layout guarantee.
 *
 * Multi-line text (`\n`) is supported: width is the widest line,
 * height scales with line count.
 */

export interface TextMeasureOptions {
  /** CSS font family stack (default: 'sans-serif') */
  fontFamily?: string
  /** Font size in px (default: 14) */
  fontSize?: number
  /** Font weight (default: 'normal') */
  fontWeight?: string
}

/**
 * Measured text extents: `width` is the advance width of the widest
 * line, `height` is `lines × fontSize × {@link LINE_HEIGHT}`.
 */
export interface TextMetrics {
  width: number
  height: number
}

/** Line height as a multiple of the font size (both backends). */
export const LINE_HEIGHT = 1.25

/**
 * Average advance width per glyph as a fraction of font-size, by
 * generic family. Values are typical mixed-text averages (Arial /
 * Times / Courier ballparks).
 */
const FAMILY_WIDTH_RATIO: Record<string, number> = {
  monospace: 0.6,
  serif: 0.53,
  'sans-serif': 0.55,
}

const DEFAULT_RATIO = 0.55

function ratioFor(family: string): number {
  const f = family.toLowerCase()
  if (f.includes('mono')) return FAMILY_WIDTH_RATIO.monospace!
  if (f.includes('serif') && !f.includes('sans')) return FAMILY_WIDTH_RATIO.serif!
  if (f.includes('sans')) return FAMILY_WIDTH_RATIO['sans-serif']!
  return DEFAULT_RATIO
}

// ─────────────────────────────────────────────────────────────────────────────
// Canvas backend (browser)
// ─────────────────────────────────────────────────────────────────────────────

let cachedCtx: CanvasRenderingContext2D | null | undefined

function getCanvasContext(): CanvasRenderingContext2D | null {
  if (cachedCtx !== undefined) return cachedCtx
  cachedCtx = null
  try {
    if (typeof document !== 'undefined') {
      cachedCtx = document.createElement('canvas').getContext('2d')
    }
  } catch {
    cachedCtx = null
  }
  return cachedCtx
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Measure text extents. Uses canvas measurement in the browser and a
 * font-metrics table elsewhere. `width` is the advance width of the
 * widest line; `height` is `lines × fontSize × 1.25`.
 */
export function measureText(
  text: string,
  options: TextMeasureOptions = {}
): TextMetrics {
  const fontSize = options.fontSize ?? 14
  const fontFamily = options.fontFamily ?? 'sans-serif'
  const fontWeight = options.fontWeight ?? 'normal'
  const lines = text.split('\n')

  const ctx = getCanvasContext()
  let width: number

  if (ctx) {
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
    width = Math.max(...lines.map((l) => ctx.measureText(l).width))
  } else {
    const ratio = ratioFor(fontFamily)
    const maxLen = Math.max(...lines.map((l) => l.length), 0)
    width = maxLen * fontSize * ratio
  }

  return {
    width,
    height: lines.length * fontSize * LINE_HEIGHT,
  }
}
