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
  functionScale,
  spreadTicks,
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

describe('custom axis function', () => {
  // Winning chances: pawns through a sigmoid.
  const k = 0.368
  const winning = {
    forward: (p: number) => 2 / (1 + Math.exp(-k * p)) - 1,
    inverse: (u: number) => -Math.log(2 / (u + 1) - 1) / k,
  }

  it('functionScale is linear in forward(value), both ways', () => {
    const s = functionScale([-10, 10], [200, 0], winning)
    expect(s.kind).toBe('function')
    expect(s.map(0)).toBeCloseTo(100, 6)
    expect(s.map(-10)).toBe(200)
    expect(s.map(10)).toBeCloseTo(0, 6)
    // The first pawn takes far more room than the fifth, and the ninth almost none.
    expect(s.map(0) - s.map(1)).toBeGreaterThan(1.5 * (s.map(4) - s.map(5)))
    expect(s.map(0) - s.map(1)).toBeGreaterThan(5 * (s.map(8) - s.map(9)))
    for (const v of [-7, -1, 0, 0.5, 3]) expect(s.invert(s.map(v))).toBeCloseTo(v, 6)
    expect(s.ticks().every((t) => t.value >= -10 && t.value <= 10)).toBe(true)
    expect(() => functionScale([1, 5], [0, 100], { forward: () => 3, inverse: (u) => u })).toThrow(/distinct/)
  })

  it('inverse is optional: a monotone forward is inverted numerically', () => {
    const given = functionScale([-10, 10], [200, 0], winning)
    const derived = functionScale([-10, 10], [200, 0], { forward: winning.forward })
    for (const px of [0, 37, 100, 150, 200]) expect(derived.invert(px)).toBeCloseTo(given.invert(px), 6)
    // A falling function inverts too.
    const falling = functionScale([1, 100], [0, 100], { forward: (v) => -Math.sqrt(v) })
    expect(falling.invert(falling.map(49))).toBeCloseTo(49, 6)
  })

  it('auto ticks spread evenly on the page, on round values', () => {
    // Data-even ticks on the sigmoid sit at 200, 176, 100, 24, 0 px: bunched at the ends.
    const s = functionScale([-10, 10], [200, 0], winning)
    const ticks = s.ticks(5).map((t) => t.value)
    expect(ticks).toEqual([-10, -3, 0, 3, 10])
    const px = ticks.map((v) => s.map(v))
    const gaps = px.slice(1).map((p, i) => px[i]! - p)
    expect(Math.max(...gaps) / Math.min(...gaps)).toBeLessThan(1.3)
    expect(spreadTicks(-10, 10, 5, (v) => v)).toEqual([-10, -5, 0, 5, 10]) // linear: the usual ticks
    // The axis uses them when no tickValues are given, and alsoAt still adds.
    const frame = axes(picture(), { at, width: 100, height: 200, y: { domain: [-10, 10], exact: true, scale: winning, alsoAt: [1] } })
    expect(frame.yTicks).toEqual([-10, -3, 0, 1, 3, 10])
    const sqrt = axes(picture(), { at, width: 100, height: 200, y: { domain: [0, 100], scale: { forward: Math.sqrt }, ticks: 5 } })
    expect(sqrt.yTicks[0]).toBe(0)
    expect(sqrt.yTicks[sqrt.yTicks.length - 1]).toBe(100)
    expect(sqrt.yTicks[1]).toBeLessThan(15) // crowded low, where sqrt is steep
  })

  it('an axis with scale places ticks and gridlines through the function', () => {
    const pic = picture()
    const frame = axes(pic, {
      at,
      width: 100,
      height: 200,
      x: { domain: [0, 10], exact: true },
      y: { domain: [-10, 10], exact: true, scale: winning, tickValues: [-5, -2, -1, 0, 1, 2, 5], grid: true },
    })
    expect(frame.yScale.kind).toBe('function')
    expect(frame.y(0)).toBeCloseTo(100, 6)
    const ys = frame.yTicks.map((t) => frame.y(t))
    // Symmetric about zero, crowding towards the ends.
    expect(ys[0]! - 100).toBeCloseTo(100 - ys[6]!, 6)
    // …per pawn: −1→0 is one pawn, −5→−2 is three.
    expect(ys[2]! - ys[3]!).toBeGreaterThan((ys[0]! - ys[1]!) / 3)
    const svg = pic.toSVG({ width: 200, height: 260 })
    expect(svg.match(/stroke="#e2e8f0"/g)).toHaveLength(7) // one gridline per pawn guide
    expect(frame.invertY(frame.y(2))).toBeCloseTo(2, 6)
    // Series, hits and reference marks go through it like any scale.
    frame.line([[0, -3], [10, 4]], { id: 's' })
    expect(frame.hitTest(point(50, 100))!.samples[0]!.y).toBe(-3)
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

  it('the tick count is honoured: the step is searched for, not rounded to', () => {
    // The field report: about a hundred points, four ticks asked for.
    expect(niceTicks(1460, 1560, 4, 'standard', { exact: true }).ticks).toEqual([1475, 1500, 1525, 1550])
    expect(niceTicks(1460, 1560, 4, 'heckbert', { exact: true }).ticks).toEqual([1500, 1550])
    expect(niceTicks(1452, 1548, 4, 'standard', { exact: true }).ticks.length).toBeGreaterThanOrEqual(3)
    expect(niceTicks(1452, 1548, 4, 'heckbert', { exact: true }).ticks).toEqual([1500])
    // Eight asked for on [0, 100]: six, not eleven.
    expect(niceTicks(0, 100, 8).ticks).toHaveLength(6)
    expect(niceTicks(0, 100, 8, 'heckbert').ticks).toHaveLength(11)
    // The common defaults do not move: 1/2/5 steps stay first choice,
    // 2.5 only when it is clearly nearer the count.
    expect(niceTicks(0, 100, 5).ticks).toEqual([0, 20, 40, 60, 80, 100])
    expect(niceTicks(0, 10, 5).step).toBe(2)
    expect(niceTicks(3, 97, 5).ticks).toEqual([0, 20, 40, 60, 80, 100])
    // A range that is not widened keeps its ends.
    const exact = niceTicks(1460, 1560, 4, 'standard', { exact: true })
    expect([exact.min, exact.max]).toEqual([1460, 1560])
  })

  it('minTicks rejects a step that leaves too few; an axis takes it and exact together', () => {
    expect(niceTicks(0, 100, 2).ticks).toEqual([0, 100])
    expect(niceTicks(0, 100, 2, 'standard', { minTicks: 4 }).ticks.length).toBeGreaterThanOrEqual(4)
    const f = axes(picture(), {
      at,
      width: 100,
      height: 100,
      y: { domain: [1460, 1560], exact: true, ticks: 4 },
    })
    expect(f.yTicks).toEqual([1475, 1500, 1525, 1550])
    const old = axes(picture(), { at, width: 100, height: 100, y: { domain: [1460, 1560], exact: true, ticks: 4, about: 'heckbert' } })
    expect(old.yTicks).toEqual([1500, 1550])
    const many = axes(picture(), { at, width: 100, height: 100, y: { domain: [0, 100], ticks: 2, minTicks: 5 } })
    expect(many.yTicks.length).toBeGreaterThanOrEqual(5)
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

  it('a clipped frame drops labels, reference labels and hits whose anchor is off the plot', () => {
    const build = (clip: boolean) => {
      const pic = picture()
      const frame = axes(pic, { at, width: 100, height: 100, clip, x: { domain: [8, 12], exact: true }, y: { domain: [0, 20], exact: true } })
      const data: [number, number][] = Array.from({ length: 21 }, (_, i) => [i, i])
      frame.line(data, { id: 's', label: 'series', valueLabels: true, labelInData: 'end' })
      frame.referenceLine({ x: 18, label: 'far' }).referenceLine({ x: 10, label: 'near' })
      frame.referenceArea({ x1: 15, x2: 19, label: 'gone' }).referenceArea({ x1: 2, x2: 10, label: 'half' })
      frame.referenceDot(2, 5, { label: 'dot-out' }).referenceDot(10, 10, { label: 'dot-in' })
      return { frame, svg: pic.toSVG({ fit: true, padding: 12 }) }
    }
    const width = (svg: string) => Number(svg.match(/viewBox="[\d.-]+ [\d.-]+ ([\d.]+)/)![1])
    const open = build(false)
    const clipped = build(true)
    // Unclipped, everything is drawn — TikZ's rule — and the picture is as wide as the data.
    expect(open.svg.match(/class="jikz-value-label/g)).toHaveLength(21)
    expect(width(open.svg)).toBeGreaterThan(400)
    // Clipped: five samples on the plot (x = 8…12), five value labels, a fitted picture.
    expect(clipped.svg.match(/class="jikz-value-label/g)).toHaveLength(5)
    expect(width(clipped.svg)).toBeLessThan(200) // the plot, its margins, and the end label
    // 'end' is the last sample ON the plot.
    expect(clipped.svg).toMatch(/<text class="jikz-series-label[^>]*>series</)
    const endLabelX = Number(clipped.svg.match(/<text class="jikz-series-label[^>]* x="([\d.]+)"/)![1])
    expect(endLabelX).toBeGreaterThan(150)
    expect(endLabelX).toBeLessThan(190)
    // Reference labels: kept on the plot, dropped off it, re-centred when half shows.
    for (const kept of ['near', 'half', 'dot-in']) expect(clipped.svg).toContain(`>${kept}<`)
    for (const dropped of ['far', 'gone', 'dot-out']) expect(clipped.svg).not.toContain(`>${dropped}<`)
    for (const all of ['far', 'gone', 'dot-out', 'near']) expect(open.svg).toContain(`>${all}<`)
    const halfX = Number(clipped.svg.match(/<text class="jikz-reference-label"[^>]* x="([\d.]+)"[^>]*>half</)![1])
    expect(halfX).toBe(75) // the visible part runs x 8…10 → 50…100
    // Hits stay on the plot.
    const hit = clipped.frame.hitTest(point(51, 150))!
    expect(hit.samples[0]!.x).toBe(8)
    expect(open.frame.hitTest(point(51, 150))!.samples[0]!.x).toBe(8)
    const near = clipped.frame.hitTest(point(60, 150), { mode: 'nearest' })!
    expect(near.x).toBeGreaterThanOrEqual(8)
    expect(build(true).frame.clipped).toBe(true)
    expect(open.frame.clipped).toBe(false)
  })

  it('clip puts everything drawn through the frame in a clipped scope', () => {
    const pic = picture()
    const frame = axes(pic, { at, width: 100, height: 100, clip: true, x: { domain: [0, 10], exact: true }, y: { domain: [0, 10], exact: true } })
    frame.line([[0, 0], [20, 20]])
    const svg = pic.toSVG({ width: 300, height: 300 })
    expect(svg).toMatch(/<clipPath id="jikz-clip-[0-9a-z]+"><path d="M 50 100 L 150 100 L 150 200 L 50 200 Z"/)
    expect(svg).toMatch(/<g class="jikz-plot-area" clip-path="url\(#jikz-clip-[0-9a-z]+\)"><path class="jikz-series/)
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
