/**
 * Scales and tick math for data visualization — the numeric core of
 * jikz's `datavisualization` analogue. Pure functions, no drawing.
 */
import type { PointLike } from '../../core/types'

/**
 * A map from data units to picture coordinates.
 */
export type Scale = (v: number) => number

/**
 * Linear map from `domain` (data units) to `range` (picture coords).
 * Ranges may be decreasing — that is how the y axis flips data-up
 * into screen-down.
 */
export function linearScale(domain: [number, number], range: [number, number]): Scale {
  const [d0, d1] = domain
  if (d0 === d1) {
    throw new Error(`linearScale: degenerate domain [${d0}, ${d1}].`)
  }
  const [r0, r1] = range
  const k = (r1 - r0) / (d1 - d0)
  return (v) => r0 + (v - d0) * k
}

/**
 * Heckbert's "nice numbers": round `range` to a 1/2/5×10ⁿ step. With
 * `round`, prefer the smaller covering step (for tick spacing); without,
 * the larger (for axis ranges).
 *
 * Precondition: a positive, finite range. Non-positive or non-finite
 * input returns 1 — a safe step that keeps tick loops terminating.
 */
export function niceNumber(range: number, round: boolean): number {
  if (!(range > 0) || !Number.isFinite(range)) return 1
  const exponent = Math.floor(Math.log10(range))
  const fraction = range / 10 ** exponent
  let niceFraction: number
  if (round) {
    niceFraction = fraction < 1.5 ? 1 : fraction < 3 ? 2 : fraction < 7 ? 5 : 10
  } else {
    niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10
  }
  return niceFraction * 10 ** exponent
}

/** Result of {@link niceTicks}: the widened range plus its tick values. */
export interface NiceTicks {
  /** Tick values, ascending, spanning [min, max]. */
  ticks: number[]
  /** Nice lower bound (≤ the input min). */
  min: number
  /** Nice upper bound (≥ the input max). */
  max: number
  /** Step between consecutive ticks. */
  step: number
}

/**
 * "Nice" tick values covering [min, max] — pgfplots' `about` strategy:
 * the range widens to round step boundaries and ticks land on whole
 * multiples of a 1/2/5 step. `count` is the desired number of ticks;
 * the actual count may differ by one or two.
 */
export function niceTicks(min: number, max: number, count = 5): NiceTicks {
  // Non-finite input (NaN/±Infinity data) yields no ticks on a safe
  // default range rather than NaN poisoning every downstream scale.
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { ticks: [], min: 0, max: 1, step: 1 }
  }
  if (min === max) {
    min -= 0.5
    max += 0.5
  } else if (min > max) {
    ;[min, max] = [max, min]
  }
  const range = niceNumber(max - min, false)
  const step = niceNumber(range / Math.max(1, count - 1), true)
  const niceMin = Math.floor(min / step) * step
  const niceMax = Math.ceil(max / step) * step
  const n = Math.round((niceMax - niceMin) / step)
  const ticks: number[] = []
  for (let i = 0; i <= n; i++) {
    // Round against float drift (0.1 + 0.2 ≠ 0.3) so labels print clean.
    ticks.push(Number((niceMin + i * step).toPrecision(12)))
  }
  return { ticks, min: Number(niceMin.toPrecision(12)), max: Number(niceMax.toPrecision(12)), step }
}

/**
 * Data extent of one component (0 = x, 1 = y) across a list of series.
 * Returns [0, 1] for empty input so scales never see a degenerate
 * domain.
 */
export function dataDomain(
  series: readonly (readonly (readonly [number, number])[])[],
  component: 0 | 1
): [number, number] {
  let min = Infinity
  let max = -Infinity
  for (const s of series) {
    for (const p of s) {
      const v = p[component]!
      // Skip non-finite samples, the Plot convention (NaN comparisons
      // would accidentally ignore NaN anyway; ±Infinity would corrupt).
      if (!Number.isFinite(v)) continue
      if (v < min) min = v
      if (v > max) max = v
    }
  }
  if (min === Infinity) return [0, 1]
  return [min, max]
}

/**
 * Include a value in a domain (used to pin bar-chart baselines at 0).
 */
export function includeInDomain(domain: [number, number], v: number): [number, number] {
  return [Math.min(domain[0], v), Math.max(domain[1], v)]
}

/**
 * Default tick label: compact, float-noise-free (`0.30000000000000004`
 * prints as `0.3`).
 */
export function formatTick(v: number): string {
  return String(Number(v.toPrecision(10)))
}

/** A 2D data series — `[x, y]` pairs in data units. */
export type DataSeries = readonly (readonly [number, number])[]

/**
 * Whether both components of a sample are finite. NaN/±Infinity are
 * skipped rather than drawn — the `Plot` convention — because a
 * non-finite coordinate in path data invalidates the whole element.
 *
 * Package-internal: every series builder filters through this, so they
 * cannot disagree about what a drawable point is.
 */
export function isFiniteSample(sample: readonly [number, number]): boolean {
  return Number.isFinite(sample[0]) && Number.isFinite(sample[1])
}

/** Map a series through two scales into picture points. */
export function mapSeries(data: DataSeries, x: Scale, y: Scale): PointLike[] {
  return data
    .filter(isFiniteSample)
    .map(([xv, yv]) => ({ x: x(xv), y: y(yv) }))
}
