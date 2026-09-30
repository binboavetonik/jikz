/**
 * Time axes — dataviz phase 4: the interval ladder, calendar-boundary
 * snapping in UTC (deterministic) and local time (shape only), the
 * multi-scale formatter, and the axis wiring.
 */
import { describe, it, expect } from 'vitest'
import { point } from '../../../src/core/Point'
import { picture } from '../../../src/picture/Picture'
import {
  chooseInterval,
  floorTime,
  offsetTime,
  timeTicks,
  formatTime,
  timeScale,
  intervalMs,
} from '../../../src/ext/dataviz/time'
import { axes } from '../../../src/ext/dataviz/frame'
import { chart } from '../../../src/ext/dataviz/chart'

const at = point(50, 200)
const D = (y: number, mo: number, d: number, h = 0, mi = 0, s = 0) => Date.UTC(y, mo - 1, d, h, mi, s)
const HOUR = 3600_000
const DAY = 24 * HOUR

describe('interval ladder', () => {
  it('snaps a target spacing to the nearest rung, whole years beyond a year', () => {
    expect(chooseInterval(1200)).toEqual({ unit: 'second', step: 1 })
    expect(chooseInterval(4 * 60_000)).toEqual({ unit: 'minute', step: 5 })
    expect(chooseInterval(2 * HOUR)).toEqual({ unit: 'hour', step: 3 })
    expect(chooseInterval(1.4 * DAY)).toEqual({ unit: 'day', step: 1 })
    expect(chooseInterval(6 * DAY)).toEqual({ unit: 'week', step: 1 })
    expect(chooseInterval(40 * DAY)).toEqual({ unit: 'month', step: 1 })
    expect(chooseInterval(150 * DAY)).toEqual({ unit: 'month', step: 3 })
    expect(chooseInterval(250 * DAY)).toEqual({ unit: 'year', step: 1 })
    expect(chooseInterval(2.4 * 365 * DAY)).toEqual({ unit: 'year', step: 2 })
    expect(chooseInterval(4 * 365 * DAY)).toEqual({ unit: 'year', step: 5 })
    expect(chooseInterval(12 * 365 * DAY)).toEqual({ unit: 'year', step: 10 })
    expect(chooseInterval(NaN)).toEqual({ unit: 'day', step: 1 })
    expect(intervalMs({ unit: 'week', step: 2 })).toBe(14 * DAY)
  })
})

describe('calendar boundaries (UTC)', () => {
  it('floorTime lands on the boundary at or before, per unit', () => {
    const t = D(2026, 3, 18, 14, 37, 42)
    expect(floorTime(t, { unit: 'second', step: 15 })).toBe(D(2026, 3, 18, 14, 37, 30))
    expect(floorTime(t, { unit: 'minute', step: 15 })).toBe(D(2026, 3, 18, 14, 30))
    expect(floorTime(t, { unit: 'hour', step: 6 })).toBe(D(2026, 3, 18, 12))
    expect(floorTime(t, { unit: 'day', step: 1 })).toBe(D(2026, 3, 18))
    expect(floorTime(t, { unit: 'day', step: 2 })).toBe(D(2026, 3, 17)) // anchored on the 1st
    expect(floorTime(t, { unit: 'week', step: 1 })).toBe(D(2026, 3, 16)) // Monday
    expect(floorTime(t, { unit: 'month', step: 1 })).toBe(D(2026, 3, 1))
    expect(floorTime(t, { unit: 'month', step: 3 })).toBe(D(2026, 1, 1))
    expect(floorTime(t, { unit: 'year', step: 5 })).toBe(D(2025, 1, 1))
  })

  it('offsetTime steps by calendar units, month ends and leap days included', () => {
    expect(offsetTime(D(2026, 1, 31), { unit: 'month', step: 1 }, 1)).toBe(D(2026, 3, 3)) // JS overflow, as Date does
    expect(offsetTime(D(2026, 3, 1), { unit: 'month', step: 1 }, 1)).toBe(D(2026, 4, 1))
    expect(offsetTime(D(2024, 2, 28), { unit: 'day', step: 1 }, 1)).toBe(D(2024, 2, 29))
    expect(offsetTime(D(2026, 12, 31, 23), { unit: 'hour', step: 1 }, 1)).toBe(D(2027, 1, 1))
    expect(offsetTime(D(2026, 1, 1), { unit: 'year', step: 1 }, -1)).toBe(D(2025, 1, 1))
  })

  it('timeTicks: boundaries inside the range and the enclosing ones', () => {
    const r = timeTicks(D(2026, 3, 3, 5), D(2026, 3, 27, 9), 5)
    expect(r.interval).toEqual({ unit: 'week', step: 1 })
    expect(r.ticks).toEqual([D(2026, 3, 9), D(2026, 3, 16), D(2026, 3, 23)])
    expect(r.min).toBe(D(2026, 3, 2)) // the Monday before
    expect(r.max).toBe(D(2026, 3, 30)) // the Monday after
    // Boundaries on the range ends belong to it.
    const on = timeTicks(D(2026, 1, 1), D(2026, 1, 3), 3)
    expect(on.ticks).toEqual([D(2026, 1, 1), D(2026, 1, 2), D(2026, 1, 3)])
    expect(on.max).toBe(D(2026, 1, 3))
    // Hours across a day, and a flat or bad range.
    const hours = timeTicks(D(2026, 5, 1, 22), D(2026, 5, 2, 4), 6)
    expect(hours.interval).toEqual({ unit: 'hour', step: 1 })
    expect(hours.ticks).toHaveLength(7)
    expect(timeTicks(D(2026, 1, 1), D(2026, 1, 1)).ticks.length).toBeGreaterThan(0)
    expect(timeTicks(NaN, 1).ticks).toEqual([])
  })

  it('local time keeps the same shape as UTC', () => {
    const r = timeTicks(D(2026, 3, 3), D(2026, 3, 27), 5, 'local')
    expect(r.interval).toEqual({ unit: 'week', step: 1 })
    expect(r.ticks.length).toBeGreaterThanOrEqual(3)
    for (const t of r.ticks) expect(new Date(t).getDay()).toBe(1) // local Mondays
    for (let i = 1; i < r.ticks.length; i++) expect(r.ticks[i]! - r.ticks[i - 1]!).toBeGreaterThan(6 * DAY)
  })
})

