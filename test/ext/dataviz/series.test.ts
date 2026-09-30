/**
 * Series parity and the chart staples — dataviz phase 2: band axes,
 * grouped and stacked bars, areas, interpolation, function plots,
 * candlesticks, error bars, reference marks, direct labels, sparklines
 * and pies.
 */
import { describe, it, expect } from 'vitest'
import { point } from '../../../src/core/Point'
import { picture } from '../../../src/picture/Picture'
import { bandScale, toSeries, stackedDomain } from '../../../src/ext/dataviz/scale'
import { interpolatePath, stepPoints } from '../../../src/ext/dataviz/interpolate'
import { axes } from '../../../src/ext/dataviz/frame'
import { chart } from '../../../src/ext/dataviz/chart'
import { sparkline } from '../../../src/ext/dataviz/sparkline'
import { pie } from '../../../src/ext/dataviz/pie'
import { VARY_HUE } from '../../../src/ext/dataviz/stylesheet'

const at = point(50, 200)
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']

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

/** A band-x frame: four 100px-wide steps over [50, 450], y [0, 100]. */
function bandFrame(pic: ReturnType<typeof picture>) {
  return axes(pic, {
    at,
    width: 400,
    height: 100,
    x: { categories: QUARTERS },
    y: { domain: [0, 100], exact: true },
  })
}

const rects = (svg: string) =>
  [...svg.matchAll(/<rect[^>]*class="jikz-series[^>]*>/g)].map((m) => {
    const a = (k: string) => Number(m[0].match(new RegExp(` ${k}="([\\d.-]+)"`))![1])
    return { x: a('x'), y: a('y'), w: a('width'), h: a('height') }
  })

describe('band scale and string samples', () => {
  it('maps categories to band centres and back', () => {
    const s = bandScale(QUARTERS, [50, 450])
    expect(s.kind).toBe('band')
    expect(s.domain).toEqual([-0.5, 3.5])
    expect(s.map(0)).toBe(100)
    expect(s.map(3)).toBe(400)
    expect(s.bandwidth).toBe(80)
    expect(s.invert(120)).toBe(0)
    expect(s.invert(999)).toBe(3)
    expect(s.ticks().map((t) => t.label)).toEqual(QUARTERS)
    expect(s.format(2)).toBe('Q3')
    expect(bandScale(['a'], [0, 10], { padding: 0.5 }).bandwidth).toBe(5)
    expect(() => bandScale([], [0, 10])).toThrow(/at least one category/)
  })

  it('a string sample naming a repeated category throws instead of picking the first', () => {
    expect(() => toSeries([['J', 1]], { x: ['J', 'F', 'M', 'A', 'M', 'J'] })).toThrow(/"J" appears more than once/)
    expect(toSeries([[5, 1]], { x: ['J', 'F', 'M', 'A', 'M', 'J'] })).toEqual([[5, 1]]) // indices are fine
  })

  it('toSeries resolves strings through categories, and dates in pairs', () => {
    expect(toSeries([['Q2', 5], ['Q9', 6]], { x: QUARTERS })).toEqual([[1, 5], [NaN, 6]])
    expect(toSeries([[new Date(0), 1]])).toEqual([[0, 1]])
    expect(toSeries([['Q1', 1]])[0]![0]).toBeNaN() // no categories: a gap
    const rows = [{ q: 'Q4', v: 7 }]
    expect(toSeries({ rows, x: 'q', y: 'v' }, { x: QUARTERS })).toEqual([[3, 7]])
  })

  it('axes() with categories draws one labelled tick per band', () => {
    const pic = picture()
    const frame = bandFrame(pic)
    expect(frame.xTicks).toEqual([0, 1, 2, 3])
    expect(frame.xScale.categories).toBe(QUARTERS)
    expect(frame.x('Q3')).toBe(300)
    const svg = pic.toSVG({ width: 500, height: 250 })
    for (const q of QUARTERS) expect(svg).toContain(`>${q}<`)
    expect(frame.categories).toEqual({ x: QUARTERS, y: undefined })
  })

  it('stackedDomain sums positives and negatives per x across each stack', () => {
    expect(stackedDomain([[[[0, 3], [1, 4]], [[0, 5], [1, -2]]]])).toEqual([-2, 8])
    expect(stackedDomain([])).toEqual([0, 0])
  })
})

