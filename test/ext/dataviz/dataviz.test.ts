import { describe, it, expect } from 'vitest'
import { point } from '../../../src/core/Point'
import { picture } from '../../../src/picture/Picture'
import {
  linearScale,
  niceNumber,
  niceTicks,
  dataDomain,
  includeInDomain,
  formatTick,
} from '../../../src/ext/dataviz/scale'
import { axes, ChartFrame } from '../../../src/ext/dataviz/frame'
import { legend, legendSize } from '../../../src/ext/dataviz/legend'
import { chart } from '../../../src/ext/dataviz/chart'

describe('linearScale', () => {
  it('maps domain to range linearly', () => {
    const s = linearScale([0, 10], [100, 300])
    expect(s(0)).toBe(100)
    expect(s(5)).toBe(200)
    expect(s(10)).toBe(300)
  })

  it('supports decreasing ranges (y-axis flip)', () => {
    const s = linearScale([0, 100], [200, 20])
    expect(s(0)).toBe(200)
    expect(s(100)).toBe(20)
  })

  it('throws on a degenerate domain', () => {
    expect(() => linearScale([3, 3], [0, 1])).toThrow(/degenerate/)
  })
})

describe('niceTicks', () => {
  it('widens to round step boundaries', () => {
    const { ticks, min, max, step } = niceTicks(3, 97, 5)
    expect(min).toBeLessThanOrEqual(3)
    expect(max).toBeGreaterThanOrEqual(97)
    expect(step).toBe(20)
    expect(ticks).toEqual([0, 20, 40, 60, 80, 100])
  })

  it('produces float-noise-free fractional steps', () => {
    // Heckbert picks a 0.2 step here; the point is clean decimals,
    // not 0.30000000000000004.
    const { ticks } = niceTicks(0, 0.3, 4)
    expect(ticks).toEqual([0, 0.2, 0.4])
    const fine = niceTicks(0, 0.6, 11)
    expect(fine.ticks).toEqual([0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6])
  })

  it('handles degenerate input', () => {
    const { ticks } = niceTicks(5, 5, 5)
    expect(ticks.length).toBeGreaterThan(1)
    expect(ticks).toContain(5)
  })

  it('niceNumber rounds to 1/2/5 × 10ⁿ', () => {
    expect(niceNumber(0.13, true)).toBeCloseTo(0.1)
    expect(niceNumber(0.26, true)).toBeCloseTo(0.2)
    expect(niceNumber(0.6, true)).toBeCloseTo(0.5)
    expect(niceNumber(0.9, true)).toBeCloseTo(1)
  })
})

describe('dataDomain / includeInDomain / formatTick', () => {
  it('computes the data extent per component', () => {
    const series = [[[1, 10], [2, 4]], [[0, 7], [3, 12]]] as const
    expect(dataDomain(series, 0)).toEqual([0, 3])
    expect(dataDomain(series, 1)).toEqual([4, 12])
    expect(dataDomain([], 0)).toEqual([0, 1])
  })

  it('includes the baseline for bars', () => {
    expect(includeInDomain([4, 12], 0)).toEqual([0, 12])
    expect(includeInDomain([-5, -2], 0)).toEqual([-5, 0])
  })

  it('formats ticks without float noise', () => {
    expect(formatTick(0.30000000000000004)).toBe('0.3')
    expect(formatTick(20)).toBe('20')
  })
})

