/**
 * Text measurement for auto-sizing nodes, labels and fitted viewBoxes.
 *
 * **Deterministic by default.** The same text, font and size measure the
 * same in Node, a worker and the browser, because the default backend is
 * a built-in metrics table rather than the host's font engine. That
 * matters because `measureText` feeds node auto-sizing and `{ fit: true }`
 * viewBoxes: when a picture is rendered server-side and re-rendered on the
 * client, a host-dependent measurement makes the diagram reflow on
 * hydration. Earlier versions used canvas in the browser and a table in
 * Node, so SSR output and client output disagreed by construction.
 *
 * Two backends:
 *
 *   - `'metrics'` (default) — per-character advance widths from the Adobe
 *     core-14 AFM tables, scaled by font size. Exact for Helvetica, Arial
 *     and Liberation Sans (metrically compatible); for Times New Roman,
 *     Nimbus Roman and any Courier clone; and close for other faces in the
 *     same generic family. Runs identically everywhere.
 *   - `'canvas'` — an offscreen `<canvas>` 2D context's `measureText`,
 *     giving the true advance widths of whatever font the browser actually
 *     resolved. More accurate for unusual or webfont stacks, but only
 *     available in a DOM and *not* reproducible outside one — opt in with
 *     {@link setTextMeasurementBackend} only if you never measure outside
 *     the browser.
 *
 * Multi-line text (`\n`) is supported: width is the widest line, height
 * scales with line count.
 */

import { warn } from '../core/errors'
/** Which measurement strategy {@link measureText} uses. */
export type TextMeasurementBackend = 'metrics' | 'canvas'

export interface TextMeasureOptions {
  /** CSS font family stack (default: 'sans-serif') */
  fontFamily?: string
  /** Font size in px (default: 14) */
  fontSize?: number
  /** Font weight (default: 'normal'); 'bold' widens proportional faces. */
  fontWeight?: string
  /**
   * Override the module-wide backend for this one call. Prefer
   * {@link setTextMeasurementBackend} — internal callers (node
   * auto-sizing, label placement) do not thread this through.
   */
  backend?: TextMeasurementBackend
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

// ─────────────────────────────────────────────────────────────────────────────
// Metrics backend
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Advance widths in 1/1000 em for ASCII 32–126, from the Adobe core-14
 * AFM metrics. Index is `charCode - 32`.
 *
 * Helvetica's table also serves Arial and Liberation Sans, which are
 * metrically compatible with it by design; Times-Roman's serves Times New
 * Roman and Nimbus Roman. Courier is monospaced, so every glyph is 600.
 */
const FIRST_CHAR = 32
const LAST_CHAR = 126

const HELVETICA: readonly number[] = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556,
  278, 278, 584, 584, 584, 556, 1015,
  667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667,
  778, 722, 667, 611, 722, 667, 944, 667, 667, 611,
  278, 278, 278, 469, 556, 333,
  556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556,
  556, 333, 500, 278, 556, 500, 722, 500, 500, 500,
  334, 260, 334, 584,
]

const TIMES: readonly number[] = [
  250, 333, 408, 500, 500, 833, 778, 180, 333, 333, 500, 564, 250, 333, 250, 278,
  500, 500, 500, 500, 500, 500, 500, 500, 500, 500,
  278, 278, 564, 564, 564, 444, 921,
  722, 667, 667, 722, 611, 556, 722, 722, 333, 389, 722, 611, 889, 722, 722, 556,
  722, 667, 556, 611, 722, 722, 944, 722, 722, 611,
  333, 278, 333, 469, 500, 333,
  444, 500, 444, 500, 444, 333, 500, 500, 278, 278, 500, 278, 778, 500, 500, 500,
  500, 333, 389, 278, 500, 500, 722, 500, 500, 444,
  480, 200, 480, 541,
]

const COURIER_WIDTH = 600

/**
 * Bold advance widths are close to regular for most glyphs but not equal;
 * rather than ship a second table per family, proportional faces get a
 * flat multiplier (Helvetica-Bold and Times-Bold both average ~5% wider
 * than their regular cuts over mixed text). Monospace bold is identical
 * by definition, so it is excluded.
 */
const BOLD_WIDTH_FACTOR = 1.05

/**
 * Fallback for code points outside the ASCII table. Full-width forms —
 * CJK ideographs, kana, Hangul, full-width punctuation — advance a whole
 * em; everything else falls back to the family's mean ASCII width, which
 * is the best a table like this can say about, say, Cyrillic.
 */
const FULL_WIDTH = 1000

function isFullWidth(code: number): boolean {
  return (
    (code >= 0x1100 && code <= 0x115f) || // Hangul Jamo
    (code >= 0x2e80 && code <= 0xa4cf) || // CJK radicals … Yi
    (code >= 0xac00 && code <= 0xd7a3) || // Hangul syllables
    (code >= 0xf900 && code <= 0xfaff) || // CJK compatibility ideographs
    (code >= 0xfe30 && code <= 0xfe6f) || // CJK compatibility forms
    (code >= 0xff00 && code <= 0xff60) || // full-width forms
    (code >= 0xffe0 && code <= 0xffe6)
  )
}

