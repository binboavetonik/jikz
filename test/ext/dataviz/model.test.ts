/**
 * The chart model — what the frame remembers about the series it drew,
 * and the read side (scales both ways, hit-testing) the interaction
 * layer builds on. Pure: no DOM anywhere.
 */
import { describe, it, expect } from 'vitest'
import { point } from '../../../src/core/Point'
import { picture } from '../../../src/picture/Picture'
import { linearScale, toSeries } from '../../../src/ext/dataviz/scale'
import { axes } from '../../../src/ext/dataviz/frame'
import { chart } from '../../../src/ext/dataviz/chart'

const at = point(50, 200)

/** A 100×100 plot area mapping [0, 10]² with exact domains. */
function frame10(pic: ReturnType<typeof picture>) {
  return axes(pic, {
    at,
    width: 100,
    height: 100,
    x: { domain: [0, 10], exact: true },
    y: { domain: [0, 10], exact: true },
  })
}

describe('Scale objects', () => {
  it('invert round-trips map, on increasing and decreasing ranges', () => {
    const x = linearScale([0, 10], [50, 150])
    const y = linearScale([0, 10], [200, 100])
    for (const v of [0, 2.5, 7, 10, -3, 13]) {
      expect(x.invert(x.map(v))).toBeCloseTo(v, 10)
      expect(y.invert(y.map(v))).toBeCloseTo(v, 10)
    }
    expect(y.invert(150)).toBe(5)
  })

  it('carries kind, an ascending domain, the range, ticks and format', () => {
    const s = linearScale([10, 0], [0, 100], { format: (v) => `${v}%` })
    expect(s.kind).toBe('linear')
    expect(s.domain).toEqual([0, 10])
    expect(s.range).toEqual([0, 100])
    expect(s.map(10)).toBe(0)
    expect(s.ticks().map((t) => t.value)).toEqual([0, 2, 4, 6, 8, 10])
    expect(s.ticks(3).map((t) => t.label)).toEqual(['0%', '5%', '10%'])
    expect(s.format(2.5)).toBe('2.5%')
  })

  it('ticks stay inside a domain that is not nice', () => {
    const s = linearScale([0.3, 9.7], [0, 100])
    const values = s.ticks().map((t) => t.value)
    expect(values[0]).toBeGreaterThanOrEqual(0.3)
    expect(values[values.length - 1]).toBeLessThanOrEqual(9.7)
    expect(values).toEqual([2, 4, 6, 8])
  })

  it('the frame exposes both scales and the inverse maps', () => {
    const frame = frame10(picture())
    expect(frame.xScale.domain).toEqual([0, 10])
    expect(frame.yScale.range).toEqual([200, 100])
    expect(frame.invertX(100)).toBe(5)
    expect(frame.invertY(150)).toBe(5)
    expect(frame.contains(point(100, 150))).toBe(true)
    expect(frame.contains(point(100, 250))).toBe(false)
  })
})

describe('records', () => {
  it('toSeries reads fields, calls accessors, and turns Dates into epoch ms', () => {
    const rows = [
      { day: '2026-01-01', hits: 4 },
      { day: '2026-01-02', hits: 6 },
    ]
    const byName = toSeries({ rows, x: 'hits', y: 'hits' })
    expect(byName).toEqual([[4, 4], [6, 6]])
    const byFn = toSeries({ rows, x: (r) => new Date(r.day), y: (r, i) => r.hits * i })
    expect(byFn[0]![0]).toBe(Date.UTC(2026, 0, 1))
    expect(byFn[1]![1]).toBe(6)
  })

  it('a non-numeric field is a gap, and pairs pass through untouched', () => {
    const rows = [{ v: 1 }, { v: 'n/a' }, { v: 3 }]
    const s = toSeries({ rows, x: (_, i) => i, y: 'v' })
    expect(Number.isNaN(s[1]![1])).toBe(true)
    const pairs = [[1, 2]] as const
    expect(toSeries(pairs)).toBe(pairs)
  })

  it('series builders and chart() accept records', () => {
    const pic = picture()
    const frame = frame10(pic)
    frame.line({ rows: [{ t: 0, v: 0 }, { t: 10, v: 10 }], x: 't', y: 'v' })
    expect(pic.toSVG({ width: 200, height: 220 })).toContain('M 50 200 L 150 100')

    const pic2 = picture()
    const f2 = chart(pic2, {
      at,
      width: 100,
      height: 100,
      series: [{ data: { rows: [{ t: 1, v: 3 }, { t: 4, v: 8 }], x: 't', y: 'v' }, kind: 'scatter' }],
    })
    expect(f2.series[0]!.data).toEqual([[1, 3], [4, 8]])
  })
})

