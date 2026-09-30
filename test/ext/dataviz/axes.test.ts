/**
 * Axis parity — dataviz phase 1: logarithmic axes, minor ticks and
 * grids, include values, extra ticks, padding, snap presets, the
 * school-book axis system, tick sides, end labels, rotated and
 * staggered tick labels, and clipping.
 */
import { describe, it, expect } from 'vitest'
import { point } from '../../../src/core/Point'
import { picture } from '../../../src/picture/Picture'
import {
  logScale,
  logTicks,
  formatLogTick,
  minorTicksBetween,
  niceNumber,
  niceTicks,
} from '../../../src/ext/dataviz/scale'
import { axes } from '../../../src/ext/dataviz/frame'
import { chart } from '../../../src/ext/dataviz/chart'

const at = point(50, 200)

describe('log scale and ticks', () => {
  it('logTicks: decades as majors, mantissas as minors, or all majors on a short axis', () => {
    expect(logTicks(1, 1000)).toEqual({
      major: [1, 10, 100, 1000],
      minor: [2, 3, 4, 5, 6, 7, 8, 9, 20, 30, 40, 50, 60, 70, 80, 90, 200, 300, 400, 500, 600, 700, 800, 900],
    })
    expect(logTicks(1, 5)).toEqual({ major: [1, 2, 3, 4, 5], minor: [] })
    expect(logTicks(0.01, 0.1, false)).toEqual({ major: [0.01, 0.1], minor: [] })
    expect(logTicks(0, 10)).toEqual({ major: [], minor: [] })
  })

  it('logScale maps in log10 both ways and rejects bad domains', () => {
    const s = logScale([1, 1000], [0, 300])
    expect(s.kind).toBe('log')
    expect(s.map(1)).toBe(0)
    expect(s.map(10)).toBeCloseTo(100)
    expect(s.map(1000)).toBeCloseTo(300)
    expect(s.invert(200)).toBeCloseTo(100)
    expect(s.ticks().filter((t) => !t.minor).map((t) => t.label)).toEqual(['1', '10', '100', '1000'])
    expect(s.ticks().filter((t) => t.minor)).toHaveLength(24)
    expect(() => logScale([0, 10], [0, 1])).toThrow(/positive/)
    expect(() => logScale([5, 5], [0, 1])).toThrow(/degenerate/)
  })

  it('formatLogTick prints big and small decades as powers', () => {
    expect(formatLogTick(100000)).toBe('10⁵')
    expect(formatLogTick(0.0001)).toBe('10⁻⁴')
    expect(formatLogTick(1000)).toBe('1000')
    expect(formatLogTick(0.5)).toBe('0.5')
    expect(formatLogTick(2e6)).toBe('2000000')
  })

  it('axes() with logarithmic: y widens to decades, draws minors, chart() drops non-positives', () => {
    const pic = picture()
    const frame = axes(pic, {
      at,
      width: 100,
      height: 100,
      x: { domain: [0, 10], exact: true },
      y: { domain: [3, 400], logarithmic: true, grid: 'both' },
    })
    expect(frame.yDomain).toEqual([1, 1000])
    expect(frame.yTicks).toEqual([1, 10, 100, 1000])
    expect(frame.yMinorTicks).toHaveLength(24)
    expect(frame.y(10)).toBeCloseTo(200 - 100 / 3)
    const svg = pic.toSVG({ width: 200, height: 220 })
    expect(svg).toContain('stroke="#f1f5f9"') // minor grid
    expect(svg).toMatch(/x1="48" x2="50" y1="[\d.]+" y2="[\d.]+"/) // a 2px minor tick, outer side of the y axis
    expect(() => axes(picture(), { at, width: 1, height: 1, y: { domain: [-1, 1], logarithmic: true } })).toThrow(/positive/)

    const c = chart(picture(), {
      at,
      width: 100,
      height: 100,
      y: { logarithmic: true },
      series: [{ data: [[1, 0], [2, 5], [3, -2], [4, 50]], kind: 'bar' }],
    })
    expect(c.yDomain).toEqual([1, 100])
    expect(axes(picture(), { at, width: 1, height: 1, y: { domain: [2, 30], logarithmic: true, exact: true, minorTicks: 0 } }).yMinorTicks).toEqual([])
  })
})