describe('axes', () => {
  it('returns a frame mapping data to picture coordinates', () => {
    const pic = picture()
    const frame = axes(pic, {
      at: point(50, 230),
      width: 300,
      height: 200,
      x: { domain: [0, 10], exact: true },
      y: { domain: [0, 100], exact: true },
    })
    expect(frame).toBeInstanceOf(ChartFrame)
    expect(frame.x(0)).toBe(50)
    expect(frame.x(10)).toBe(350)
    expect(frame.y(0)).toBe(230)
    expect(frame.y(100)).toBe(30)
    expect(frame.point(5, 50)).toEqual(point(200, 130))
    expect(frame.area).toEqual([50, 30, 350, 230])
  })

  it('widens domains to nice ticks unless exact', () => {
    const pic = picture()
    const frame = axes(pic, {
      at: point(0, 100),
      width: 100,
      height: 100,
      y: { domain: [3, 97] },
    })
    expect(frame.yDomain).toEqual([0, 100])
  })

  it('draws gridlines, ticks and labels', () => {
    const svg = picture()
      .draw(point(0, 0)) // keep contentBounds honest
      .toSVG({ width: 10, height: 10 })
    expect(svg).toBeDefined()

    const pic = picture()
    axes(pic, {
      at: point(50, 230),
      width: 300,
      height: 200,
      x: { domain: [0, 10], label: 'time', grid: true },
      y: { domain: [0, 100], label: 'value', grid: true },
    })
    const out = pic.toSVG({ width: 400, height: 280 })
    expect(out).toContain('stroke="#e2e8f0"') // grid
    expect(out).toContain('>time</text>')
    expect(out).toContain('>value</text>')
    expect(out).toContain('>100</text>') // y tick label
  })
})

describe('ChartFrame series builders', () => {
  const frame = (pic: ReturnType<typeof picture>) =>
    axes(pic, {
      at: point(0, 100),
      width: 100,
      height: 100,
      x: { domain: [0, 10], exact: true },
      y: { domain: [0, 10], exact: true },
    })

  it('line() draws a polyline through data points', () => {
    const pic = picture()
    frame(pic).line([[0, 0], [5, 5], [10, 0]], { style: { stroke: '#2563eb' } })
    const svg = pic.toSVG({ width: 120, height: 120 })
    expect(svg).toContain('M 0 100 L 50 50 L 100 100')
    expect(svg).toContain('stroke="#2563eb"')
  })

  it('line() with smooth draws a curved path', () => {
    const pic = picture()
    frame(pic).line([[0, 0], [5, 5], [10, 0]], { smooth: true })
    const svg = pic.toSVG({ width: 120, height: 120 })
    expect(svg).toContain('C ')
  })

  it('line() with marks draws markers at data points', () => {
    const pic = picture()
    frame(pic).line([[0, 0], [10, 10]], { marks: 'o', style: { stroke: '#2563eb' } })
    const svg = pic.toSVG({ width: 120, height: 120 })
    // Two circle marks (open circles stroke the series color).
    const circles = svg.match(/<path[^>]*A 2\.5/g) ?? []
    expect(circles.length).toBe(2)
  })

  it('scatter() fills marks with the series color by default', () => {
    const pic = picture()
    frame(pic).scatter([[5, 5]], { style: { stroke: '#dc2626' } })
    const svg = pic.toSVG({ width: 120, height: 120 })
    expect(svg).toContain('fill="#dc2626"')
  })

  it('bars() draws rects from the baseline', () => {
    const pic = picture()
    frame(pic).bars([[2, 4], [4, 8]], { width: 10, style: { fill: '#f59e0b', stroke: 'none' } })
    const svg = pic.toSVG({ width: 120, height: 120 })
    const rects = svg.match(/<rect\b/g) ?? []
    expect(rects.length).toBe(2)
    expect(svg).toContain('fill="#f59e0b"')
    // Bar heights: 4/10 and 8/10 of the 100px plot height.
    expect(svg).toContain('height="40"')
    expect(svg).toContain('height="80"')
  })

  it('bars() clamps the baseline into the y domain', () => {
    const pic = picture()
    const f = axes(pic, {
      at: point(0, 100),
      width: 100,
      height: 100,
      y: { domain: [5, 10], exact: true },
    })
    f.bars([[6, 8]], { width: 10 })
    const svg = pic.toSVG({ width: 120, height: 120 })
    // Baseline clamps to 5 → bar spans 3/5 of the height.
    expect(svg).toContain('height="60"')
  })
})