describe('bars on a band axis', () => {
  it('fill the band by default, and split it when grouped', () => {
    const pic = picture()
    const frame = bandFrame(pic)
    frame.bars([['Q1', 50], ['Q2', 100]], { id: 'solo' })
    frame.bars([['Q1', 20]], { id: 'g0', group: { index: 0, count: 2 } })
    frame.bars([['Q1', 30]], { id: 'g1', group: { index: 1, count: 2 } })
    const [solo, , g0, g1] = rects(pic.toSVG({ width: 500, height: 250 }))
    expect(solo).toEqual({ x: 60, y: 150, w: 80, h: 50 })
    // Two columns of (80 - 2) / 2 = 39px with a 2px gap between them.
    expect(g0).toEqual({ x: 60, y: 180, w: 39, h: 20 })
    expect(g1).toEqual({ x: 101, y: 170, w: 39, h: 30 })
    // The series' points sit on its own column, so hits land on it.
    expect(frame.seriesById('g1')!.points[0]).toEqual(point(120.5, 170))
  })

  it('stack on the previous series with a canvas gap, positive up and negative down', () => {
    const pic = picture()
    const frame = axes(pic, {
      at,
      width: 400,
      height: 100,
      x: { categories: QUARTERS },
      y: { domain: [-50, 50], exact: true },
    })
    frame.bars([['Q1', 20], ['Q2', -10]], { stack: 's', id: 'a' })
    frame.bars([['Q1', 10], ['Q2', -20]], { stack: 's', id: 'b' })
    const [a1, a2, b1, b2] = rects(pic.toSVG({ width: 500, height: 250 }))
    // y=0 is at 150; 1 unit = 1px.
    expect(a1).toEqual({ x: 60, y: 130, w: 80, h: 20 })
    expect(a2).toEqual({ x: 160, y: 150, w: 80, h: 10 })
    // b sits on a: 10 units tall minus the 2px gap at its base.
    expect(b1).toEqual({ x: 60, y: 120, w: 80, h: 8 })
    // negative b hangs under negative a, gap at its top.
    expect(b2).toEqual({ x: 160, y: 162, w: 80, h: 18 })
    expect(frame.seriesById('b')!.points.map((p) => p.y)).toEqual([120, 180])
    expect(frame.seriesById('b')!.stack).toBe('s')
    expect(frame.seriesById('b')!.data).toEqual([[0, 10], [1, -20]]) // increments, not totals
  })

  it('take per-bar paint over the slot, and value labels', () => {
    const pic = picture()
    const frame = bandFrame(pic)
    frame.bars([['Q1', 40], ['Q2', 60]], {
      style: ([, y]) => ({ fill: y > 50 ? '#ff0000' : '#00ff00' }),
      valueLabels: true,
    })
    const svg = pic.toSVG({ width: 500, height: 250 })
    expect(svg).toMatch(/<rect[^>]*data-index="0"[^>]*fill="#00ff00"/)
    expect(svg).toMatch(/<rect[^>]*data-index="1"[^>]*fill="#ff0000"/)
    expect(svg).toMatch(/<text class="jikz-value-label jikz-series jikz-series-series-0"[^>]*>40</)
    expect(frame.series[0]!.style).toEqual({ fill: VARY_HUE[0], stroke: 'none' }) // legend shows the slot
  })
})

describe('chart() with bands, groups and stacks', () => {
  it('groups unstacked bars automatically and widens y to stack totals', () => {
    const pic = picture()
    const frame = chart(pic, {
      at,
      width: 400,
      height: 100,
      x: { categories: QUARTERS },
      series: [
        { data: [['Q1', 30]], kind: 'bar', id: 'a' },
        { data: [['Q1', 40]], kind: 'bar', id: 'b', stack: 't' },
        { data: [['Q1', 50]], kind: 'bar', id: 'c', stack: 't' },
        { data: [['Q1', 5]], id: 'l' },
      ],
    })
    // Domain: unstacked max 30, stack total 90 → nice to [0, 100].
    expect(frame.yDomain).toEqual([0, 100])
    const r = rects(pic.toSVG({ width: 500, height: 250 }))
    // Two columns: 'a' alone and the 't' stack.
    expect(r[0]!.x).toBe(60)
    expect(r[1]!.x).toBe(101)
    expect(r[2]!.x).toBe(101)
    expect(r[2]!.y).toBe(110) // top of the stack: 90 units up from 200
  })

  it('accepts candlestick and area kinds and sizes y from their extents', () => {
    const frame = chart(picture(), {
      at,
      width: 100,
      height: 100,
      series: [
        { data: [[1, 10, 14, 9, 13], [2, 13, 15, 11, 12]], kind: 'candlestick', label: 'px' },
        { data: [[1, 2], [2, 3]], kind: 'area', stack: 'v' },
        { data: [[1, 2], [2, 3]], kind: 'area', stack: 'v' },
      ],
      legend: { place: 'below' },
    })
    expect(frame.yDomain[0]).toBe(0)
    expect(frame.yDomain[1]).toBeGreaterThanOrEqual(15)
    expect(frame.series.map((s) => s.kind)).toEqual(['candlestick', 'area', 'area'])
    expect(frame.series[2]!.points[1]!.y).toBe(frame.y(6)) // stacked top
  })
})

