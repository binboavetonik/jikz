/**
 * Path markings — jikz's analogue of TikZ's `decorations.markings`:
 * marks placed at positions along a path, rotated with the tangent.
 *
 * TikZ:
 * ```tex
 * \draw[decoration={markings,
 *   mark=at position 0.5 with {\arrow{stealth}}},
 *   postaction=decorate] (A) -- (B);
 * ```
 *
 * jikz:
 * ```ts
 * pic.draw(markPath(myPath, { mark: 'stealth', at: 0.5 }))
 * pic.draw(markPath(myPath,
 *   { mark: 'to', between: [0.1, 0.9], step: 0.2 },
 *   { mark: { plotMark: 'cross' }, at: [0.25, 0.75] }))
 * ```
 *
 * Mark names resolve against two namespaces: registered arrow tips
 * first ({@link getArrowTip} — `stealth`, `to`, `diamond`, …), then
 * plot marks (`plus`, `cross`, `pentagon`, …). Names present in both
 * (`circle`, `square`, `diamond`) resolve as arrow tips — force the
 * scatter mark with `{ plotMark: 'circle' }`.
 *
 * Unlike the `Path → Path` decorations (snake, zigzag, …), markings
 * cannot be one path: a filled arrowhead and a stroked polyline need
 * different paint. {@link MarkedPath} therefore wraps the base path
 * plus resolved marks, and the renderer paints each mark with the
 * path's stroke color — the same convention as edge arrowheads.
 */
import { Point } from '../core/Point'
import { Path } from './Path'
import { toPath, type PathLike } from './PathLike'
import { getArrowTip, registeredArrowTips } from '../render/ArrowTip'
import {
  plotMarkPath,
  plotMarkFilled,
  PLOT_MARK_NAMES,
  type PlotMark,
} from '../geometry/PlotMark'

/**
 * Custom mark artwork: SVG path data for the glyph. Drawn pointing +x
 * (the tangent direction); `(refX, refY)` is the artwork point that
 * sits on the mark position — like arrow-tip artwork in a 10×10 box,
 * but any coordinate system works since `scale` normalizes it.
 */
export interface CustomMarkArtwork {
  /** SVG path data. */
  d: string
  /** Paint with fill (default true) or stroke. */
  filled?: boolean
  /** Stroke width when `filled: false` (default 1.5). */
  strokeWidth?: number
  /** Artwork x that lands on the mark position (default 0). */
  refX?: number
  /** Artwork y that lands on the mark position (default 0). */
  refY?: number
  /** Rotate with the path tangent (default true). */
  rotate?: boolean
}

/**
 * What to draw at a mark position: an arrow-tip or plot-mark name,
 * `{ plotMark }` to force the scatter-mark namespace, or custom
 * artwork.
 */
export type MarkSpec =
  | string
  | CustomMarkArtwork
  | { plotMark: PlotMark; size?: number }

/**
 * One marking instruction — TikZ's `mark=at position … with {…}` and
 * `mark=between positions … step … with {…}`.
 */
export interface MarkingSpec {
  /** The mark to draw. */
  mark: MarkSpec
  /**
   * Position(s) along the path as fraction(s) 0–1. Default: `0.5`
   * (TikZ's default for a bare `mark`).
   */
  at?: number | readonly number[]
  /**
   * Repeated marks: `between: [from, to]` with `step` places a mark at
   * `from`, `from + step`, … up to `to` (all fractions 0–1).
   */
  between?: readonly [number, number]
  /** Spacing for {@link between}; must be > 0. */
  step?: number
  /** Scale factor for the artwork (default 1). */
  scale?: number
}

/** A mark fully resolved for rendering: where, which way, what glyph. */
export interface ResolvedPathMark {
  /** Position on the path. */
  point: Point
  /** Final rotation in degrees (0 for non-rotating marks). */
  angle: number
  /** SVG path data of the glyph. */
  d: string
  filled: boolean
  strokeWidth?: number
  refX: number
  refY: number
  scale: number
}

interface NormalizedArtwork {
  d: string
  filled: boolean
  strokeWidth?: number
  refX: number
  refY: number
  rotate: boolean
}

function isPlotMarkName(name: string): boolean {
  return (PLOT_MARK_NAMES as readonly string[]).includes(name)
}