describe('legend', () => {
  it('draws a swatch and label per entry', () => {
    const pic = picture()
    legend(pic, {
      at: point(10, 10),
      entries: [
        { label: 'alpha', style: { stroke: '#2563eb' } },
        { label: 'beta', style: { fill: '#f59e0b', stroke: 'none' }, sample: 'box' },
      ],
      frame: true,
    })
    const svg = pic.toSVG({ width: 200, height: 100 })
    expect(svg).toContain('>alpha</text>')
    expect(svg).toContain('>beta</text>')
    expect(svg).toContain('stroke="#2563eb"')
    expect(svg).toContain('fill="#f59e0b"')
    expect(svg).toContain('stroke="#cbd5e1"') // frame
  })

  it('legendSize accounts for labels and rows', () => {
    const size = legendSize({
      entries: [{ label: 'a' }, { label: 'longer label' }],
    })
    expect(size.height).toBe(2 * 18 + 12)
    expect(size.width).toBeGreaterThan(40)
  })
})

describe('chart', () => {
  it('auto-sizes domains from the data and pins bar baselines at 0', () => {
    const pic = picture()
    const frame = chart(pic, {
      at: point(50, 230),
      width: 300,
      height: 200,
      series: [
        { kind: 'bar', data: [[1, 42], [2, 58], [3, 49]], label: '2025', style: { fill: '#2563eb', stroke: 'none' } },
      ],
    })
    expect(frame.yDomain[0]).toBeLessThanOrEqual(0)
    expect(frame.yDomain[1]).toBeGreaterThanOrEqual(58)
  })

  it('draws every series kind and a default-positioned legend', () => {
    const pic = picture()
    chart(pic, {
      at: point(50, 230),
      width: 300,
      height: 200,
      x: { grid: true },
      series: [
        { data: [[0, 1], [1, 3], [2, 2]], label: 'line', style: { stroke: '#2563eb' } },
        { kind: 'scatter', data: [[0, 2], [2, 3]], label: 'pts', style: { stroke: '#dc2626' } },
        { kind: 'bar', data: [[1, 1]], label: 'bars', style: { fill: '#f59e0b', stroke: 'none' } },
      ],
      legend: true,
    })
    const svg = pic.toSVG({ width: 420, height: 300 })
    expect(svg).toContain('>line</text>')
    expect(svg).toContain('>pts</text>')
    expect(svg).toContain('>bars</text>')
    expect(svg).toContain('fill="#f59e0b"')
  })

  it('leaves unlabeled series out of the legend', () => {
    const pic = picture()
    chart(pic, {
      at: point(50, 230),
      width: 300,
      height: 200,
      series: [{ data: [[0, 1], [1, 2]] }],
      legend: true,
    })
    const svg = pic.toSVG({ width: 420, height: 300 })
    expect(svg).not.toContain('stroke="#cbd5e1"') // no legend frame
  })
})

