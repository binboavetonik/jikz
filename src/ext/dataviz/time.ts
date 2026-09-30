/**
 * Time axes — dates on an axis, with ticks that land on calendar
 * boundaries (midnight, the 1st, January 1st) rather than on round
 * numbers of milliseconds, and labels that say only what changed
 * (the hour within a day, the day within a month, the month within a
 * year). Data is epoch milliseconds; `Date`s convert on the way in.
 *
 * Pure calendar math on `Date` in UTC or local time — no dependency,
 * deterministic in node with `timeZone: 'utc'`.
 */
import { JikzError } from '../../core/errors'
import { niceNumber, type Scale, type Tick } from './scale'

/** Which clock the calendar boundaries follow. */
export type TimeZone = 'utc' | 'local'

/** A tick spacing on a time axis. */
export interface TimeInterval {
  unit: 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year'
  step: number
}

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY
const MONTH = 30 * DAY
const YEAR = 365 * DAY

/** The ladder a target spacing snaps to, seconds to a year. */
const LADDER: readonly (TimeInterval & { ms: number })[] = [
  { unit: 'second', step: 1, ms: SECOND },
  { unit: 'second', step: 5, ms: 5 * SECOND },
  { unit: 'second', step: 15, ms: 15 * SECOND },
  { unit: 'second', step: 30, ms: 30 * SECOND },
  { unit: 'minute', step: 1, ms: MINUTE },
  { unit: 'minute', step: 5, ms: 5 * MINUTE },
  { unit: 'minute', step: 15, ms: 15 * MINUTE },
  { unit: 'minute', step: 30, ms: 30 * MINUTE },
  { unit: 'hour', step: 1, ms: HOUR },
  { unit: 'hour', step: 3, ms: 3 * HOUR },
  { unit: 'hour', step: 6, ms: 6 * HOUR },
  { unit: 'hour', step: 12, ms: 12 * HOUR },
  { unit: 'day', step: 1, ms: DAY },
  { unit: 'day', step: 2, ms: 2 * DAY },
  { unit: 'week', step: 1, ms: WEEK },
  { unit: 'month', step: 1, ms: MONTH },
  { unit: 'month', step: 3, ms: 3 * MONTH },
  { unit: 'year', step: 1, ms: YEAR },
]

/** Approximate length of an interval, ms — for choosing one. */
export function intervalMs(i: TimeInterval): number {
  const unit = { second: SECOND, minute: MINUTE, hour: HOUR, day: DAY, week: WEEK, month: MONTH, year: YEAR }[i.unit]
  return unit * i.step
}

/**
 * The ladder entry whose spacing is nearest (in log space) to
 * `target` ms; beyond a year, whole years in 1/2/5 steps.
 */
export function chooseInterval(target: number): TimeInterval {
  if (!(target > 0) || !Number.isFinite(target)) return { unit: 'day', step: 1 }
  if (target > YEAR) return { unit: 'year', step: Math.max(1, Math.round(niceNumber(target / YEAR, true))) }
  let best = LADDER[0]!
  let bestDist = Infinity
  for (const entry of LADDER) {
    const dist = Math.abs(Math.log(entry.ms) - Math.log(target))
    if (dist < bestDist) {
      bestDist = dist
      best = entry
    }
  }
  return { unit: best.unit, step: best.step }
}

/** Calendar accessors for one clock. */
interface Clock {
  parts(ms: number): { y: number; mo: number; d: number; h: number; mi: number; s: number; weekday: number }
  make(y: number, mo: number, d: number, h?: number, mi?: number, s?: number): number
}

const UTC: Clock = {
  parts(ms) {
    const t = new Date(ms)
    return {
      y: t.getUTCFullYear(),
      mo: t.getUTCMonth(),
      d: t.getUTCDate(),
      h: t.getUTCHours(),
      mi: t.getUTCMinutes(),
      s: t.getUTCSeconds(),
      weekday: t.getUTCDay(),
    }
  },
  make: (y, mo, d, h = 0, mi = 0, s = 0) => Date.UTC(y, mo, d, h, mi, s),
}

const LOCAL: Clock = {
  parts(ms) {
    const t = new Date(ms)
    return {
      y: t.getFullYear(),
      mo: t.getMonth(),
      d: t.getDate(),
      h: t.getHours(),
      mi: t.getMinutes(),
      s: t.getSeconds(),
      weekday: t.getDay(),
    }
  },
  make: (y, mo, d, h = 0, mi = 0, s = 0) => new Date(y, mo, d, h, mi, s).getTime(),
}

function clockOf(tz: TimeZone): Clock {
  return tz === 'utc' ? UTC : LOCAL
}

/**
 * The latest interval boundary at or before `ms`. Multi-day steps
 * anchor on the 1st of the month, weeks on Monday, multi-month steps
 * on January, multi-year steps on year multiples.
 */
export function floorTime(ms: number, interval: TimeInterval, tz: TimeZone = 'utc'): number {
  const c = clockOf(tz)
  const p = c.parts(ms)
  const { step } = interval
  switch (interval.unit) {
    case 'second':
      return c.make(p.y, p.mo, p.d, p.h, p.mi, Math.floor(p.s / step) * step)
    case 'minute':
      return c.make(p.y, p.mo, p.d, p.h, Math.floor(p.mi / step) * step)
    case 'hour':
      return c.make(p.y, p.mo, p.d, Math.floor(p.h / step) * step)
    case 'day':
      return c.make(p.y, p.mo, Math.floor((p.d - 1) / step) * step + 1)
    case 'week': {
      const back = (p.weekday + 6) % 7 // days since Monday
      return c.make(p.y, p.mo, p.d - back)
    }
    case 'month':
      return c.make(p.y, Math.floor(p.mo / step) * step, 1)
    case 'year':
      return c.make(Math.floor(p.y / step) * step, 0, 1)
  }
}

