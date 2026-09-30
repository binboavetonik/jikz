/**
 * Scales and tick math for data visualization — the numeric core of
 * jikz's `datavisualization` analogue. Pure functions, no drawing.
 */
import { JikzError } from '../../core/errors'
import type { PointLike } from '../../core/types'

/** What a {@link Scale} maps: the axis families dataviz knows. */
export type ScaleKind = 'linear' | 'log' | 'time' | 'band'

/** One tick of a {@link Scale}: its data value and printed label. */
export interface Tick {
  /** Position, in data units. */
  value: number
  /** Printed label. */
  label: string
  /** A minor tick — drawn shorter, never labeled. */
  minor?: boolean
}

/**
 * A map between data units and picture coordinates, both ways, plus
 * the ticks and label format that belong to it. The frame owns one
 * per axis; series builders map through `map`, the interaction layer
 * reads back through `invert`.
 */
export interface Scale {
  readonly kind: ScaleKind
  /** Data range covered, ascending. */
  readonly domain: readonly [number, number]
  /**
   * Picture range the domain maps onto. May be decreasing — that is
   * how the y axis flips data-up into screen-down.
   */
  readonly range: readonly [number, number]
  /** Data units → picture coordinate. */
  map(v: number): number
  /** Picture coordinate → data units (the inverse of {@link map}). */
  invert(px: number): number
  /**
   * Nice tick values inside the domain — about `count` of them (default
   * 5); the actual number may differ by one or two.
   */
  ticks(count?: number): Tick[]
  /** Label for a data value, the way this scale's ticks print. */
  format(v: number): string
  /** Band scales: the category names, indexed by data value. */
  readonly categories?: readonly string[]
  /** Band scales: the width of one band in picture units. */
  readonly bandwidth?: number
}

/** Options for {@link linearScale}. */
export interface LinearScaleOptions {
  /** Tick label formatter (default: {@link formatTick}). */
  format?: (v: number) => string
}

/**
 * Linear {@link Scale} from `domain` (data units) onto `range` (picture
 * coords). Ranges may be decreasing.
 */
export function linearScale(
  domain: readonly [number, number],
  range: readonly [number, number],
  options: LinearScaleOptions = {}
): Scale {
  const [d0, d1] = domain
  if (d0 === d1) {
    throw new JikzError('invalid-argument', `linearScale: degenerate domain [${d0}, ${d1}].`)
  }
  const [r0, r1] = range
  const k = (r1 - r0) / (d1 - d0)
  const format = options.format ?? formatTick
  const lo = Math.min(d0, d1)
  const hi = Math.max(d0, d1)
  return {
    kind: 'linear',
    domain: [lo, hi],
    range: [r0, r1],
    map: (v) => r0 + (v - d0) * k,
    invert: (px) => d0 + (px - r0) / k,
    ticks: (count = 5) =>
      niceTicks(lo, hi, count)
        .ticks.filter((t) => t >= lo && t <= hi)
        .map((value) => ({ value, label: format(value) })),
    format,
  }
}

/**
 * `n` minor tick values between each pair of consecutive majors
 * (TikZ `minor steps between steps`), float-noise-free.
 */
export function minorTicksBetween(majors: readonly number[], n: number): number[] {
  const out: number[] = []
  const k = Math.max(0, Math.floor(n))
  if (k === 0) return out
  for (let i = 1; i < majors.length; i++) {
    const a = majors[i - 1]!
    const b = majors[i]!
    for (let j = 1; j <= k; j++) {
      out.push(Number((a + ((b - a) * j) / (k + 1)).toPrecision(12)))
    }
  }
  return out
}

/**
 * Tick values of a logarithmic axis over `[lo, hi]` (both positive):
 * every power of ten as a major tick, and — with `mantissas` — 2…9
 * times each as minors (TikZ `exponential steps`). Over less than
 * about a decade and a half, the mantissa ticks are majors too, so a
 * short log axis is not a single tick.
 */