describe('series registry', () => {
  it('records every series with ids, kinds, samples and points', () => {
    const pic = picture()
    const frame = frame10(pic)
    frame
      .line([[0, 0], [5, 5]], { label: 'a', style: { stroke: 'red' } })
      .scatter([[2, 2]], { id: 'dots' })
      .bars([[1, 4], [2, NaN], [3, 6]])
    expect(frame.series.map((s) => [s.id, s.kind, s.label])).toEqual([
      ['series-0', 'line', 'a'],
      ['dots', 'scatter', undefined],
      ['series-2', 'bar', undefined],
    ])
    const bars = frame.seriesById('series-2')!
    expect(bars.data).toEqual([[1, 4], [3, 6]]) // the gap is not a sample
    expect(bars.points.map((p) => [p.x, p.y])).toEqual([[60, 160], [80, 140]])
    // The builder's style layers over the sheet's slot (phase 3).
    expect(frame.series[0]!.style).toEqual([{ stroke: '#2a78d6', strokeWidth: 2 }, { stroke: 'red' }])
    expect(frame.seriesById('nope')).toBeUndefined()
  })

  it('tags every element with the series class, data-series and data-index', () => {
    const pic = picture()
    const frame = frame10(pic)
    frame.line([[0, 0], [5, 5]], { id: 'q 1', marks: 'o', className: 'mine' })
    frame.bars([[2, 3], [4, 5]], { id: 'b' })
    frame.scatter([[7, 7]], { id: 's', attributes: { 'data-x': 'y' } })
    const svg = pic.toSVG({ width: 200, height: 220 })
    // The line path: the series class (id sanitized), the caller's class kept.
    expect(svg).toContain('class="jikz-series jikz-series-q-1 mine"')
    expect(svg).toContain('data-series="q 1"')
    // Marks and bars carry data-index per point (attributes serialize
    // in alphabetical order).
    expect(svg.match(/data-index="1" data-series="q 1"/g)).toHaveLength(1)
    expect(svg.match(/data-index="\d" data-series="b"/g)).toHaveLength(2)
    // The caller's attributes survive beside ours.
    expect(svg).toContain('data-index="0" data-series="s" data-x="y"')
    expect(frame.seriesById('q 1')!.className).toBe('jikz-series jikz-series-q-1')
  })

  it('rejects a duplicate id', () => {
    const frame = frame10(picture())
    frame.line([[0, 0]], { id: 'a' })
    expect(() => frame.scatter([[1, 1]], { id: 'a' })).toThrow(/duplicate series id "a"/)
  })

  it('chart() ids series by index unless given one, and keeps labels', () => {
    const frame = chart(picture(), {
      at,
      width: 100,
      height: 100,
      series: [
        { data: [[0, 1], [1, 2]], label: 'first' },
        { data: [[0, 1], [1, 2]], id: 'second', kind: 'bar' },
      ],
    })
    expect(frame.series.map((s) => s.id)).toEqual(['series-0', 'second'])
    expect(frame.series[0]!.label).toBe('first')
  })
})

describe('hitTest', () => {
  const build = () => {
    const frame = frame10(picture())
    frame.line([[0, 0], [2, 2], [4, 4], [6, 6], [8, 8], [10, 10]], { id: 'up' })
    frame.line([[1, 9], [5, 5], [9, 1]], { id: 'down' })
    return frame
  }

  it("mode 'x' snaps every series to its nearest x and anchors on the closest", () => {
    const frame = build()
    // Probe at data x ≈ 4.4, y anywhere inside.
    const hit = frame.hitTest(point(frame.x(4.4), 150))!
    expect(hit.samples.map((s) => [s.seriesId, s.index, s.x, s.y])).toEqual([
      ['up', 2, 4, 4],
      ['down', 1, 5, 5],
    ])
    expect(hit.x).toBe(4)
    expect(hit.y).toBe(4)
    expect(hit.at).toEqual(frame.point(4, 4))
    expect(hit.samples[0]!.distance).toBeCloseTo(4, 10)
    expect(hit.samples[1]!.distance).toBeCloseTo(6, 10)
  })

  it('finds the nearest even when data arrives unsorted', () => {
    const frame = frame10(picture())
    frame.scatter([[9, 1], [1, 1], [5, 1], [3, 1]], { id: 's' })
    expect(frame.hitTest(point(frame.x(3.4), 150))!.samples[0]!.index).toBe(3)
    expect(frame.hitTest(point(frame.x(0), 150))!.samples[0]!.index).toBe(1)
    expect(frame.hitTest(point(frame.x(10), 150))!.samples[0]!.index).toBe(0)
  })

  it("mode 'y' measures along y", () => {
    const frame = build()
    const hit = frame.hitTest(point(60, frame.y(8.6)), { mode: 'y' })!
    expect(hit.samples.map((s) => [s.seriesId, s.y])).toEqual([
      ['up', 8],
      ['down', 9],
    ])
    expect(hit.y).toBe(9) // 'down' at y=9 is 0.4 away, 'up' at 8 is 0.6 away
  })

  it("mode 'nearest' returns the single closest sample in the plane", () => {
    const frame = build()
    const hit = frame.hitTest(point(frame.x(5.2), frame.y(4.9)), { mode: 'nearest' })!
    expect(hit.samples).toHaveLength(1)
    expect(hit.samples[0]!.seriesId).toBe('down')
    expect(hit.x).toBe(5)
    expect(hit.samples[0]!.distance).toBeCloseTo(Math.hypot(2, 1), 6)
  })

  it('respects maxDistance, ids, and the plot area', () => {
    const frame = build()
    const p = point(frame.x(4.4), 150)
    expect(frame.hitTest(p, { maxDistance: 3 })).toBeNull()
    expect(frame.hitTest(p, { maxDistance: 5 })).not.toBeNull()
    expect(frame.hitTest(p, { ids: ['down'] })!.samples.map((s) => s.seriesId)).toEqual(['down'])
    expect(frame.hitTest(p, { ids: [] })).toBeNull()
    expect(frame.hitTest(point(10, 150))).toBeNull() // left of the plot area
    expect(frame.hitTest(p, { mode: 'nearest', maxDistance: 1 })).toBeNull()
  })

  it('returns null on an empty frame and ignores empty series', () => {
    const frame = frame10(picture())
    expect(frame.hitTest(point(100, 150))).toBeNull()
    frame.line([[NaN, 1]], { id: 'empty' })
    frame.line([[1, 1]], { id: 'one' })
    const hit = frame.hitTest(point(100, 150))!
    expect(hit.samples.map((s) => s.seriesId)).toEqual(['one'])
  })
})