describe('review fixes', () => {
  const at = point(50, 200)

  it('tickValues with a single value widens instead of throwing', () => {
    const pic = picture()
    const frame = axes(pic, { at, width: 100, height: 100, x: { tickValues: [5] } })
    expect(frame.xDomain).toEqual([4.5, 5.5])
    expect(frame.xTicks).toEqual([5])
  })

  it('tickValues with all-equal values widens instead of throwing', () => {
    const pic = picture()
    const frame = axes(pic, { at, width: 100, height: 100, x: { tickValues: [3, 3, 3] } })
    expect(frame.xDomain).toEqual([2.5, 3.5])
  })

  it('a flat exact domain widens instead of throwing', () => {
    const pic = picture()
    const frame = axes(pic, {
      at,
      width: 100,
      height: 100,
      y: { domain: [3, 3], exact: true },
    })
    expect(frame.yDomain).toEqual([2.5, 3.5])
    expect(frame.yTicks).toEqual([3])
  })

  it('a non-finite data point is skipped, not drawn into the path', () => {
    const pic = picture()
    const frame = axes(pic, {
      at,
      width: 100,
      height: 100,
      x: { domain: [0, 2], exact: true },
      y: { domain: [0, 2], exact: true },
    })
    frame.line([[0, 0], [1, NaN], [2, 2]])
    const svg = pic.toSVG({ width: 200, height: 220 })
    expect(svg).not.toContain('NaN')
    expect(svg).toContain('M 50 200 L 150 100') // endpoints survive
  })

  it('a bar series skips non-finite samples too', () => {
    const pic = picture()
    const frame = axes(pic, {
      at,
      width: 100,
      height: 100,
      x: { domain: [0, 4], exact: true },
      y: { domain: [0, 4], exact: true },
    })
    frame.bars([[1, 2], [2, NaN], [3, 4]])
    const svg = pic.toSVG({ width: 200, height: 220 })
    expect(svg).not.toContain('NaN')
    // two bars drawn, the NaN one dropped
    expect((svg.match(/<rect/g) ?? []).length).toBe(2)
  })

  it('a non-finite baseline falls back to 0 instead of blanking the bars', () => {
    const pic = picture()
    const frame = axes(pic, {
      at,
      width: 100,
      height: 100,
      x: { domain: [0, 2], exact: true },
      y: { domain: [0, 2], exact: true },
    })
    frame.bars([[1, 2]], { baseline: NaN })
    expect(pic.toSVG({ width: 200, height: 220 })).not.toContain('NaN')
  })

  it('auto domains ignore non-finite data', () => {
    expect(dataDomain([[[1, 2], [Infinity, 3], [NaN, -5]]], 0)).toEqual([1, 1])
    expect(dataDomain([[[NaN, NaN]]], 1)).toEqual([0, 1]) // falls back
    expect(niceTicks(NaN, NaN).ticks).toEqual([])
  })

  it('niceNumber guards non-positive and non-finite input', () => {
    expect(niceNumber(0, true)).toBe(1)
    expect(niceNumber(-3, false)).toBe(1)
    expect(niceNumber(NaN, true)).toBe(1)
    expect(niceNumber(Infinity, true)).toBe(1)
  })

  it('filled scatter marks take the series fill when stroke is none', () => {
    const pic = picture()
    const frame = axes(pic, { at, width: 100, height: 100 })
    frame.scatter([[0.5, 0.5]], { style: { fill: '#2563eb', stroke: 'none' } })
    const svg = pic.toSVG({ width: 200, height: 220 })
    expect(svg).toContain('fill="#2563eb"')
  })

  it('a one-point line series still draws its marks', () => {
    const pic = picture()
    const frame = axes(pic, { at, width: 100, height: 100 })
    frame.line([[0.5, 0.5]], { marks: 'o' })
    const svg = pic.toSVG({ width: 200, height: 220 })
    // The open-circle mark path renders even though no line can.
    expect(svg).toMatch(/A 2\.5 2\.5/)
  })

  it('legend defaults survive explicit undefined fields', () => {
    const explicit = legendSize({ entries: [{ label: 'a' }], fontSize: undefined })
    const defaults = legendSize({ entries: [{ label: 'a' }] })
    expect(explicit).toEqual(defaults)
  })

  it('legend frame accepts a custom style (dark canvas)', () => {
    const pic = picture()
    legend(pic, {
      at: point(10, 10),
      entries: [{ label: 'a' }],
      frame: { fill: '#0f172a', stroke: '#475569' },
    })
    const svg = pic.toSVG({ width: 120, height: 60 })
    expect(svg).toContain('fill="#0f172a"')
    expect(svg).toContain('stroke="#475569"')
  })

  it('tickValues + custom format draw categorical labels', () => {
    const pic = picture()
    axes(pic, {
      at,
      width: 120,
      height: 100,
      x: { tickValues: [1, 2], format: (v) => ['one', 'two'][v - 1] ?? '' },
    })
    const svg = pic.toSVG({ width: 200, height: 220 })
    expect(svg).toContain('>one</text>')
    expect(svg).toContain('>two</text>')
  })

  it('arrows: true puts arrowheads on both axis ends', () => {
    const pic = picture()
    axes(pic, { at, width: 100, height: 100, arrows: true })
    const svg = pic.toSVG({ width: 200, height: 220 })
    expect(svg).toContain('marker-end')
  })

  it('exact: true keeps the domain verbatim and drops outlying ticks', () => {
    const pic = picture()
    const frame = axes(pic, {
      at,
      width: 100,
      height: 100,
      y: { domain: [3, 97], exact: true },
    })
    expect(frame.yDomain).toEqual([3, 97])
    for (const t of frame.yTicks) {
      expect(t).toBeGreaterThanOrEqual(3)
      expect(t).toBeLessThanOrEqual(97)
    }
  })
})