export function logTicks(lo: number, hi: number, mantissas = true): { major: number[]; minor: number[] } {
  const major: number[] = []
  const minor: number[] = []
  if (!(lo > 0) || !(hi > 0) || !Number.isFinite(lo) || !Number.isFinite(hi)) return { major, minor }
  if (lo > hi) [lo, hi] = [hi, lo]
  const e0 = Math.floor(Math.log10(lo) + 1e-9)
  const e1 = Math.ceil(Math.log10(hi) - 1e-9)
  const short = Math.log10(hi) - Math.log10(lo) <= 1.5
  const inside = (v: number): boolean => v >= lo * (1 - 1e-9) && v <= hi * (1 + 1e-9)
  for (let e = e0; e <= e1; e++) {
    const decade = 10 ** e
    if (inside(decade)) major.push(Number(decade.toPrecision(12)))
    if (!mantissas) continue
    for (let m = 2; m <= 9; m++) {
      const v = Number((m * decade).toPrecision(12))
      if (!inside(v)) continue
      ;(short ? major : minor).push(v)
    }
  }
  major.sort((a, b) => a - b)
  return { major, minor }
}

/**
 * Powers of ten print as `10ⁿ` beyond a thousandth and ten thousand;
 * everything else prints compact. The log axis's default label.
 */
export function formatLogTick(v: number): string {
  if (v > 0) {
    const e = Math.log10(v)
    if (Math.abs(e - Math.round(e)) < 1e-9 && (e >= 5 || e <= -4)) {
      const sup = '⁰¹²³⁴⁵⁶⁷⁸⁹'
      const n = Math.round(e)
      const digits = String(Math.abs(n))
        .split('')
        .map((d) => sup[Number(d)])
        .join('')
      return `10${n < 0 ? '⁻' : ''}${digits}`
    }
  }
  return formatTick(v)
}

/** Options for {@link logScale}. */
export interface LogScaleOptions {
  /** Tick label formatter (default: {@link formatLogTick}). */
  format?: (v: number) => string
}

/**
 * Logarithmic {@link Scale}: `map` is linear in log₁₀ of the value —
 * TikZ's `logarithmic` axis (`function=ln`, `exponential steps`).
 * The domain must be positive.
 */
export function logScale(
  domain: readonly [number, number],
  range: readonly [number, number],
  options: LogScaleOptions = {}
): Scale {
  const [d0, d1] = domain
  if (!(d0 > 0) || !(d1 > 0) || !Number.isFinite(d0) || !Number.isFinite(d1)) {
    throw new JikzError('invalid-argument', `logScale: the domain must be positive and finite, got [${d0}, ${d1}].`)
  }
  if (d0 === d1) {
    throw new JikzError('invalid-argument', `logScale: degenerate domain [${d0}, ${d1}].`)
  }
  const [r0, r1] = range
  const l0 = Math.log10(d0)
  const k = (r1 - r0) / (Math.log10(d1) - l0)
  const format = options.format ?? formatLogTick
  const lo = Math.min(d0, d1)
  const hi = Math.max(d0, d1)
  return {
    kind: 'log',
    domain: [lo, hi],
    range: [r0, r1],
    map: (v) => r0 + (Math.log10(v) - l0) * k,
    invert: (px) => 10 ** (l0 + (px - r0) / k),
    ticks: () => {
      const { major, minor } = logTicks(lo, hi)
      return [
        ...major.map((value) => ({ value, label: format(value) })),
        ...minor.map((value) => ({ value, label: format(value), minor: true })),
      ].sort((a, b) => a.value - b.value)
    },
    format,
  }
}

/** Options for {@link bandScale}. */
export interface BandScaleOptions {
  /**
   * Fraction of each step left empty around its band (default 0.2,
   * so a band is 80% of its step).
   */
  padding?: number
}

/**
 * Band {@link Scale} for a categorical axis: category `i` maps to the
 * centre of the i-th of `n` equal steps across `range`, its band
 * `bandwidth` wide. The domain is `[-0.5, n - 0.5]`, so the scale
 * is linear in the index and `invert` rounds to the nearest category.
 *
 * ```ts
 * const x = bandScale(['Q1', 'Q2', 'Q3', 'Q4'], [50, 410])
 * x.map(0)          // centre of Q1
 * x.format(2)       // 'Q3'
 * ```
 */