describe('formatTime', () => {
  it('says only what changed at the tick', () => {
    expect(formatTime(D(2026, 1, 1))).toBe('2026')
    expect(formatTime(D(2026, 3, 1))).toBe('Mar')
    expect(formatTime(D(2026, 3, 18))).toBe('Mar 18')
    expect(formatTime(D(2026, 3, 18, 14, 30))).toBe('14:30')
    expect(formatTime(D(2026, 3, 18, 0, 0, 15))).toBe('00:00:15')
    expect(formatTime(D(2026, 3, 1), { locale: 'de-DE' })).toBe('Mär')
  })
})

describe('time axes', () => {
  it('timeScale maps ms linearly with calendar ticks and multi-scale labels', () => {
    const s = timeScale([D(2026, 1, 1), D(2026, 1, 3)], [0, 200])
    expect(s.kind).toBe('time')
    expect(s.map(D(2026, 1, 2))).toBe(100)
    expect(s.invert(50)).toBe(D(2026, 1, 1, 12))
    expect(s.ticks(3).map((t) => t.label)).toEqual(['2026', 'Jan 2', 'Jan 3'])
    expect(() => timeScale([1, 1], [0, 1])).toThrow(/bad domain/)
  })

  it('axes() with time: Dates in domain and data, nice widening to boundaries', () => {
    const pic = picture()
    const frame = axes(pic, {
      at,
      width: 280,
      height: 100,
      x: { time: true, domain: [new Date(D(2026, 3, 3, 5)), new Date(D(2026, 3, 27))] },
      y: { domain: [0, 10], exact: true },
    })
    expect(frame.xDomain).toEqual([D(2026, 3, 2), D(2026, 3, 30)])
    expect(frame.xTicks).toEqual([D(2026, 3, 2), D(2026, 3, 9), D(2026, 3, 16), D(2026, 3, 23), D(2026, 3, 30)])
    expect(frame.xScale.format(D(2026, 3, 9))).toBe('Mar 9')
    expect(frame.x(new Date(D(2026, 3, 16)))).toBe(190)
    const svg = pic.toSVG({ width: 400, height: 250 })
    expect(svg).toContain('>Mar 2<')
    expect(svg).toContain('>Mar 30<')
    frame.line([[new Date(D(2026, 3, 5)), 4], [new Date(D(2026, 3, 20)), 8]])
    expect(frame.series[0]!.data[0]![0]).toBe(D(2026, 3, 5))
  })

  it('exact keeps the range, tickValues take Dates, and a custom format wins', () => {
    const frame = axes(picture(), {
      at,
      width: 280,
      height: 100,
      x: { time: { timeZone: 'utc' }, domain: [D(2026, 3, 3), D(2026, 3, 27)], exact: true, ticks: 5 },
    })
    expect(frame.xDomain).toEqual([D(2026, 3, 3), D(2026, 3, 27)])
    expect(frame.xTicks).toEqual([D(2026, 3, 9), D(2026, 3, 16), D(2026, 3, 23)])
    const f2 = axes(picture(), {
      at,
      width: 280,
      height: 100,
      x: { time: true, tickValues: [new Date(D(2026, 1, 1)), new Date(D(2026, 7, 1))], format: (v) => String(new Date(v).getUTCMonth()) },
    })
    expect(f2.xTicks).toEqual([D(2026, 1, 1), D(2026, 7, 1)])
    expect(f2.xScale.format(D(2026, 7, 1))).toBe('6')
  })

  it('chart() infers a time domain from records with Dates', () => {
    const rows = [
      { day: '2026-04-02', v: 3 },
      { day: '2026-04-15', v: 5 },
      { day: '2026-05-20', v: 4 },
    ]
    const frame = chart(picture(), {
      at,
      width: 280,
      height: 100,
      x: { time: true },
      series: [{ data: { rows, x: (r) => new Date(r.day), y: 'v' }, label: 'v' }],
    })
    expect(frame.xScale.kind).toBe('time')
    expect(frame.xDomain[0]).toBeLessThanOrEqual(D(2026, 4, 2))
    expect(frame.xDomain[1]).toBeGreaterThanOrEqual(D(2026, 5, 20))
    // Seven weeks of data → weekly ticks, Mondays, labelled by day.
    expect(frame.xTicks.map((t) => frame.xScale.format(t))).toContain('Apr 6')
    for (const t of frame.xTicks) expect(new Date(t).getUTCDay()).toBe(1)
  })
})