function normalizeArtwork(mark: MarkSpec): NormalizedArtwork {
  if (typeof mark === 'string') {
    const tip = getArrowTip(mark)
    if (tip) {
      return {
        d: tip.end.d,
        filled: tip.filled,
        strokeWidth: tip.strokeWidth,
        refX: tip.end.refX,
        refY: 5,
        rotate: true,
      }
    }
    if (isPlotMarkName(mark)) {
      return {
        d: plotMarkPath(mark),
        filled: plotMarkFilled(mark),
        refX: 0,
        refY: 0,
        rotate: false,
      }
    }
    const tips = registeredArrowTips().map((n) => `"${n}"`).join(', ')
    const marks = PLOT_MARK_NAMES.map((n) => `"${n}"`).join(', ')
    throw new Error(
      `Unknown mark: "${mark}" (arrow tips: ${tips}; plot marks: ${marks}).`
    )
  }
  if ('plotMark' in mark) {
    return {
      d: plotMarkPath(mark.plotMark, mark.size ?? 5),
      filled: plotMarkFilled(mark.plotMark),
      refX: 0,
      refY: 0,
      rotate: false,
    }
  }
  return {
    d: mark.d,
    filled: mark.filled ?? true,
    strokeWidth: mark.strokeWidth,
    refX: mark.refX ?? 0,
    refY: mark.refY ?? 0,
    rotate: mark.rotate ?? true,
  }
}

const clamp01 = (t: number): number => Math.min(1, Math.max(0, t))

function positionsOf(spec: MarkingSpec): number[] {
  if (spec.between !== undefined) {
    const step = spec.step ?? 0.1
    if (!(step > 0)) {
      throw new Error('markPath: `step` must be > 0.')
    }
    const [from, to] = spec.between
    const out: number[] = []
    // Epsilon absorbs float drift so the endpoint is included when
    // (to - from) is an exact multiple of step.
    for (let t = from; t <= to + 1e-9; t += step) {
      out.push(clamp01(t))
    }
    return out
  }
  if (spec.at !== undefined) {
    const list = typeof spec.at === 'number' ? [spec.at] : spec.at
    return list.map(clamp01)
  }
  return [0.5]
}

/** Tangent angle at t, from two nearby samples (screen convention). */
function tangentAt(p: Path, t: number): number {
  const delta = 0.001
  const p1 = p.pointAt(Math.max(0, t - delta))
  const p2 = p.pointAt(Math.min(1, t + delta))
  return p1.angleTo(p2)
}

/**
 * A path plus marks placed along it — what {@link markPath} returns.
 * Renders as the base path (with the caller's style) followed by each
 * mark painted in the path's stroke color. The base path is unchanged:
 * marks are overlaid, exactly like TikZ's `postaction=decorate`.
 */
export class MarkedPath {
  readonly kind = 'markedPath' as const

  constructor(
    readonly path: Path,
    readonly marks: readonly ResolvedPathMark[]
  ) {}

  /** SVG path data of the base path (marks render separately). */
  toSVGPath(): string {
    return this.path.toSVGPath()
  }

  /**
   * Bounding box of the base path. Marks can extend a few px past it —
   * pad the viewBox in fit mode to cover them.
   */
  get bounds(): [number, number, number, number] {
    return this.path.bounds
  }

  /** Length of the base path. */
  get length(): number {
    return this.path.length
  }
}

/**
 * Place marks along a path. Each spec contributes its positions
 * (`at` / `between`+`step` / default 0.5); arrow-tip marks rotate
 * with the tangent, plot marks stay upright (TikZ behavior).
 *
 * @example
 * ```ts
 * // TikZ: \draw[decoration={markings, mark=at position 0.6 with \arrow{stealth}}, postaction=decorate]
 * pic.draw(markPath(p, { mark: 'stealth', at: 0.6 }))
 *
 * // repeated arrowheads along a curve
 * pic.draw(markPath(p, { mark: 'latex', between: [0.1, 0.9], step: 0.2 }))
 *
 * // any outline works as the guide — arcs, circles, shapes
 * pic.draw(markPath(arc(c, 40, 0, 270), { mark: 'stealth', at: 0.5 }))
 * ```
 */
export function markPath(guide: PathLike, ...specs: readonly MarkingSpec[]): MarkedPath {
  const p = toPath(guide)
  const marks: ResolvedPathMark[] = []
  for (const spec of specs) {
    const artwork = normalizeArtwork(spec.mark)
    for (const t of positionsOf(spec)) {
      marks.push({
        point: p.pointAt(t),
        angle: artwork.rotate ? tangentAt(p, t) : 0,
        d: artwork.d,
        filled: artwork.filled,
        strokeWidth: artwork.strokeWidth,
        refX: artwork.refX,
        refY: artwork.refY,
        scale: spec.scale ?? 1,
      })
    }
  }
  return new MarkedPath(p, marks)
}