export function bandScale(
  categories: readonly string[],
  range: readonly [number, number],
  options: BandScaleOptions = {}
): Scale {
  const n = categories.length
  if (n === 0) {
    throw new JikzError('invalid-argument', 'bandScale: needs at least one category.')
  }
  const padding = Math.min(0.9, Math.max(0, options.padding ?? 0.2))
  const [r0, r1] = range
  const step = (r1 - r0) / n
  const format = (v: number): string => categories[Math.round(v)] ?? ''
  return {
    kind: 'band',
    domain: [-0.5, n - 0.5],
    range: [r0, r1],
    map: (v) => r0 + (v + 0.5) * step,
    invert: (px) => Math.min(n - 1, Math.max(0, Math.round((px - r0) / step - 0.5))),
    ticks: () => categories.map((label, value) => ({ value, label })),
    format,
    categories,
    bandwidth: Math.abs(step) * (1 - padding),
  }
}

/**
 * How a rough tick step snaps to a round one — TikZ's `about
 * strategy` presets. `'standard'` is Heckbert's 1/2/5 × 10ⁿ;
 * `'decimal'` allows 1 × 10ⁿ only; `'half'` 1 and 5 × 10ⁿ;
 * `'quarter'` 1, 2.5 and 5 × 10ⁿ; `'int'` is standard but never
 * fractional (count axes).
 */
export type AboutStrategy = 'standard' | 'decimal' | 'half' | 'quarter' | 'int'

/** The mantissa a rough step snaps to, per strategy. */
function snapMantissa(fraction: number, about: AboutStrategy): number {
  switch (about) {
    case 'decimal':
      return fraction < 3.2 ? 1 : 10
    case 'half':
      return fraction < 2.3 ? 1 : fraction < 7 ? 5 : 10
    case 'quarter':
      return fraction < 1.6 ? 1 : fraction < 3.5 ? 2.5 : fraction < 7 ? 5 : 10
    default:
      return fraction < 1.5 ? 1 : fraction < 3 ? 2 : fraction < 7 ? 5 : 10
  }
}

/**
 * Heckbert's "nice numbers": round `range` to a 1/2/5×10ⁿ step. With
 * `round`, prefer the smaller covering step (for tick spacing); without,
 * the larger (for axis ranges). `about` picks another snap set.
 *
 * Precondition: a positive, finite range. Non-positive or non-finite
 * input returns 1 — a safe step that keeps tick loops terminating.
 */
