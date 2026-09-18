import { JikzError } from '../core/errors'
import { Point, point } from '../core/Point'
import type { PointLike } from '../core/types'
import { parseAnchorSpec, isTextAnchor, type AnchorSpec } from '../core/Anchor'
import { degToRad } from '../utils/math'
import { measureText, type TextMeasureOptions, type TextMetrics } from './measureText'
import { isLaTeX, extractLaTeX } from '../render/MathRenderer'

/**
 * Default gap between a reference (node boundary, shape anchor) and a
 * label, px. (TikZ's initial `label distance` is 0pt; 4px reads better
 * on screen.) Re-exported from `node/Node` for compatibility.
 */
export const DEFAULT_LABEL_DISTANCE = 4

/**
 * Default font size for labels (node labels, draw labels). TikZ
 * labels inherit the surrounding font; a fixed small size reads
 * better in standalone SVG. Re-exported from `node/Node`.
 */
export const DEFAULT_LABEL_FONT_SIZE = 12

/**
 * Font-metric size estimate for label text. LaTeX (`$...$`, `\frac`,
 * …) measures as its TeX body with delimiters stripped — a rough proxy
 * for the rendered formula; exact sizing needs
 * `MathRenderer.measure` (browser-only). Centralized so labelPoint,
 * placeText, draw labels, and fit-bounds all estimate the same way.
 */
export function estimateLabelSize(
  text: string,
  options: TextMeasureOptions = {}
): TextMetrics {
  const body = isLaTeX(text) ? extractLaTeX(text).tex : text
  return measureText(body, options)
}

/**
 * Placement options for {@link placeText} and `Picture.text` — TikZ's
 * `node[<dir>] at <p>` for bare text. Same semantics as
 * {@link NodeLabel}: the direction names where the text GOES relative
 * to the reference point.
 */
export interface TextPlacement {
  /**
   * Direction FROM the reference point TO the text: compass anchor
   * ('north', 'south east', …), alias ('ne'), or degrees (screen
   * convention: 0° = east, 90° = south). Default: 'center' — text
   * centered on the point. Text anchors ('base', 'mid', …) are
   * rejected — they cannot position text relative to a point.
   */
  at?: AnchorSpec
  /**
   * Gap in px between the reference point and the text's own border,
   * measured along the placement ray (TikZ `label distance=<d>`).
   * Default: {@link DEFAULT_LABEL_DISTANCE} (4).
   */
  distance?: number
  /** Font hints for measuring the text box. */
  fontSize?: number
  fontFamily?: string
}

/**
 * Compute the center of a text label placed next to a reference point —
 * TikZ's `\node[<dir>] at <p> {<text>}` without a node. The point is a
 * zero-size boundary: the text box is pushed along the `at` ray by
 * `distance` plus half its own extent along that ray, so `distance` is
 * a point-to-border gap — the same math as {@link Node.labelPoint}
 * with a degenerate shape.
 *
 * @example
 * ```ts
 * placeText(point(100, 0), '1', { at: 'south east', distance: 4 })
 * ```
 */
export function placeText(
  reference: PointLike,
  text: string,
  placement: TextPlacement = {}
): Point {
  const spec = placement.at ?? 'center'
  if (isTextAnchor(spec)) {
    throw new JikzError('invalid-argument', 
      `placeText: '${spec}' is a text anchor and cannot position text — ` +
        `use a cardinal name, alias, angle, or 'center'.`
    )
  }
  const angle = parseAnchorSpec(spec)
  if (angle === null) return point(reference.x, reference.y)

  const { width, height } = estimateLabelSize(text, {
    fontSize: placement.fontSize ?? DEFAULT_LABEL_FONT_SIZE,
    fontFamily: placement.fontFamily,
  })
  const gap = placement.distance ?? DEFAULT_LABEL_DISTANCE

  // Push along the placement ANGLE (like Node.labelPoint); half the
  // text's extent ALONG the ray keeps `distance` a border gap.
  const rad = degToRad(angle)
  const dx = Math.cos(rad)
  const dy = Math.sin(rad)
  const halfAlongRay = (Math.abs(dx) * width + Math.abs(dy) * height) / 2

  const d = gap + halfAlongRay
  return point(reference.x + dx * d, reference.y + dy * d)
}
