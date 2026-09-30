/**
 * Style sheets and legend layout — dataviz phase 3. Series without a
 * style draw from the sheet; legends lay out in grids and land at
 * named placements; entries and rows carry the series id.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { point } from '../../../src/core/Point'
import { picture } from '../../../src/picture/Picture'
import { setWarningHandler } from '../../../src/core/errors'
import {
  styleSheets,
  resolveStyleSheet,
  slotOf,
  VARY_HUE,
  VARY_HUE_DARK,
} from '../../../src/ext/dataviz/stylesheet'
import { axes } from '../../../src/ext/dataviz/frame'
import { chart, type LegendPlacement } from '../../../src/ext/dataviz/chart'
import { legend, legendSize } from '../../../src/ext/dataviz/legend'

const at = point(50, 200)
const frame10 = (pic: ReturnType<typeof picture>, styleSheet?: Parameters<typeof axes>[1]['styleSheet']) =>
  axes(pic, {
    at,
    width: 100,
    height: 100,
    x: { domain: [0, 10], exact: true },
    y: { domain: [0, 10], exact: true },
    ...(styleSheet !== undefined && { styleSheet }),
  })

afterEach(() => setWarningHandler(null))

describe('style sheets', () => {
  it('the palettes are eight validated hues, light and dark, in fixed order', () => {
    expect(VARY_HUE).toHaveLength(8)
    expect(VARY_HUE_DARK).toHaveLength(8)
    expect(VARY_HUE[0]).toBe('#2a78d6')
    expect(styleSheets.varyHue.colors).toBe(VARY_HUE)
    expect(new Set([...VARY_HUE, ...VARY_HUE_DARK]).size).toBeGreaterThan(8)
  })

  it('resolves names, values, and compositions where later entries win', () => {
    expect(resolveStyleSheet('crossMarks')).toEqual({ marks: ['cross'] })
    expect(resolveStyleSheet(['varyHue', 'crossMarks'])).toEqual({ colors: VARY_HUE, marks: ['cross'] })
    expect(resolveStyleSheet([{ colors: ['#000'] }, 'grayScale']).colors).toBe(styleSheets.grayScale.colors)
    expect(() => resolveStyleSheet('nope' as never)).toThrow(/Unknown style sheet "nope"/)
  })

  it('slotOf assigns by index, wraps colours with a dash, and repeats single marks', () => {
    const sheet = resolveStyleSheet(['varyHue', 'oMark'])
    expect(slotOf(sheet, 0)).toEqual({ color: VARY_HUE[0], mark: 'circle', wrapped: false })
    expect(slotOf(sheet, 7).color).toBe(VARY_HUE[7])
    expect(slotOf(sheet, 8)).toMatchObject({ color: VARY_HUE[0], dash: 'dashed', wrapped: true })
    expect(slotOf(sheet, 17)).toMatchObject({ color: VARY_HUE[1], dash: 'dotted', wrapped: true })
    // A sheet with its own dashes keeps them on wrap.
    const dashed = resolveStyleSheet(['grayScale', 'varyDashing'])
    expect(slotOf(dashed, 5)).toMatchObject({ color: '#111827', dash: 'loosely dashed', wrapped: true })
    expect(slotOf({}, 3)).toEqual({ wrapped: false })
  })

  it('unstyled series draw from the sheet by kind; an explicit style layers over the slot', () => {
    const pic = picture()
    const frame = frame10(pic)
    frame.line([[0, 0], [10, 10]])
    frame.scatter([[5, 5]])
    frame.bars([[2, 4]])
    frame.line([[0, 1], [10, 9]], { style: { stroke: '#123456' } })
    const [l, s, b, e] = frame.series
    expect(l!.style).toEqual({ stroke: VARY_HUE[0], strokeWidth: 2 })
    expect(s!.style).toEqual({ stroke: VARY_HUE[1] })
    expect(s!.mark).toBe('circleFilled')
    expect(b!.style).toEqual({ fill: VARY_HUE[2], stroke: 'none' })
    // An explicit style layers over the slot: colour replaced, width kept.
    expect(e!.style).toEqual([{ stroke: VARY_HUE[3], strokeWidth: 2 }, { stroke: '#123456' }])
    const svg = pic.toSVG({ width: 200, height: 220 })
    expect(svg).toContain(`stroke="${VARY_HUE[0]}" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="1" stroke-width="2"`)
    expect(svg).toContain(`fill="${VARY_HUE[1]}"`) // the filled scatter mark
    expect(svg).toContain(`fill="${VARY_HUE[2]}"`) // the bar
    // Scatter marks are 8px (radius 4); line marks stay 6px.
    expect(svg).toMatch(/A 4 4/)
  })

  it('marks and dashes come from the sheet unless the builder says otherwise', () => {
    const pic = picture()
    const frame = frame10(pic, ['varyHue', 'crossMarks', 'varyDashing'])
    frame.line([[0, 0], [10, 10]])
    frame.line([[0, 1], [10, 9]], { marks: 'square' })
    frame.scatter([[1, 1]], { marks: 'diamond' })
    expect(frame.series[0]!.mark).toBe('cross')
    expect(frame.series[0]!.style).toEqual({ stroke: VARY_HUE[0], strokeWidth: 2 }) // slot 0 is solid
    expect(frame.series[1]!.mark).toBe('square')
    expect(frame.series[1]!.style).toEqual({ stroke: VARY_HUE[1], strokeWidth: 2, dash: 'dashed' })
    expect(frame.series[2]!.mark).toBe('diamond')
    expect(pic.toSVG({ width: 200, height: 220 })).toContain('stroke-dasharray')
  })

  it('a null sheet paints ink lines, slate bars, and default marks', () => {
    const frame = frame10(picture(), null)
    frame.line([[0, 0], [10, 10]]).bars([[1, 1]]).scatter([[2, 2]])
    expect(frame.styleSheet).toBeNull()
    expect(frame.series[0]!.style).toEqual({ stroke: '#0f172a', strokeWidth: 2 })
    expect(frame.series[1]!.style).toEqual({ fill: '#64748b', stroke: 'none' })
    expect(frame.series[2]!.style).toBeUndefined()
    expect(frame.series[2]!.mark).toBe('circleFilled')
    // With no slot, an explicit style stands alone.
    frame.scatter([[3, 3]], { style: { stroke: 'red' } })
    expect(frame.series[3]!.style).toEqual({ stroke: 'red' })
  })

  it('a partial explicit style keeps the slot colour', () => {
    const frame = frame10(picture())
    frame.line([[0, 0], [10, 10]], { style: { dash: 'dashed' } })
    frame.bars([[1, 1]], { style: { fillOpacity: 0.5 } })
    expect(frame.series[0]!.style).toEqual([{ stroke: VARY_HUE[0], strokeWidth: 2 }, { dash: 'dashed' }])
    expect(frame.series[1]!.style).toEqual([{ fill: VARY_HUE[1], stroke: 'none' }, { fillOpacity: 0.5 }])
  })

  it('a ninth series wraps with a dash and warns once', () => {
    const warnings: string[] = []
    setWarningHandler((m) => warnings.push(m))
    const frame = frame10(picture())
    for (let i = 0; i < 10; i++) frame.line([[0, i], [10, i]])
    expect(frame.series[8]!.style).toEqual({ stroke: VARY_HUE[0], strokeWidth: 2, dash: 'dashed' })
    expect(frame.series[9]!.style).toEqual({ stroke: VARY_HUE[1], strokeWidth: 2, dash: 'dashed' })
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toMatch(/series 9 wraps the 8-colour style sheet/)
  })

  it('chart() legends show the effective paint and carry series ids', () => {
    const pic = picture()
    chart(pic, {
      at,
      width: 100,
      height: 100,
      series: [
        { data: [[0, 1], [1, 2]], label: 'a' },
        { data: [[0, 1], [1, 2]], label: 'b', kind: 'bar', id: 'bars' },
      ],
      legend: true,
    })
    const svg = pic.toSVG({ width: 200, height: 220 })
    expect(svg).toMatch(/class="jikz-legend-entry jikz-legend-series-0" data-series="series-0"[^>]*stroke="#2a78d6"/)
    expect(svg).toMatch(/class="jikz-legend-entry jikz-legend-bars" data-series="bars" fill="#eb6834"/)
    // The label text is tagged too.
    expect(svg).toMatch(/<text class="jikz-legend-entry jikz-legend-bars" data-series="bars"[^>]*>b</)
  })

  it('axes take recessive strokes and slate ink, overridable', () => {
    const pic = picture()
    axes(pic, { at, width: 100, height: 100, x: { label: 'n' }, textStyle: { fontFamily: 'Inter' } })
    const svg = pic.toSVG({ width: 200, height: 240 })
    expect(svg).toContain('stroke="#94a3b8"')
    expect(svg).toMatch(/fill="#475569" font-family="Inter" font-size="10"/)
    expect(svg).toMatch(/fill="#334155" font-family="Inter" font-size="11"[^>]*>n</)
  })
})

describe('legend layout', () => {
  const entries = [{ label: 'aa' }, { label: 'b' }, { label: 'cccc' }, { label: 'dd' }, { label: 'e' }]

  it('lays out one column by default, or a grid from columns/rows', () => {
    const one = legendSize({ entries })
    expect(one.height).toBe(6 * 2 + 5 * 18)
    const grid = legendSize({ entries, columns: 2 })
    expect(grid.height).toBe(6 * 2 + 3 * 18)
    expect(grid.width).toBeGreaterThan(one.width)
    const rows = legendSize({ entries, rows: 2 })
    expect(rows.height).toBe(6 * 2 + 2 * 18)
    expect(legendSize({ entries, columns: 5 }).height).toBe(6 * 2 + 18)
    // No entries: still three swatch columns and one row, never NaN.
    expect(legendSize({ entries: [], columns: 3 })).toEqual({ width: 12 + 3 * 28 + 2 * 14, height: 12 + 18 })
  })

  it('fills down then right by default, or right then down', () => {
    const rowOf = (fillOrder: 'downThenRight' | 'rightThenDown', label: string) => {
      const pic = picture()
      legend(pic, { at: point(0, 0), entries, columns: 2, fillOrder })
      const m = pic.toSVG({ width: 300, height: 100 }).match(new RegExp(`<text[^>]* y="([\\d.]+)"[^>]*>${label}<`))
      return Number(m![1])
    }
    // downThenRight: a b c fill the first column, d e the second.
    expect(rowOf('downThenRight', 'cccc')).toBe(rowOf('downThenRight', 'aa') + 36)
    expect(rowOf('downThenRight', 'dd')).toBe(rowOf('downThenRight', 'aa'))
    // rightThenDown: a b on row one, c d on row two.
    expect(rowOf('rightThenDown', 'b')).toBe(rowOf('rightThenDown', 'aa'))
    expect(rowOf('rightThenDown', 'cccc')).toBe(rowOf('rightThenDown', 'aa') + 18)
  })

  it('columns take their width from their widest label', () => {
    const pic = picture()
    legend(pic, { at: point(0, 0), entries, columns: 2 })
    const svg = pic.toSVG({ width: 300, height: 100 })
    const xs = [...svg.matchAll(/<text[^>]* x="([\d.]+)"/g)].map((m) => Number(m[1]))
    expect(new Set(xs).size).toBe(2) // two label columns
    expect(legendSize({ entries, columns: 2 }).width).toBe(
      legendSize({ entries: entries.slice(0, 3) }).width + legendSize({ entries: entries.slice(3) }).width - 12 + 14
    )
  })
})

describe('legend placement in chart()', () => {
  const build = (place: LegendPlacement, extra: Record<string, unknown> = {}) => {
    const pic = picture()
    const frame = chart(pic, {
      at,
      width: 100,
      height: 100,
      x: { label: 'x' },
      y: { label: 'y' },
      series: [
        { data: [[0, 0], [10, 10]], label: 'a' },
        { data: [[0, 10], [10, 0]], label: 'b' },
      ],
      legend: { place, ...extra },
    })
    const svg = pic.toSVG({ width: 400, height: 400 })
    // The legend frame rect, when framed; else the first legend line.
    const rectM = svg.match(/<rect[^>]* x="([\d.-]+)"[^>]*y="([\d.-]+)"/)
    return { frame, svg, rect: rectM && { x: Number(rectM[1]), y: Number(rectM[2]) } }
  }

  it('inside placements are framed and inset from the plot area', () => {
    const { frame, rect } = build('northWestInside')
    const [x0, y0] = frame.plotArea
    expect(rect).toEqual({ x: x0 + 8, y: y0 + 8 })
    const se = build('southEastInside')
    expect(se.rect!.x + 8).toBeLessThan(se.frame.plotArea[2])
    expect(se.rect!.y).toBeGreaterThan(se.frame.plotArea[1])
  })

  it('outside placements clear the axis decorations and are unframed', () => {
    const { frame, svg } = build('eastOutside')
    expect(svg).not.toContain('<rect') // no frame
    expect(frame.outerArea[2]).toBe(frame.plotArea[2])
    expect(frame.outerArea[0]).toBeLessThan(frame.plotArea[0]) // tick labels
    expect(frame.outerArea[3]).toBeGreaterThan(frame.plotArea[3]) // x label
    const legendX = Number(svg.match(/class="jikz-legend-entry[^>]* x1="([\d.]+)"/)![1])
    expect(legendX).toBe(frame.outerArea[2] + 10 + 6)

    const below = build('below')
    const ys = [...below.svg.matchAll(/<text class="jikz-legend-entry[^>]* y="([\d.]+)"/g)].map((m) => Number(m[1]))
    expect(new Set(ys).size).toBe(1) // one row
    expect(ys[0]!).toBeGreaterThan(below.frame.outerArea[3] + 10)

    const framed = build('above', { frame: true, columns: 1 })
    expect(framed.rect!.y).toBeLessThan(framed.frame.outerArea[1] - 10)
  })

  it('an explicit at wins over place; auto stays the emptiest corner', () => {
    const { rect } = build('eastOutside', { at: point(1, 2), frame: true })
    expect(rect).toEqual({ x: 1, y: 2 })
    const auto = build('auto')
    expect(auto.svg).toContain('<rect')
  })
})
