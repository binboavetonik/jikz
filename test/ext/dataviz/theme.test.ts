// @vitest-environment jsdom
/**
 * Themes — every ink that is not a series colour, static chart and
 * interactive layer alike, from one option the frame carries.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { point } from '../../../src/core/Point'
import { picture } from '../../../src/picture/Picture'
import { lightTheme, darkTheme, resolveTheme } from '../../../src/ext/dataviz/theme'
import { VARY_HUE, VARY_HUE_DARK } from '../../../src/ext/dataviz/stylesheet'
import { axes } from '../../../src/ext/dataviz/frame'
import { chart, type ChartOptions } from '../../../src/ext/dataviz/chart'
import { legend } from '../../../src/ext/dataviz/legend'
import { pie } from '../../../src/ext/dataviz/pie'
import { sparkline } from '../../../src/ext/dataviz/sparkline'
import { attachChart } from '../../../src/ext/dataviz/interact'
import { chartView } from '../../../src/ext/dataviz/view'

const at = point(50, 200)
const SPEC: ChartOptions = {
  at,
  width: 100,
  height: 100,
  x: { label: 'n', grid: 'both', minorTicks: 1 },
  y: { grid: true },
  series: [
    { data: [[0, 1], [5, 6], [10, 3]], label: 'a', id: 'a', labelInData: 'end', valueLabels: true },
    { data: [[0, 2], [5, 4], [10, 5]], label: 'b', id: 'b', kind: 'bar' },
  ],
  legend: { place: 'northWestInside' },
}
const render = (spec: ChartOptions) => {
  const pic = picture()
  const frame = chart(pic, spec)
  return { frame, svg: pic.toSVG({ width: 300, height: 260 }) }
}

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('resolveTheme', () => {
  it('names, overrides on a base, and nested roles merge', () => {
    expect(resolveTheme()).toBe(lightTheme)
    expect(resolveTheme('light')).toBe(lightTheme)
    expect(resolveTheme('dark')).toBe(darkTheme)
    const mine = resolveTheme({ base: 'dark', surface: '#101418', tooltip: { background: '#000' } })
    expect(mine.surface).toBe('#101418')
    expect(mine.axis).toBe(darkTheme.axis)
    expect(mine.tooltip).toEqual({ ...darkTheme.tooltip, background: '#000' })
    expect(mine.styleSheet).toBe('varyHueDark')
    expect(resolveTheme({ accent: 'red' }).grid).toBe(lightTheme.grid)
  })
})

describe('static inks', () => {
  it('the default theme is light, and naming it changes nothing', () => {
    expect(render(SPEC).svg).toBe(render({ ...SPEC, theme: 'light' }).svg)
    expect(render(SPEC).frame.theme).toBe(lightTheme)
  })

  it('dark moves every ink: axes, grids, text, legend, labels, series', () => {
    const { svg, frame } = render({ ...SPEC, theme: 'dark' })
    expect(frame.theme).toBe(darkTheme)
    // The two themes share hexes across roles (light's axis is dark's
    // tick text), so each role is checked where it is drawn.
    expect(svg).not.toContain(`stroke="${lightTheme.grid}"`)
    expect(svg).not.toContain(`stroke="${lightTheme.minorGrid}"`)
    expect(svg).not.toMatch(new RegExp(`fill="${lightTheme.tickText}"[^>]*>0<`))
    expect(svg).toContain(`stroke="${darkTheme.axis}"`)
    expect(svg).toContain(`stroke="${darkTheme.grid}"`)
    expect(svg).toContain(`stroke="${darkTheme.minorGrid}"`)
    expect(svg).toMatch(new RegExp(`fill="${darkTheme.tickText}"[^>]*>0<`))
    expect(svg).toMatch(new RegExp(`fill="${darkTheme.labelText}"[^>]*>n<`))
    // Series take the dark column of the palette; the legend frame and text follow.
    expect(frame.series[0]!.style).toEqual({ stroke: VARY_HUE_DARK[0], strokeWidth: 2 })
    expect(svg).not.toContain(VARY_HUE[0])
    expect(svg).toContain(`fill="${darkTheme.legendFrame.fill}"`)
    expect(svg).toMatch(new RegExp(`<text class="jikz-legend-entry[^>]*fill="${darkTheme.legendText}"`))
    expect(svg).toMatch(new RegExp(`<text class="jikz-series-label[^>]*fill="${darkTheme.labelText}"`))
    expect(svg).toMatch(new RegExp(`<text class="jikz-value-label[^>]*fill="${darkTheme.tickText}"`))
  })

  it('explicit options still win over the theme', () => {
    const { svg, frame } = render({
      ...SPEC,
      theme: 'dark',
      style: { stroke: '#ff0000' },
      textStyle: { fill: '#00ff00' },
      styleSheet: 'grayScale',
    })
    expect(svg).toContain('stroke="#ff0000"')
    expect(svg).toMatch(/fill="#00ff00"[^>]*>0</)
    expect(frame.series[0]!.style).toEqual({ stroke: '#111827', strokeWidth: 2 })
  })

  it('reference marks, candles, error bars and unsheeted series use the theme', () => {
    const pic = picture()
    const frame = axes(pic, { at, width: 100, height: 100, theme: { base: 'dark', reference: '#abcdef', surface: '#010203' }, styleSheet: null })
    frame.referenceLine({ y: 0.5 }).referenceArea({ y1: 0.2, y2: 0.4 }).referenceDot(0.5, 0.5)
    frame.candlestick([[0.3, 0.2, 0.6, 0.1, 0.5]], { width: 4 })
    frame.errorBars([[0.6, 0.5, 0.1]])
    frame.line([[0, 0], [1, 1]]).bars([[0.5, 0.5]])
    const svg = pic.toSVG({ width: 200, height: 220 })
    expect(svg.match(/stroke="#abcdef"/g)!.length).toBeGreaterThanOrEqual(4)
    expect(svg).toContain('fill="#010203"') // the hollow candle is cut in the surface
    expect(svg).toContain(`stroke="${darkTheme.candle.up}"`)
    expect(frame.series[1]!.style).toEqual({ stroke: darkTheme.ink, strokeWidth: 2 })
    expect(frame.series[2]!.style).toEqual({ fill: darkTheme.bar, stroke: 'none' })
  })

  it('legend(), pie() and sparkline() take a theme on their own', () => {
    const pic = picture()
    legend(pic, { at: point(0, 0), entries: [{ label: 'x' }], frame: true, theme: 'dark' })
    pie(pic, { at: point(100, 100), radius: 40, slices: [{ value: 9, label: 'a' }, { value: 1, label: 'b' }], labels: 'label', minInsideFraction: 0.2, theme: 'dark' })
    sparkline(pic, [1, 3, 2], { at: point(0, 180), width: 40, height: 10, band: [1, 2], theme: 'dark' })
    const svg = pic.toSVG({ width: 200, height: 200 })
    expect(svg).toContain(`fill="${darkTheme.legendFrame.fill}"`)
    expect(svg).toMatch(new RegExp(`fill="${darkTheme.legendText}"[^>]*>x<`))
    expect(svg).toMatch(new RegExp(`data-series="a" fill="${VARY_HUE_DARK[0]}"[^>]*stroke="${darkTheme.surface}"`))
    expect(svg).toMatch(new RegExp(`fill="${darkTheme.labelText}"[^>]*>b<`)) // outside label
    expect(svg).toMatch(new RegExp(`fill="${darkTheme.onSeries}"[^>]*>a<`)) // inside label
    expect(svg).toContain(`stroke="${VARY_HUE_DARK[0]}"`) // the sparkline
  })
})

describe('a theme of CSS variables', () => {
  // A host with several themes passes roles as var(--…) and switches
  // them in CSS, live, with no re-render. Roles are opaque strings to
  // jikz; this pins that they stay so.
  const VARS = {
    axis: 'var(--app-axis)',
    grid: 'var(--app-grid)',
    tickText: 'var(--app-muted)',
    labelText: 'var(--app-text)',
    legendText: 'var(--app-text)',
    legendFrame: { fill: 'var(--app-panel)', stroke: 'var(--app-border)' },
    surface: 'var(--app-bg)',
    accent: 'var(--app-accent)',
    tooltip: { background: 'var(--app-panel)', text: 'var(--app-text)', muted: 'var(--app-muted)', border: 'var(--app-border)', shadow: 'var(--app-shadow)' },
    styleSheet: { colors: ['var(--app-series-1)', 'var(--app-series-2)'] },
  }

  it('reaches every attribute verbatim, and ids derived from colours stay valid', () => {
    const pic = picture()
    chart(pic, { ...SPEC, theme: VARS, axisSystem: 'schoolBook', x: { domain: [-1, 11], label: 'n', grid: true } })
    const svg = pic.toSVG({ width: 300, height: 260 })
    expect(svg).toContain('stroke="var(--app-grid)"')
    expect(svg).toContain('stroke="var(--app-series-1)"')
    expect(svg).toContain('fill="var(--app-series-2)"')
    expect(svg).toMatch(/fill="var\(--app-muted\)"[^>]*>0</)
    expect(svg).toContain('fill="var(--app-panel)"')
    // The arrow marker is named after its colour: the id must still be an id.
    const ids = [...svg.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]!)
    expect(ids.length).toBeGreaterThan(0)
    for (const id of ids) expect(id).toMatch(/^[A-Za-z][\w.-]*$/)
    for (const ref of svg.matchAll(/url\(#([^)]+)\)/g)) expect(ids).toContain(ref[1])
  })

  it('reaches the tooltip, the overlay and the brush', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const view = chartView(container, { ...SPEC, theme: VARS }, { brush: true, zoom: 'x', cursor: 5 })
    const box = { left: 0, top: 0, width: 200, height: 220, right: 200, bottom: 220, x: 0, y: 0, toJSON: () => ({}) }
    view.svg.getBoundingClientRect = () => box
    container.getBoundingClientRect = () => box
    view.controller.hover(point(100, 150))
    const tip = container.querySelector('.jikz-tooltip')!.getAttribute('style')!.replace(/\s+/g, '')
    expect(tip).toContain('background:var(--jikz-tooltip-bg,var(--app-panel))')
    expect(tip).toContain('color:var(--jikz-tooltip-text,var(--app-text))')
    expect(container.querySelector('.jikz-tooltip-swatch')!.getAttribute('style')).toContain('var(--app-series-1)')
    expect(view.svg.querySelector('[data-brush="window"]')!.getAttribute('stroke')).toBe('var(--app-accent)')
    expect(view.svg.querySelector('line.jikz-cursor')!.getAttribute('stroke')).toBe('var(--app-accent)')
    expect(view.svg.querySelector('circle.jikz-active-dot')!.getAttribute('stroke')).toBe('var(--app-bg)')
    view.destroy()
  })
})

describe('the interactive layer follows the frame', () => {
  const mounted = (spec: ChartOptions) => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const pic = picture()
    const frame = chart(pic, spec)
    const svg = pic.mount(container, { width: 200, height: 220 })
    const box = { left: 0, top: 0, width: 200, height: 220, right: 200, bottom: 220, x: 0, y: 0, toJSON: () => ({}) }
    svg.getBoundingClientRect = () => box
    container.getBoundingClientRect = () => box
    return { container, frame, svg }
  }

  it('crosshair, dot ring and tooltip take the theme; tooltip colours are overridable variables', () => {
    const { container, frame, svg } = mounted({ ...SPEC, theme: 'dark' })
    const c = attachChart(svg, frame)
    c.hover(point(100, 150))
    expect(c.overlay.querySelector('line.jikz-crosshair')!.getAttribute('stroke')).toBe(darkTheme.axis)
    expect(c.overlay.querySelector('circle.jikz-active-dot')!.getAttribute('stroke')).toBe(darkTheme.surface)
    // (The DOM normalizes the spacing of an inline style.)
    const style = container.querySelector('.jikz-tooltip')!.getAttribute('style')!.replace(/\s+/g, '')
    expect(style).toContain(`background:var(--jikz-tooltip-bg,${darkTheme.tooltip.background})`)
    expect(style).toContain(`color:var(--jikz-tooltip-text,${darkTheme.tooltip.text})`)
    expect(style).toContain(`var(--jikz-tooltip-border,${darkTheme.tooltip.border})`)
    expect(style).toContain('var(--jikz-tooltip-shadow,')
    const label = container.querySelector('.jikz-tooltip-label')!.getAttribute('style')!.replace(/\s+/g, '')
    expect(label).toContain(`var(--jikz-tooltip-muted,${darkTheme.tooltip.muted})`)
    c.destroy()
  })

  it('an unstyled tooltip carries layout only', () => {
    const { container, frame, svg } = mounted(SPEC)
    const c = attachChart(svg, frame, { tooltip: { unstyled: true } })
    c.hover(point(100, 150))
    const tip = container.querySelector('.jikz-tooltip')!
    expect(tip.getAttribute('style')).not.toMatch(/background|color:|border:|box-shadow/)
    expect(tip.getAttribute('style')!.replace(/\s+/g, '')).toContain('position:absolute')
    expect(container.querySelector('.jikz-tooltip-label')!.getAttribute('style')).toBe('')
    c.destroy()
  })

  it('the brush strip, window, handles and zoom box take the theme', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const view = chartView(container, { ...SPEC, theme: { base: 'dark', accent: '#ff8800' } }, { brush: true, zoom: 'x' })
    const win = view.svg.querySelector('[data-brush="window"]')!
    expect(win.getAttribute('stroke')).toBe('#ff8800')
    expect(view.svg.querySelector('.jikz-brush-handle')!.getAttribute('fill')).toBe(darkTheme.surface)
    expect(view.svg.querySelector('rect.jikz-zoom-selection')!.getAttribute('fill')).toBe('#ff8800')
    expect(view.svg.querySelector('.jikz-series-brush-0')!.getAttribute('stroke')).toBe(darkTheme.brushStrip.stroke)
    view.destroy()
  })
})