describe('interpolation and closed lines', () => {
  const pts = [point(0, 0), point(10, 10), point(20, 0)]

  it('stepPoints inserts corners per mode', () => {
    expect(stepPoints(pts, 'stepAfter').map((p) => [p.x, p.y])).toEqual([[0, 0], [10, 0], [10, 10], [20, 10], [20, 0]])
    expect(stepPoints(pts, 'stepBefore').map((p) => [p.x, p.y])).toEqual([[0, 0], [0, 10], [10, 10], [10, 0], [20, 0]])
    expect(stepPoints(pts, 'step').map((p) => [p.x, p.y])).toEqual([[0, 0], [5, 0], [5, 10], [10, 10], [15, 10], [15, 0], [20, 0]])
    expect(stepPoints(pts, 'linear')).toEqual(pts)
  })

  it('interpolatePath builds linear, smooth and closed paths', () => {
    expect(interpolatePath(pts)).toBe('M 0 0 L 10 10 L 20 0')
    expect(interpolatePath(pts, 'linear', true)).toBe('M 0 0 L 10 10 L 20 0 Z')
    expect(interpolatePath(pts, 'smooth')).toMatch(/^M 0 0 C /)
    expect(interpolatePath(pts, 'smooth', true)).toMatch(/Z$/)
    expect(interpolatePath([point(1, 1)])).toBe('')
  })

  it('line() takes interpolation, smooth as its alias, and closed', () => {
    const pic = picture()
    const frame = frame10(pic)
    frame.line([[0, 0], [5, 5], [10, 0]], { interpolation: 'stepAfter' })
    frame.line([[0, 0], [5, 5], [10, 0]], { smooth: true })
    frame.line([[0, 0], [5, 5], [10, 0]], { closed: true })
    const svg = pic.toSVG({ width: 200, height: 220 })
    expect(svg).toContain('d="M 50 200 L 100 200 L 100 150 L 150 150 L 150 200"')
    expect(svg).toMatch(/d="M 50 200 C /)
    expect(svg).toContain('d="M 50 200 L 100 150 L 150 200 Z"')
  })
})

describe('area()', () => {
  it('closes to the baseline, and stacks by increments', () => {
    const pic = picture()
    const frame = frame10(pic)
    frame.area([[0, 2], [10, 4]], { id: 'a' })
    frame.area([[0, 2], [10, 4]], { id: 'b', stack: 's' })
    frame.area([[0, 3], [10, 1]], { id: 'c', stack: 's' })
    const svg = pic.toSVG({ width: 200, height: 220 })
    // a: the fill is the top edge then back along y=0 (200) and Z,
    // unstroked; the stroke is the top edge alone.
    expect(svg).toMatch(/d="M 50 180 L 150 160 L 150 200 L 50 200 Z"[^>]*stroke="none"/)
    expect(svg).toMatch(/d="M 50 180 L 150 160"[^>]*fill="none"[^>]*stroke="#2a78d6"/)
    // c sits on b: top at 2+3=5 and 4+1=5, bottom on b's top.
    expect(svg).toContain('d="M 50 150 L 150 150 L 150 160 L 50 180 Z"')
    expect(frame.seriesById('c')!.points.map((p) => p.y)).toEqual([150, 150])
    expect(frame.seriesById('a')!.style).toEqual({
      stroke: VARY_HUE[0],
      strokeWidth: 2,
      fill: VARY_HUE[0],
      fillOpacity: 0.25,
    })
  })

  it('breaks at gaps and takes smooth edges', () => {
    const pic = picture()
    const frame = frame10(pic)
    frame.area([[0, 1], [2, 2], [4, NaN], [6, 2], [8, 1]], { smooth: true })
    const d = pic.toSVG({ width: 200, height: 220 }).match(/<path class="jikz-series[^"]*" d="([^"]+)"/)![1]!
    expect(d.match(/Z/g)).toHaveLength(2) // two closed runs in the fill
    expect(d).toMatch(/C /)
  })
})

describe('fn(), candlestick(), errorBars()', () => {
  it('fn samples a function across the domain with NaN as gaps', () => {
    const pic = picture()
    const frame = frame10(pic)
    frame.fn((x) => (x < 5 ? x : NaN), { samples: 11, id: 'f', label: 'f' })
    const rec = frame.seriesById('f')!
    expect(rec.data).toHaveLength(5)
    expect(rec.data[0]).toEqual([0, 0])
    expect(rec.data[4]).toEqual([4, 4])
    expect(frame.fn((x) => x, { domain: [2, 4], samples: 3, id: 'g' }).seriesById('g')!.data).toEqual([[2, 2], [3, 3], [4, 4]])
  })

  it('candlestick draws a wick and a body per candle, hollow up and solid down', () => {
    const pic = picture()
    const frame = frame10(pic)
    frame.candlestick([[2, 2, 8, 1, 6], [6, 6, 7, 3, 4]], { width: 10, id: 'c' })
    const svg = pic.toSVG({ width: 200, height: 220 })
    expect(frame.seriesById('c')!.data).toEqual([[2, 6], [6, 4]]) // closes
    expect(svg).toMatch(/<line[^>]*data-index="0"[^>]*stroke="#1baf7a"[^>]*y1="120"[^>]*y2="190"/)
    expect(svg).toMatch(/<rect[^>]*data-index="0"[^>]*fill="#ffffff"[^>]*height="40"[^>]*width="10"[^>]*y="140"/)
    expect(svg).toMatch(/<rect[^>]*data-index="1"[^>]*fill="#e34948"[^>]*height="20"/)
  })

  it('errorBars draws capped ranges, symmetric or absolute, tagged to a series', () => {
    const pic = picture()
    const frame = frame10(pic)
    frame.scatter([[5, 5]], { id: 's' })
    frame.errorBars([[5, 5, 1], [8, 5, 3, 9]], { seriesId: 's', capWidth: 4 })
    const svg = pic.toSVG({ width: 200, height: 220 })
    const bars = svg.match(/<line class="jikz-error-bar jikz-series jikz-series-s"[^>]*>/g)!
    expect(bars).toHaveLength(6)
    expect(bars[0]).toMatch(/x1="100" x2="100" y1="140" y2="160"/)
    expect(bars[3]).toMatch(/x1="130" x2="130" y1="110" y2="170"/)
    expect(frame.series).toHaveLength(1) // not a series
  })
})

describe('reference marks and direct labels', () => {
  it('referenceLine draws across the area with a label at its end', () => {
    const pic = picture()
    frame10(pic).referenceLine({ y: 5, label: 'goal' }).referenceLine({ x: 2 })
    const svg = pic.toSVG({ width: 200, height: 220 })
    expect(svg).toMatch(/<line class="jikz-reference"[^>]*stroke-dasharray[^>]*x1="50" x2="150" y1="150" y2="150"/)
    expect(svg).toMatch(/<line class="jikz-reference"[^>]*x1="70" x2="70" y1="200" y2="100"/)
    // The label box sits up and left of the line's right end (150, 150).
    const label = svg.match(/<text class="jikz-reference-label"[^>]*x="([\d.]+)" y="([\d.]+)">goal</)!
    expect(Number(label[1])).toBeLessThan(150)
    expect(Number(label[2])).toBeLessThan(150)
  })

  it('referenceArea fills bounds, missing ones running to the edges', () => {
    const pic = picture()
    frame10(pic).referenceArea({ y1: 2, y2: 4, label: 'ok' }).referenceArea({ x1: 8 })
    const svg = pic.toSVG({ width: 200, height: 220 })
    expect(svg).toMatch(/<rect class="jikz-reference"[^>]*height="20"[^>]*width="100" x="50" y="160"/)
    expect(svg).toMatch(/<rect class="jikz-reference"[^>]*height="100"[^>]*width="20" x="130" y="100"/)
    expect(svg).toContain('>ok<')
  })

  it('referenceDot marks a point with a label beside it', () => {
    const pic = picture()
    frame10(pic).referenceDot(5, 5, { label: 'peak', labelAt: 'east' })
    const svg = pic.toSVG({ width: 200, height: 220 })
    expect(svg).toMatch(/<path class="jikz-reference"[^>]*d="M 104 150 A 4 4/)
    expect(svg).toMatch(/<text class="jikz-reference-label"[^>]*>peak</)
  })

  it('labelInData puts the series name at the chosen sample', () => {
    const pic = picture()
    const frame = frame10(pic)
    frame.line([[0, 1], [5, 9], [10, 3]], { label: 'hot', labelInData: 'max' })
    frame.line([[0, 1], [10, 3]], { id: 'q', labelInData: 'end' })
    frame.scatter([[2, 2], [4, 4]], { label: 'two', labelInData: [0, 1] })
    const svg = pic.toSVG({ width: 200, height: 220 })
    const labels = svg.match(/<text class="jikz-series-label[^>]*>[^<]*</g)!
    expect(labels).toHaveLength(4)
    expect(labels[0]).toMatch(/x="100"[^>]*>hot</)
    expect(Number(labels[0]!.match(/y="([\d.]+)"/)![1])).toBeLessThan(110) // above the max at (100, 110)
    // East of the end sample at (150, 170): the box centre sits to its right.
    expect(Number(labels[1]!.match(/x="([\d.]+)"/)![1])).toBeGreaterThan(150)
    expect(labels[1]).toMatch(/y="170">q</)
    expect(labels[2]).toContain('>two<')
  })
})

describe('sparkline()', () => {
  it('draws a line in its box from bare values, with band, fill and end mark', () => {
    const pic = picture()
    const r = sparkline(pic, [1, 3, 2, 5], {
      at: point(10, 30),
      width: 60,
      height: 20,
      fill: true,
      endMark: true,
      band: [2, 4],
      className: 'spark',
    })
    expect(r.points.map((p) => [p.x, p.y])).toEqual([[10, 30], [30, 20], [50, 25], [70, 10]])
    expect(r.last).toEqual(point(70, 10))
    const svg = pic.toSVG({ width: 100, height: 40 })
    expect(svg).toMatch(/<rect class="spark-band"[^>]*height="10"[^>]*y="15"/)
    expect(svg).toMatch(/<path class="spark-fill"[^>]*d="M 10 30 L 30 20 L 50 25 L 70 10 L 70 30 L 10 30 Z"/)
    expect(svg).toMatch(/<path class="spark" d="M 10 30 L 30 20 L 50 25 L 70 10"/)
    expect(svg).toMatch(/<path class="spark-end"/)
  })

  it('survives flat and empty data', () => {
    const pic = picture()
    expect(sparkline(pic, [4, 4, 4], { at: point(0, 10), width: 30, height: 10 }).points).toHaveLength(3)
    expect(sparkline(pic, [], { at: point(0, 10), width: 30, height: 10 }).last).toBeUndefined()
    expect(pic.toSVG({ width: 40, height: 20 })).not.toContain('NaN')
  })
})

describe('pie()', () => {
  it('draws slices with sheet colours, a canvas gap, and percent labels', () => {
    const pic = picture()
    const r = pie(pic, {
      at: point(100, 100),
      radius: 50,
      slices: [{ value: 3, label: 'a' }, { value: 1, label: 'b' }, { value: 0, label: 'none' }],
    })
    expect(r.total).toBe(4)
    expect(r.slices.map((s) => [s.id, s.fraction, s.startAngle, s.endAngle])).toEqual([
      ['a', 0.75, -90, 180],
      ['b', 0.25, 180, 270],
    ])
    const svg = pic.toSVG({ width: 200, height: 200 })
    expect(svg).toMatch(/<path class="jikz-series jikz-series-a jikz-pie-slice" d="M 100 100 L [\d.]+ 50 A 50 50 0 1 1 /)
    expect(svg).toMatch(new RegExp(`data-series="a" fill="${VARY_HUE[0]}"[^>]*stroke="#ffffff"[^>]*stroke-width="2"`))
    expect(svg).toContain('>75%<')
    expect(svg).toContain('>25%<')
    expect(svg).toMatch(/fill="#ffffff" font-family[^>]*>75%</) // inside: white
  })

  it('donut, single full slice, custom labels and small slices outside', () => {
    const pic = picture()
    pie(pic, { at: point(0, 0), radius: 40, innerRadius: 20, slices: [{ value: 5, label: 'all' }] })
    pie(pic, {
      at: point(0, 0),
      radius: 40,
      slices: [{ value: 97, label: 'big' }, { value: 3, label: 'tiny' }],
      labels: 'label',
    })
    const svg = pic.toSVG({ width: 100, height: 100 })
    expect(svg).toMatch(/data-series="all" fill="[^"]*" fill-opacity="1" fill-rule="evenodd"/)
    expect(svg).toMatch(/d="M 40 0 A 40 40 0 1 1 -40 0 A 40 40 0 1 1 40 0 Z M 20 0 A 20 20 0 1 0 -20 0/)
    expect(svg).toMatch(/fill="#334155"[^>]*>tiny</) // outside: ink
    expect(svg).toContain('>big<')
    expect(pie(picture(), { at: point(0, 0), radius: 1, slices: [] })).toEqual({ slices: [], total: 0 })
  })
})
