/**
 * Enter animations — recharts' `isAnimationActive`, as declarative
 * SMIL on the series elements: a line draws itself in, a bar grows
 * from its baseline, anything fades. They ride the render option
 * `animate`, so they serialize into `toSVG()` output and a static SVG
 * file plays them on open; a renderer without SMIL shows the final
 * state, since every animation starts at 0 and the elements' own
 * attributes are the end values.
 *
 * ```ts
 * chart(pic, { ..., enter: 'draw' })                          // every series, staggered
 * frame.bars(data, { enter: { enter: 'grow', dur: '600ms' } })
 * ```
 */
import type { SVGAnimation } from '../../render/Renderer'

/** How a series enters. */
export type EnterKind = 'draw' | 'grow' | 'fade'

/** An enter animation's timing. */
export interface EnterOptions {
  enter: EnterKind
  /** Duration (default `'800ms'`). */
  dur?: string | number
  /** Delay before it starts (default 0). */
  delay?: string | number
  /**
   * Easing: `'ease-out'` (default), `'ease-in-out'`, `'linear'`, or a
   * cubic-bezier as four numbers (`'0.4 0 0.2 1'`).
   */
  easing?: string
}

/** A chart-level enter animation: the same for every series, staggered. */
export interface ChartEnterOptions extends EnterOptions {
  /** Extra delay per series, in paint order (default `'80ms'`). */
  stagger?: string | number
}

/** `'800ms'`, `'0.8s'` or a number of ms → ms. */
export function parseDuration(v: string | number | undefined, fallback = 0): number {
  if (v === undefined) return fallback
  if (typeof v === 'number') return Number.isFinite(v) ? Math.max(0, v) : fallback
  const m = v.trim().match(/^([\d.]+)\s*(ms|s)?$/)
  if (!m) return fallback
  const n = Number(m[1])
  return Math.max(0, m[2] === 's' ? n * 1000 : n)
}

const EASINGS: Record<string, string> = {
  'ease-out': '0 0 0.2 1',
  'ease-in-out': '0.4 0 0.2 1',
  linear: '0 0 1 1',
}

/** Normalize the shorthand: a bare kind is `{ enter: kind }`. */
export function normalizeEnter(enter: EnterKind | EnterOptions | undefined): EnterOptions | undefined {
  if (enter === undefined) return undefined
  return typeof enter === 'string' ? { enter } : enter
}

/**
 * One SMIL `<animate>` taking `attributeName` from `from` to `to`
 * after the delay: the animation begins at 0 and holds `from` until
 * the delay has passed, so an element never shows its end state early
 * and never needs a start state of its own.
 */
export function enterKeyframe(
  attributeName: string,
  from: string | number,
  to: string | number,
  options: EnterOptions
): SVGAnimation {
  const dur = parseDuration(options.dur, 800)
  const delay = parseDuration(options.delay, 0)
  const total = Math.max(1, dur + delay)
  const easing = EASINGS[options.easing ?? 'ease-out'] ?? options.easing ?? EASINGS['ease-out']!
  const hold = delay > 0
  return {
    attributeName,
    values: hold ? `${from};${from};${to}` : `${from};${to}`,
    keyTimes: hold ? `0;${Number((delay / total).toFixed(4))};1` : '0;1',
    calcMode: 'spline',
    keySplines: hold ? `0 0 1 1;${easing}` : easing,
    dur: `${total}ms`,
    begin: '0s',
    fill: 'freeze',
  }
}

/** The fade-in of an element: opacity 0 → 1. */
export function fadeIn(options: EnterOptions): SVGAnimation {
  return enterKeyframe('opacity', 0, 1, options)
}

/** A stroke drawing itself in — needs `pathLength="1"` and `strokeDasharray: '1'` on the element. */
export function drawIn(options: EnterOptions): SVGAnimation {
  return enterKeyframe('stroke-dashoffset', 1, 0, options)
}

/** A bar growing from its baseline `y0` to its final `y`/`height`. */
export function growIn(y0: number, y: number, height: number, options: EnterOptions): SVGAnimation[] {
  return [enterKeyframe('y', y0, y, options), enterKeyframe('height', 0, height, options)]
}

/** The series' delay under a chart-level stagger. */
export function staggered(options: ChartEnterOptions, index: number): EnterOptions {
  const { stagger, ...rest } = options
  const delay = parseDuration(rest.delay, 0) + index * parseDuration(stagger, 80)
  return { ...rest, delay: `${delay}ms` }
}