/** The boundary `n` intervals after `ms` (which is on a boundary). */
export function offsetTime(ms: number, interval: TimeInterval, n: number, tz: TimeZone = 'utc'): number {
  const c = clockOf(tz)
  const p = c.parts(ms)
  const k = interval.step * n
  switch (interval.unit) {
    case 'second':
      return ms + k * SECOND
    case 'minute':
      return ms + k * MINUTE
    case 'hour':
      return c.make(p.y, p.mo, p.d, p.h + k, p.mi, p.s)
    case 'day':
      return c.make(p.y, p.mo, p.d + k, p.h, p.mi, p.s)
    case 'week':
      return c.make(p.y, p.mo, p.d + 7 * k, p.h, p.mi, p.s)
    case 'month':
      return c.make(p.y, p.mo + k, p.d, p.h, p.mi, p.s)
    case 'year':
      return c.make(p.y + k, p.mo, p.d, p.h, p.mi, p.s)
  }
}

/** What {@link timeTicks} returns. */
export interface TimeTicks {
  /** Tick positions, epoch ms, ascending, inside [lo, hi]. */
  ticks: number[]
  /** The spacing chosen. */
  interval: TimeInterval
  /** The boundaries enclosing [lo, hi]: the floor of lo and the ceiling of hi. */
  min: number
  max: number
}

/**
 * About `count` ticks on calendar boundaries between `lo` and `hi`
 * (epoch ms), with the enclosing boundaries for a nice domain.
 */
export function timeTicks(lo: number, hi: number, count = 5, tz: TimeZone = 'utc'): TimeTicks {
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
    return { ticks: [], interval: { unit: 'day', step: 1 }, min: 0, max: DAY }
  }
  if (lo > hi) [lo, hi] = [hi, lo]
  if (lo === hi) {
    lo -= DAY / 2
    hi += DAY / 2
  }
  const interval = chooseInterval((hi - lo) / Math.max(1, count - 1))
  const min = floorTime(lo, interval, tz)
  const ticks: number[] = []
  let t = min
  let guard = 0
  while (t <= hi && guard++ < 10_000) {
    if (t >= lo) ticks.push(t)
    t = offsetTime(t, interval, 1, tz)
  }
  // t is the first boundary past hi; the ceiling is hi itself when it
  // sits on a boundary.
  const max = ticks.length && ticks[ticks.length - 1] === hi ? hi : t
  return { ticks, interval, min, max }
}

/** Options for {@link formatTime}. */
export interface TimeFormatOptions {
  timeZone?: TimeZone
  /** BCP 47 locale for the labels (default `'en-US'`). */
  locale?: string
}

const FORMAT_CACHE = new Map<string, Intl.DateTimeFormat>()

function fmt(locale: string, tz: TimeZone, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}|${tz}|${JSON.stringify(options)}`
  let f = FORMAT_CACHE.get(key)
  if (!f) {
    f = new Intl.DateTimeFormat(locale, { ...options, ...(tz === 'utc' && { timeZone: 'UTC' }) })
    FORMAT_CACHE.set(key, f)
  }
  return f
}

/**
 * The multi-scale label: a tick says only what changed at it — the
 * year on January 1st, the month on the 1st, the day at midnight,
 * `HH:mm` on the hour or minute, `HH:mm:ss` otherwise.
 */
export function formatTime(ms: number, options: TimeFormatOptions = {}): string {
  const { timeZone = 'utc', locale = 'en-US' } = options
  const p = clockOf(timeZone).parts(ms)
  const midnight = p.h === 0 && p.mi === 0 && p.s === 0 && ms % SECOND === 0
  if (midnight && p.d === 1 && p.mo === 0) return fmt(locale, timeZone, { year: 'numeric' }).format(ms)
  if (midnight && p.d === 1) return fmt(locale, timeZone, { month: 'short' }).format(ms)
  if (midnight) return fmt(locale, timeZone, { month: 'short', day: 'numeric' }).format(ms)
  if (p.s === 0 && ms % SECOND === 0) {
    return fmt(locale, timeZone, { hour: '2-digit', minute: '2-digit', hour12: false }).format(ms)
  }
  return fmt(locale, timeZone, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(ms)
}

/** Options for {@link timeScale}. */
export interface TimeScaleOptions extends TimeFormatOptions {
  /** Tick label formatter (default: {@link formatTime}). */
  format?: (v: number) => string
}

/**
 * Time {@link Scale}: linear in epoch ms, ticks on calendar
 * boundaries, multi-scale labels.
 */
export function timeScale(
  domain: readonly [number, number],
  range: readonly [number, number],
  options: TimeScaleOptions = {}
): Scale {
  const [d0, d1] = domain
  if (!Number.isFinite(d0) || !Number.isFinite(d1) || d0 === d1) {
    throw new JikzError('invalid-argument', `timeScale: bad domain [${d0}, ${d1}].`)
  }
  const { timeZone = 'utc', locale } = options
  const format = options.format ?? ((v: number) => formatTime(v, { timeZone, locale }))
  const [r0, r1] = range
  const k = (r1 - r0) / (d1 - d0)
  const lo = Math.min(d0, d1)
  const hi = Math.max(d0, d1)
  return {
    kind: 'time',
    domain: [lo, hi],
    range: [r0, r1],
    map: (v) => r0 + (v - d0) * k,
    invert: (px) => d0 + (px - r0) / k,
    ticks: (count = 5): Tick[] =>
      timeTicks(lo, hi, count, timeZone).ticks.map((value) => ({ value, label: format(value) })),
    format,
  }
}