interface FamilyMetrics {
  /** Per-character widths, or null for a fixed-width family. */
  widths: readonly number[] | null
  /** Width used for every glyph when `widths` is null. */
  fixed: number
  /** Mean ASCII width, used for characters the table does not cover. */
  mean: number
  /** Whether bold widens this family. */
  proportional: boolean
}

function meanOf(widths: readonly number[]): number {
  let total = 0
  for (const w of widths) total += w
  return total / widths.length
}

const SANS: FamilyMetrics = {
  widths: HELVETICA,
  fixed: 0,
  mean: meanOf(HELVETICA),
  proportional: true,
}
const SERIF: FamilyMetrics = {
  widths: TIMES,
  fixed: 0,
  mean: meanOf(TIMES),
  proportional: true,
}
const MONO: FamilyMetrics = {
  widths: null,
  fixed: COURIER_WIDTH,
  mean: COURIER_WIDTH,
  proportional: false,
}

/**
 * Pick a metrics table from a CSS font-family stack. Only the generic
 * family is resolved — a stack naming an unknown face is measured with
 * its generic sibling's table, which is why the result is an estimate for
 * anything but the metric-compatible faces named on {@link HELVETICA}.
 */
function metricsFor(family: string): FamilyMetrics {
  const f = family.toLowerCase()
  if (f.includes('mono') || f.includes('courier') || f.includes('consolas')) return MONO
  if (f.includes('sans')) return SANS
  if (f.includes('serif') || f.includes('times') || f.includes('georgia')) return SERIF
  return SANS
}

/** Advance width of one line, in 1/1000 em. */
function lineWidth(line: string, metrics: FamilyMetrics): number {
  let total = 0
  for (const ch of line) {
    const code = ch.codePointAt(0)!
    if (metrics.widths === null) {
      total += metrics.fixed
    } else if (code >= FIRST_CHAR && code <= LAST_CHAR) {
      total += metrics.widths[code - FIRST_CHAR]!
    } else if (isFullWidth(code)) {
      total += FULL_WIDTH
    } else {
      total += metrics.mean
    }
  }
  return total
}

function measureByMetrics(
  lines: string[],
  fontSize: number,
  fontFamily: string,
  fontWeight: string
): number {
  const metrics = metricsFor(fontFamily)
  const bold = metrics.proportional && isBold(fontWeight)
  const scale = (fontSize / 1000) * (bold ? BOLD_WIDTH_FACTOR : 1)

  let widest = 0
  for (const line of lines) {
    widest = Math.max(widest, lineWidth(line, metrics))
  }
  return widest * scale
}

function isBold(fontWeight: string): boolean {
  const w = fontWeight.trim().toLowerCase()
  if (w === 'bold' || w === 'bolder') return true
  const numeric = Number(w)
  return Number.isFinite(numeric) && numeric >= 600
}

// ─────────────────────────────────────────────────────────────────────────────
// Canvas backend (browser, opt-in)
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
// Backend selection
// ─────────────────────────────────────────────────────────────────────────────

let backend: TextMeasurementBackend = 'metrics'
let warnedAboutMissingCanvas = false

/**
 * Choose how text is measured, process-wide.
 *
 * Leave this at `'metrics'` (the default) unless every render happens in
 * a browser: `'canvas'` measures the font the browser actually resolved,
 * but produces different numbers than a Node or worker render of the same
 * picture, which makes SSR output reflow on hydration.
 *
 * @example
 * ```typescript
 * // Browser-only app with a webfont whose metrics differ from Helvetica:
 * setTextMeasurementBackend('canvas')
 * ```
 */
export function setTextMeasurementBackend(next: TextMeasurementBackend): void {
  backend = next
}

/** The backend {@link measureText} currently uses. */
export function getTextMeasurementBackend(): TextMeasurementBackend {
  return backend
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Measure text extents. `width` is the advance width of the widest line;
 * `height` is `lines × fontSize × 1.25`.
 *
 * Deterministic across Node, workers and the browser unless the canvas
 * backend has been selected — see {@link setTextMeasurementBackend}.
 */
export function measureText(
  text: string,
  options: TextMeasureOptions = {}
): TextMetrics {
  const fontSize = options.fontSize ?? 14
  const fontFamily = options.fontFamily ?? 'sans-serif'
  const fontWeight = options.fontWeight ?? 'normal'
  const lines = text.split('\n')

  let width: number
  if ((options.backend ?? backend) === 'canvas') {
    const ctx = getCanvasContext()
    if (ctx) {
      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
      width = Math.max(...lines.map((l) => ctx.measureText(l).width))
    } else {
      if (!warnedAboutMissingCanvas) {
        warnedAboutMissingCanvas = true
        warn(
          'jikz: the canvas text-measurement backend needs a DOM; falling ' +
            'back to the metrics table. Measurements here will not match a ' +
            'browser render that uses canvas.'
        )
      }
      width = measureByMetrics(lines, fontSize, fontFamily, fontWeight)
    }
  } else {
    width = measureByMetrics(lines, fontSize, fontFamily, fontWeight)
  }

  return {
    width,
    height: lines.length * fontSize * LINE_HEIGHT,
  }
}