export function niceNumber(range: number, round: boolean, about: AboutStrategy = 'standard'): number {
  if (!(range > 0) || !Number.isFinite(range)) return 1
  const exponent = Math.floor(Math.log10(range))
  const fraction = range / 10 ** exponent
  let niceFraction: number
  if (round) {
    niceFraction = snapMantissa(fraction, about)
  } else {
    niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10
  }
  const step = niceFraction * 10 ** exponent
  return about === 'int' ? Math.max(1, Math.round(step)) : step
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
export function niceTicks(
  min: number,
  max: number,
  count = 5,
  about: AboutStrategy = 'standard'
): NiceTicks {
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
  const step = niceNumber(range / Math.max(1, count - 1), true, about)
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
 * A value a sample may hold: numbers as they are, dates as epoch ms,
 * strings as category indices on a band axis.
 */
export type DataValue = number | Date | string

/** One sample as a caller writes it: `[x, y]` in any {@link DataValue}. */
export type DataPair = readonly [DataValue, DataValue]

/**
 * Data as records with accessors — what a JSON payload looks like.
 * `x`/`y` name a field or compute the value; a `Date` becomes epoch
 * milliseconds, a string a category index (on a band axis), anything
 * else non-numeric a gap (NaN).
 *
 * ```ts
 * frame.line({ rows, x: 'week', y: 'tickets' })
 * frame.line({ rows, x: (r) => new Date(r.day), y: (r) => r.hits / 1000 })
 * frame.bars({ rows, x: 'quarter', y: 'revenue' })   // x: 'Q1' … on a band axis
 * ```
 */
export interface DataRecords<T> {
  rows: readonly T[]
  x: (keyof T & string) | ((row: T, index: number) => DataValue)
  y: (keyof T & string) | ((row: T, index: number) => DataValue)
}

/** What every series builder accepts: `[x, y]` pairs or records. */
export type DataInput<T = unknown> = readonly DataPair[] | DataRecords<T>

/** The category lists that resolve string samples, per axis. */
export interface Categories {
  x?: readonly string[]
  y?: readonly string[]
}

/**
 * A {@link DataValue} as a number: dates to ms, strings through the
 * categories. A name that appears more than once in the categories
 * is ambiguous and throws — give such samples their index instead.
 */
export function toNumber(v: DataValue, categories?: readonly string[]): number {
  if (typeof v === 'number') return v
  if (v instanceof Date) return v.getTime()
  if (typeof v === 'string' && categories) {
    const i = categories.indexOf(v)
    if (i !== -1 && categories.lastIndexOf(v) !== i) {
      throw new JikzError(
        'invalid-argument',
        `Category "${v}" appears more than once in the axis categories, so a string sample cannot pick one — use the band's index (${i}, ${categories.lastIndexOf(v)}, …) as x instead.`
      )
    }
    return i === -1 ? NaN : i
  }
  return NaN
}

function accessorOf<T>(
  spec: (keyof T & string) | ((row: T, index: number) => DataValue),
  categories?: readonly string[]
): (row: T, index: number) => number {
  const read =
    typeof spec === 'function'
      ? spec
      : (row: T) => (row as Record<string, unknown>)[spec] as DataValue
  return (row, i) => toNumber(read(row, i), categories)
}

/**
 * Normalize {@link DataInput} to numeric `[x, y]` pairs. Numeric pairs
 * pass through untouched; dates become epoch ms; strings resolve
 * through `categories` (a band axis's names) or become gaps; records
 * go through their accessors. Non-finite values are kept (as NaN) so
 * the series builders see the gaps.
 */
export function toSeries<T>(data: DataInput<T>, categories: Categories = {}): DataSeries {
  if (Array.isArray(data)) {
    const pairs = data as readonly DataPair[]
    if (pairs.every((p) => typeof p[0] === 'number' && typeof p[1] === 'number')) {
      return pairs as DataSeries
    }
    return pairs.map(([x, y]) => [toNumber(x, categories.x), toNumber(y, categories.y)] as const)
  }
  const { rows, x, y } = data as DataRecords<T>
  const fx = accessorOf(x, categories.x)
  const fy = accessorOf(y, categories.y)
  return rows.map((row, i) => [fx(row, i), fy(row, i)] as const)
}

/**
 * The y extent of stacked series: cumulative positive and negative
 * sums per x, across every stack. Pass each stack as its own group of
 * series. Empty input yields [0, 0].
 */
export function stackedDomain(stacks: readonly (readonly DataSeries[])[]): [number, number] {
  let min = 0
  let max = 0
  for (const group of stacks) {
    const pos = new Map<number, number>()
    const neg = new Map<number, number>()
    for (const s of group) {
      for (const [x, y] of s) {
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue
        if (y >= 0) {
          const t = (pos.get(x) ?? 0) + y
          pos.set(x, t)
          if (t > max) max = t
        } else {
          const t = (neg.get(x) ?? 0) + y
          neg.set(x, t)
          if (t < min) min = t
        }
      }
    }
  }
  return [min, max]
}

/**
 * Whether both components of a sample are finite. NaN/±Infinity are
 * gaps — never drawn, and a line breaks there — because a non-finite
 * coordinate in path data invalidates the whole element.
 *
 * Package-internal: every series builder filters through this, so they
 * cannot disagree about what a drawable point is.
 */
export function isFiniteSample(sample: readonly [number, number]): boolean {
  return Number.isFinite(sample[0]) && Number.isFinite(sample[1])
}

/** Map a series through two scales into picture points. Gaps are dropped. */
export function mapSeries(data: DataSeries, x: Scale, y: Scale): PointLike[] {
  return data
    .filter(isFiniteSample)
    .map(([xv, yv]) => ({ x: x.map(xv), y: y.map(yv) }))
}