describe('tick placement options', () => {
  it('minorTicksBetween and minorTicks/grid on a linear axis', () => {
    expect(minorTicksBetween([0, 1, 2], 4)).toEqual([0.2, 0.4, 0.6, 0.8, 1.2, 1.4, 1.6, 1.8])
    expect(minorTicksBetween([0, 10], 0)).toEqual([])
    const pic = picture()
    const frame = axes(pic, { at, width: 100, height: 100, x: { domain: [0, 10], exact: true, minorTicks: 1, grid: 'minor' } })
    expect(frame.xMinorTicks).toEqual([1, 3, 5, 7, 9])
    const svg = pic.toSVG({ width: 200, height: 220 })
    expect(svg.match(/stroke="#f1f5f9"/g)).toHaveLength(5) // minor grid only
    expect(svg).not.toContain('stroke="#e2e8f0"')
  })

  it('about presets snap the step differently', () => {
    expect(niceNumber(2.5, true, 'decimal')).toBe(1)
    expect(niceNumber(2.5, true, 'half')).toBe(5)
    expect(niceNumber(2.5, true, 'quarter')).toBe(2.5)
    expect(niceNumber(0.25, true, 'int')).toBe(1)
    expect(niceTicks(0, 3, 5, 'int').ticks).toEqual([0, 1, 2, 3])
    expect(niceTicks(0, 10, 5, 'quarter').step).toBe(2.5)
  })

  it('includeValue, alsoAt and padding widen and add', () => {
    const f = axes(picture(), {
      at,
      width: 100,
      height: 100,
      x: { domain: [2, 8], includeValue: 0, alsoAt: [7.5] },
      y: { domain: [10, 20], padding: [0, 5], exact: true },
    })
    expect(f.xDomain).toEqual([0, 8])
    expect(f.xTicks).toEqual([0, 2, 4, 6, 7.5, 8])
    expect(f.yDomain).toEqual([10, 25])
    const g = axes(picture(), { at, width: 100, height: 100, x: { domain: [1, 2], includeValue: [-1, 5], padding: 1 } })
    expect(g.xDomain).toEqual([-2, 6])
    // A single explicit tick still widens instead of throwing; alsoAt
    // adds a tick without widening the domain (TikZ `also at`).
    const h = axes(picture(), { at, width: 100, height: 100, x: { tickValues: [5], alsoAt: [6] } })
    expect(h.xDomain).toEqual([4.5, 5.5])
    expect(h.xTicks).toEqual([5, 6])
  })

  it('labelEvery thins labels, rotateLabels rotates, stackLabels staggers', () => {
    const pic = picture()
    axes(pic, {
      at,
      width: 100,
      height: 100,
      x: { domain: [0, 10], exact: true, labelEvery: 2, rotateLabels: -45 },
      y: { domain: [0, 10], exact: true, tickLabels: false },
    })
    const svg = pic.toSVG({ width: 200, height: 220 })
    const labels = svg.match(/<text[^>]*>[^<]*<\/text>/g)!
    expect(labels.map((l) => l.replace(/<[^>]*>/g, ''))).toEqual(['0', '4', '8'])
    expect(labels[0]).toMatch(/text-anchor="end"/)
    expect(labels[0]).toMatch(/rotate\(-45/)

    const pic2 = picture()
    axes(pic2, { at, width: 100, height: 100, x: { domain: [0, 4], exact: true, stackLabels: true } })
    const ys = [...pic2.toSVG({ width: 200, height: 220 }).matchAll(/<text[^>]* y="([\d.]+)"/g)].map((m) => Number(m[1]))
    const xs = ys.slice(0, 5)
    expect(xs[1]).toBeGreaterThan(xs[0]!)
    expect(xs[2]).toBe(xs[0])
    expect(xs[3]).toBe(xs[1])
  })
})

describe('axis systems', () => {
  it('schoolBook runs the axes through the origin with arrows, centred ticks and one 0', () => {
    const pic = picture()
    const frame = axes(pic, {
      at,
      width: 100,
      height: 100,
      axisSystem: 'schoolBook',
      x: { domain: [-5, 5], exact: true, label: 'x' },
      y: { domain: [-5, 5], exact: true, label: 'y' },
    })
    const svg = pic.toSVG({ width: 300, height: 300 })
    // x axis at y=150 (0), y axis at x=100 (0), both arrowed.
    expect(svg).toMatch(/marker-end/)
    expect(svg).toMatch(/<path d="M 50 150 L 1[0-9.]+ 150"/) // x axis (an arrowed edge is a path)
    expect(svg).toMatch(/<path d="M 100 200 L 100 1[0-9.]+"/) // y axis
    // Centred tick: 2px each side of the axis.
    expect(svg).toMatch(/x1="100" x2="100" y1="148" y2="152"/)
    // One "0" only; end labels beside the arrows.
    expect(svg.match(/>0</g)).toHaveLength(1)
    expect(svg).toMatch(/x="156"[^>]*>x</)
    expect(svg).toMatch(/x="100" y="92">y</)
    expect(frame.outerArea[2]).toBeGreaterThan(150) // the end label counts
    expect(frame.outerArea[3]).toBe(200) // no decoration below: the axis is mid-area
  })

  it('schoolBook falls back to the low edge when 0 is outside the domain or the axis is log/band', () => {
    const pic = picture()
    axes(pic, {
      at,
      width: 100,
      height: 100,
      axisSystem: 'schoolBook',
      x: { domain: [2, 4], exact: true },
      y: { domain: [1, 100], logarithmic: true },
    })
    const svg = pic.toSVG({ width: 300, height: 300 })
    expect(svg).toMatch(/<path d="M 50 200 L 1[0-9.]+ 200"/)
    expect(svg).toMatch(/<path d="M 50 200 L 50 1[0-9.]+"/)
  })

  it('tickSide inner and outer, labelStyle end on the scientific system', () => {
    const pic = picture()
    axes(pic, {
      at,
      width: 100,
      height: 100,
      tickSide: 'inner',
      labelStyle: 'end',
      x: { domain: [0, 10], exact: true, label: 'n' },
    })
    const svg = pic.toSVG({ width: 300, height: 300 })
    expect(svg).toMatch(/x1="70" x2="70" y1="196" y2="200"/) // tick goes up into the area
    expect(svg).toMatch(/x="156" y="200">n</)
    expect(svg).not.toMatch(/y1="200" y2="204"/)
  })

  it('clip puts everything drawn through the frame in a clipped scope', () => {
    const pic = picture()
    const frame = axes(pic, { at, width: 100, height: 100, clip: true, x: { domain: [0, 10], exact: true }, y: { domain: [0, 10], exact: true } })
    frame.line([[0, 0], [20, 20]])
    const svg = pic.toSVG({ width: 300, height: 300 })
    expect(svg).toMatch(/<clipPath id="jikz-clip-0"><path d="M 50 100 L 150 100 L 150 200 L 50 200 Z"/)
    expect(svg).toMatch(/<g class="jikz-plot-area" clip-path="url\(#jikz-clip-0\)"><path class="jikz-series/)
    // Direct and reference labels escape the clip: they are drawn after the scope, on the picture.
    frame.line([[0, 5], [10, 5]], { label: 'flat', labelInData: 'end' }).referenceLine({ y: 2, label: 'ref' })
    const svg2 = pic.toSVG({ width: 300, height: 300 })
    // The clipped group closes before either label appears.
    expect(svg2.indexOf('>flat<')).toBeGreaterThan(svg2.indexOf('</g>'))
    expect(svg2.indexOf('>ref<')).toBeGreaterThan(svg2.indexOf('</g>'))
    expect(svg2.match(/<g class="jikz-plot-area"/g)).toHaveLength(1)
    // Unclipped by default.
    const pic2 = picture()
    axes(pic2, { at, width: 100, height: 100 }).line([[0, 0], [1, 1]])
    expect(pic2.toSVG({ width: 300, height: 300 })).not.toContain('clipPath')
  })
})
