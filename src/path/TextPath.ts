/**
 * Text along a path — jikz's analogue of TikZ's `decorations.text`
 * (`\draw decorate { (0,0) .. controls .. { text along path } };`).
 *
 * Rendering is SVG-native: the guide path goes into `<defs>` and the
 * text rides it via `<textPath href="…" startOffset="…%">`, so output
 * stays a pure string (Node-safe) and text remains selectable, crisp
 * type at every zoom — no per-glyph placement.
 *
 * ```ts
 * pic.draw(textAlongPath(arcPath, 'around the bend', {
 *   anchor: 'middle',
 *   fontSize: 12,
 * }))
 * ```
 *
 * Plain text only — KaTeX formulas cannot flow along a curve
 * (foreignObject is rectangular); use a straight `pic.text` for math.
 */
import type { Point } from '../core/Point'
import { Path, polylinePath } from './Path'
import { toPath, type PathLike } from './PathLike'

/**
 * Options for {@link textAlongPath}.
 */
export interface TextPathOptions {
  /**
   * Where along the path the text starts, fraction 0–1. Default: 0 —
   * or derived from {@link anchor} when one is given (`middle` → 0.5,
   * `end` → 1), which is the TikZ idiom for centered text.
   */
  startOffset?: number
  /**
   * Alignment of the text around {@link startOffset}. With no explicit
   * `startOffset`, `middle` centers the text on the path midpoint.
   */
  anchor?: 'start' | 'middle' | 'end'
  /**
   * Which side of the path the text sits on. The default `'left'`
   * follows the path direction (SVG textPath behavior); `'right'`
   * walks the path backwards, flipping the text to the other side —
   * TikZ's `text along path` on the reverse side.
   */
  side?: 'left' | 'right'
  fontSize?: number
  fontFamily?: string
  fontWeight?: 'normal' | 'bold' | number
  /**
   * Text color. Defaults to the resolved stroke — jikz's text-color
   * convention (`pic.draw(tp, { style: { stroke: 'navy' } })`).
   */
  color?: string
  /** Extra space between glyphs, px. */
  letterSpacing?: number
}

/** Samples for the reversed guide path used by `side: 'right'`. */
const REVERSE_SAMPLES = 100

/**
 * Reverse a path for `side: 'right'` by dense resampling. Path.reverse
 * only handles M/L/C segments (arcs and quadratics are dropped), and
 * a guide path never needs curve exactness — it is invisible — so a
 * 100-sample polyline is both simpler and total.
 */
function reversedGuide(p: Path): Path {
  const pts: Point[] = []
  for (let i = REVERSE_SAMPLES; i >= 0; i--) {
    pts.push(p.pointAt(i / REVERSE_SAMPLES))
  }
  return polylinePath(pts)
}

/**
 * A path plus text riding it — what {@link textAlongPath} returns. The base
 * path itself is never painted (it is a guide, like TikZ's decorated
 * path being replaced by the text); `pic.draw` it alongside a stroked
 * copy of the path when you want both.
 */
export class TextPath {
  readonly kind = 'textPath' as const

  /** The guide path (already reversed for `side: 'right'`). */
  readonly path: Path

  constructor(path: Path, readonly text: string, readonly options: TextPathOptions = {}) {
    this.path = options.side === 'right' ? reversedGuide(path) : path
  }

  /** SVG path data of the guide (the renderer puts it in `<defs>`). */
  toSVGPath(): string {
    return this.path.toSVGPath()
  }

  /**
   * Bounding box of the guide path. Glyphs extend roughly one font
   * size off the guide — pad the viewBox in fit mode to cover them.
   */
  get bounds(): [number, number, number, number] {
    return this.path.bounds
  }
}

/**
 * Flow text along a path.
 *
 * @example
 * ```ts
 * // TikZ: \draw decorate[decoration={text along path, text={hello}}] { (0,0) -- (3,0) };
 * pic.draw(textAlongPath(p, 'hello'))
 *
 * // centered on the path, custom look
 * pic.draw(textAlongPath(p, 'centered', { anchor: 'middle', fontSize: 11 }))
 * ```
 */
export function textAlongPath(
  guide: PathLike,
  text: string,
  options: TextPathOptions = {}
): TextPath {
  return new TextPath(toPath(guide), text, options)
}
