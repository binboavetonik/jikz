// @vitest-environment jsdom
/**
 * The interaction layer — dataviz phase 5: the adapter's coordinate
 * mapping, hover pipeline (crosshair, active dots, tooltip), legend
 * toggles and highlight, and the view's zoom, brush, update and
 * responsive loop. jsdom has no layout, so the svg's box is stubbed.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { point } from '../../../src/core/Point'
import { picture } from '../../../src/picture/Picture'
import { chart, chartDomains, type ChartOptions } from '../../../src/ext/dataviz/chart'
import { attachChart, viewBoxOf, viewportTransformOf, defaultTooltip } from '../../../src/ext/dataviz/interact'
import { chartView, windowSamples } from '../../../src/ext/dataviz/view'

const SPEC: ChartOptions = {
  at: point(50, 200),
  width: 100,
  height: 100,
  x: { domain: [0, 10], exact: true },
  y: { domain: [0, 10], exact: true },
  series: [
    { data: [[0, 0], [5, 5], [10, 10]], label: 'up', id: 'up' },
    { data: [[0, 10], [5, 5], [10, 0]], label: 'down', id: 'down', kind: 'bar' },
  ],
  legend: { place: 'below' },
}

/** Mount a chart and make its box 2× the viewBox at (100, 50) on screen. */
function mounted(spec = SPEC) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const pic = picture()
  const frame = chart(pic, spec)
  const svg = pic.mount(container, { width: 200, height: 220 })
  svg.getBoundingClientRect = () => ({ left: 100, top: 50, width: 400, height: 440, right: 500, bottom: 490, x: 100, y: 50, toJSON: () => ({}) })
  container.getBoundingClientRect = () => ({ left: 100, top: 50, width: 400, height: 440, right: 500, bottom: 490, x: 100, y: 50, toJSON: () => ({}) })
  return { container, pic, frame, svg }
}

/** Screen position of a picture point in that box. */
const screen = (x: number, y: number) => ({ clientX: 100 + 2 * x, clientY: 50 + 2 * y })
const moveTo = (svg: Element, x: number, y: number) =>
  svg.dispatchEvent(new MouseEvent('pointermove', { ...screen(x, y), bubbles: true }))

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('coordinates', () => {
  it('reads the viewBox and the viewport transform', () => {
    const { svg } = mounted()
    expect(viewBoxOf(svg)).toEqual({ x: 0, y: 0, width: 200, height: 220 })
    expect(viewportTransformOf(svg)).toEqual({ tx: 0, ty: 0, scale: 1 })
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    g.setAttribute('class', 'jikz-viewport')
    g.setAttribute('transform', 'translate(10 -5) scale(2)')
    svg.appendChild(g)
    expect(viewportTransformOf(svg)).toEqual({ tx: 10, ty: -5, scale: 2 })
  })

  it('clientToUser maps through the letterboxed box', () => {
    const { svg, frame } = mounted()
    const c = attachChart(svg, frame)
    expect(c.clientToUser(100, 50)).toEqual(point(0, 0))
    expect(c.clientToUser(300, 270)).toEqual(point(100, 110))
    c.destroy()
  })
})

describe('hover pipeline', () => {
  it('moves the overlay to the end and paints crosshair, dots and a tooltip on hover', () => {
    const { svg, frame, container } = mounted()
    const c = attachChart(svg, frame)
    expect(svg.lastElementChild).toBe(c.overlay)
    expect(c.overlay.classList.contains(frame.overlayClass)).toBe(true)
    c.destroy()

    const hits: (unknown | null)[] = []
    const c2 = attachChart(svg, frame, { onHover: (h) => hits.push(h) })
    // Probe near x=5 (picture x = 100) inside the plot area.
    moveTo(svg, 102, 150)
    const hit = c2.hover(point(102, 150))!
    expect(hit.samples.map((s) => [s.seriesId, s.x])).toEqual([['up', 5], ['down', 5]])
    const cross = c2.overlay.querySelector('line.jikz-crosshair:not([display])')!
    expect(cross.getAttribute('x1')).toBe('100')
    expect(cross.getAttribute('y1')).toBe('100')
    expect(cross.getAttribute('y2')).toBe('200')
    const dots = [...c2.overlay.querySelectorAll('circle.jikz-active-dot:not([display])')]
    expect(dots).toHaveLength(2)
    expect(dots[0]!.getAttribute('fill')).toBe('#2a78d6')
    expect(dots[1]!.getAttribute('cy')).toBe('150')
    const tip = container.querySelector('.jikz-tooltip') as HTMLElement
    expect(tip.style.display).toBe('block')
    expect(tip.textContent).toContain('5')
    expect(tip.textContent).toContain('up')
    expect(tip.textContent).toContain('down')
    expect(container.style.position).toBe('relative')
    expect(hits.length).toBeGreaterThan(0)

    // Leaving clears everything.
    svg.dispatchEvent(new MouseEvent('pointerleave'))
    expect(tip.style.display).toBe('none')
    expect(c2.overlay.querySelectorAll('circle:not([display])')).toHaveLength(0)
    expect(hits[hits.length - 1]).toBeNull()
    // Outside the plot area: no hit.
    expect(c2.hover(point(10, 10))).toBeNull()
    c2.destroy()
    expect(container.querySelector('.jikz-tooltip')).toBeNull()
  })

  it('uses nearest mode for scatter charts, and a custom tooltip format', () => {
    const { svg, frame } = mounted({
      ...SPEC,
      series: [{ data: [[2, 2], [8, 8]], kind: 'scatter', id: 's', label: 's' }],
      legend: false,
    })
    const c = attachChart(svg, frame, { tooltip: { format: (h) => `<b>${h.samples[0]!.x},${h.samples[0]!.y}</b>` } })
    const hit = c.hover(point(frame.x(2.3), frame.y(2.2)))!
    expect(hit.samples).toHaveLength(1)
    expect(hit.x).toBe(2)
    expect(c.overlay.querySelectorAll('line.jikz-crosshair:not([display])')).toHaveLength(0)
    expect(c.tooltipElement!.innerHTML).toBe('<b>2,2</b>')
    expect(c.hover(point(frame.x(5), frame.y(5)))).toBeNull() // further than 24px
    c.destroy()
  })

  it('defaultTooltip formats through the axes and escapes text', () => {
    const { frame } = mounted({ ...SPEC, series: [{ data: [[1, 2]], id: 'a<b', label: 'a<b' }], legend: false })
    const html = defaultTooltip(frame.hitTest(frame.point(1, 2))!, frame, 'x')
    expect(html).toContain('a&lt;b')
    expect(html).toContain('>2<')
    expect(html).toContain('background:#2a78d6')
  })
})

describe('legend toggle and highlight', () => {
  it('clicking a legend row hides its series and drops it from hits', () => {
    const { svg, frame } = mounted()
    const c = attachChart(svg, frame)
    const row = svg.querySelector('.jikz-legend-entry[data-series="down"]')!
    expect(row.getAttribute('cursor')).toBe('pointer')
    row.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(c.isVisible('down')).toBe(false)
    const bars = [...svg.querySelectorAll('rect.jikz-series')]
    expect(bars.length).toBeGreaterThan(0)
    for (const b of bars) expect(b.getAttribute('display')).toBe('none')
    expect(row.classList.contains('jikz-hidden')).toBe(true)
    expect(c.hover(point(100, 150))!.samples.map((s) => s.seriesId)).toEqual(['up'])
    c.toggle('down')
    for (const b of bars) expect(b.hasAttribute('display')).toBe(false)
    expect(c.hidden.size).toBe(0)
    c.destroy()
  })

  it('hovering a legend row dims the other series; destroy restores', () => {
    const { svg, frame } = mounted()
    const c = attachChart(svg, frame)
    const row = svg.querySelector('.jikz-legend-entry[data-series="up"]')!
    row.dispatchEvent(new MouseEvent('pointerenter'))
    const bar = svg.querySelector('rect.jikz-series')!
    expect(bar.getAttribute('style')).toBe('opacity:0.25')
    expect(bar.classList.contains('jikz-dim')).toBe(true)
    expect(svg.querySelector('path.jikz-series-up')!.hasAttribute('style')).toBe(false)
    row.dispatchEvent(new MouseEvent('pointerleave'))
    expect(bar.hasAttribute('style')).toBe(false)
    c.highlight('up')
    c.destroy()
    expect(bar.hasAttribute('style')).toBe(false)
  })
})

describe('cursor', () => {
  it('setCursor draws a persistent line and a dot per series at that x; null removes it', () => {
    const { svg, frame } = mounted()
    const c = attachChart(svg, frame)
    expect(c.cursor).toBeNull()
    expect(c.overlay.querySelector('line.jikz-cursor')!.getAttribute('display')).toBe('none')
    c.setCursor(5)
    const line = c.overlay.querySelector('line.jikz-cursor')!
    expect(line.hasAttribute('display')).toBe(false)
    expect([line.getAttribute('x1'), line.getAttribute('y1'), line.getAttribute('y2')]).toEqual(['100', '100', '200'])
    expect(line.getAttribute('stroke')).toBe('#2a78d6')
    const dots = [...c.overlay.querySelectorAll('circle.jikz-cursor-dot:not([display])')]
    expect(dots.map((d) => d.getAttribute('data-series'))).toEqual(['up', 'down'])
    expect(c.cursor).toBe(5)
    // It is not the hover: leaving the chart does not clear it.
    svg.dispatchEvent(new MouseEvent('pointerleave'))
    expect(line.hasAttribute('display')).toBe(false)
    // Between samples: the line, no dots. Off the plot: hidden, value kept.
    c.setCursor(3.3)
    expect(c.overlay.querySelectorAll('circle.jikz-cursor-dot:not([display])')).toHaveLength(0)
    expect(line.getAttribute('x1')).toBe('83')
    c.setCursor(99)
    expect(line.getAttribute('display')).toBe('none')
    expect(c.cursor).toBe(99)
    // A hidden series loses its dot.
    c.setCursor(5)
    c.setVisible('down', false)
    expect([...c.overlay.querySelectorAll('circle.jikz-cursor-dot:not([display])')].map((d) => d.getAttribute('data-series'))).toEqual(['up'])
    c.setCursor(null)
    expect(line.getAttribute('display')).toBe('none')
    c.destroy()
  })

  it('cursorStyle sets the line paint', () => {
    const { svg, frame } = mounted()
    const c = attachChart(svg, frame, { cursor: 5, cursorStyle: { stroke: '#ff0000', width: 1, dash: '2 2' } })
    const line = c.overlay.querySelector('line.jikz-cursor')!
    expect([line.getAttribute('stroke'), line.getAttribute('stroke-width'), line.getAttribute('stroke-dasharray')]).toEqual(['#ff0000', '1', '2 2'])
    c.destroy()
    const plain = attachChart(svg, frame, { cursor: 5 })
    const d = plain.overlay.querySelector('line.jikz-cursor')!
    expect([d.getAttribute('stroke-width'), d.hasAttribute('stroke-dasharray')]).toEqual(['1.5', false])
    plain.destroy()
  })

  it('starts where the option says, dots optional', () => {
    const { svg, frame } = mounted()
    const c = attachChart(svg, frame, { cursor: 10, cursorDots: false })
    expect(c.cursor).toBe(10)
    expect(c.overlay.querySelector('line.jikz-cursor')!.getAttribute('x1')).toBe('150')
    expect(c.overlay.querySelectorAll('circle.jikz-cursor-dot')).toHaveLength(0)
    c.destroy()
  })
})

describe('chartView', () => {
  it('renders, zooms by domain, resets, and keeps hidden series across renders', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const changes: (readonly [number, number] | null)[] = []
    const view = chartView(container, SPEC, { zoom: 'x', onDomainChange: (d) => changes.push(d) })
    expect(container.querySelector('svg')).toBe(view.svg)
    expect(view.fullDomain).toEqual([0, 10])
    view.setVisible('down', false)
    view.setDomain([2, 4])
    expect(view.domain).toEqual([2, 4])
    expect(view.frame.xDomain).toEqual([2, 4])
    expect(container.querySelectorAll('svg')).toHaveLength(1) // the old render is gone
    expect(view.controller.isVisible('down')).toBe(false)
    expect(view.svg.querySelector('rect.jikz-zoom-selection')).not.toBeNull()
    view.setDomain([-5, 30]) // clamped to the data
    expect(view.domain).toEqual([0, 10])
    view.resetZoom()
    expect(view.domain).toBeNull()
    expect(changes).toEqual([[2, 4], [0, 10], null])
    view.destroy()
    expect(container.querySelector('svg')).toBeNull()
  })

  it('draws a brush strip with a window and handles, and update() keeps the zoom', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const view = chartView(container, SPEC, { brush: { height: 20 } })
    const win = view.svg.querySelector('[data-brush="window"]')!
    expect(win).not.toBeNull()
    expect(view.svg.querySelectorAll('.jikz-brush-handle')).toHaveLength(2)
    expect(win.getAttribute('width')).toBe('100') // the full domain
    view.setDomain([5, 10])
    expect(view.svg.querySelector('[data-brush="window"]')!.getAttribute('x')).toBe('100')
    // New data with an auto x domain: the full range grows, the zoom stays.
    view.update({ ...SPEC, x: undefined, series: [{ data: [[0, 0], [20, 20]], id: 'wide' }] })
    expect(view.fullDomain).toEqual([0, 20])
    expect(view.domain).toEqual([5, 10])
    // A categorical axis has no brush.
    const cat = chartView(container, { ...SPEC, x: { categories: ['a', 'b'] }, series: [{ data: [['a', 1], ['b', 2]], kind: 'bar' }] }, { brush: true })
    expect(cat.svg.querySelector('[data-brush]')).toBeNull()
    view.destroy()
    cat.destroy()
  })

  it('a zoomed view stays the size of the unzoomed one: it clips and drops off-plot labels', () => {
    const data: [number, number][] = Array.from({ length: 41 }, (_, i) => [i, 10 + (i % 7) * 3])
    const spec: ChartOptions = {
      at: point(50, 200),
      width: 200,
      height: 100,
      series: [
        { data, id: 'line', label: 'line', valueLabels: true, labelInData: 'end' },
        { data, id: 'bars', kind: 'bar' },
      ],
    }
    const container = document.createElement('div')
    document.body.appendChild(container)
    const view = chartView(container, spec, { zoom: 'x', brush: true })
    const widthOf = () => Number(view.svg.getAttribute('viewBox')!.split(' ')[2])
    const unzoomed = widthOf()
    // Clipped from the first render, so nothing shifts on the first zoom.
    expect(view.frame.clipped).toBe(true)
    expect(view.svg.querySelector('g.jikz-plot-area[clip-path]')).not.toBeNull()
    view.setDomain([10, 14])
    // Within a label's width of the unzoomed picture (tick and end
    // labels differ) — not the 4× blow-up of an unclipped zoom.
    expect(Math.abs(widthOf() - unzoomed)).toBeLessThan(40)
    expect(view.svg.querySelectorAll('.jikz-value-label').length).toBeLessThanOrEqual(6)
    // The end label names the last visible sample, inside the picture.
    const end = view.svg.querySelector('.jikz-series-label')!
    expect(Number(end.getAttribute('x'))).toBeLessThan(view.frame.plotArea[2] + 40)
    // A hit near the left edge is a sample on the plot.
    const hit = view.controller.hover(point(view.frame.plotArea[0] + 1, 150))!
    for (const s of hit.samples) expect(s.x).toBeGreaterThanOrEqual(10)
    // clip: false in the spec still wins.
    const open = chartView(container, { ...spec, clip: false }, { zoom: 'x' })
    expect(open.frame.clipped).toBe(false)
    view.destroy()
    open.destroy()
  })

  it('zooming rescales an auto y axis to the window; zoomY full or a pinned domain keeps it', () => {
    const data: [number, number][] = Array.from({ length: 21 }, (_, i) => [i, i < 10 ? 100 + i : 900 + i])
    const spec: ChartOptions = { at: point(50, 200), width: 200, height: 100, series: [{ data, id: 's' }] }
    const container = document.createElement('div')
    document.body.appendChild(container)
    const view = chartView(container, spec, { zoom: 'x' })
    const full = view.frame.yDomain
    expect(full[1]).toBeGreaterThan(900)
    view.setDomain([2, 6])
    expect(view.frame.yDomain[1]).toBeLessThan(150)
    expect(view.frame.yDomain[0]).toBeGreaterThanOrEqual(90)
    // Every sample is still there (indices are the caller's), just clipped.
    expect(view.frame.series[0]!.data).toHaveLength(21)
    view.resetZoom()
    expect(view.frame.yDomain).toEqual(full)

    const fixed = chartView(container, spec, { zoom: 'x', zoomY: 'full' })
    fixed.setDomain([2, 6])
    expect(fixed.frame.yDomain).toEqual(full)
    const pinned = chartView(container, { ...spec, y: { domain: [0, 1000] } }, { zoom: 'x' })
    pinned.setDomain([2, 6])
    expect(pinned.frame.yDomain).toEqual([0, 1000])
    view.destroy()
    fixed.destroy()
    pinned.destroy()
  })

  it('windowSamples: the samples in the window and the points on its edges, gaps where it cut', () => {
    const data: [number, number][] = [[0, 0], [1, 10], [2, 20], [3, 30], [4, 40], [5, 50]]
    // The edges are interpolated, not the neighbours beyond them.
    expect(windowSamples(data, [1.5, 3.5])).toEqual([[1.5, 15], [2, 20], [3, 30], [3.5, 35]])
    // A window between two sparse samples still sees the line through it.
    expect(windowSamples(data, [2.2, 2.8])).toEqual([[2.2, 22], [2.8, 28]])
    // On a sample: no duplicate. Nothing touching: empty.
    expect(windowSamples(data, [1, 2])).toEqual([[1, 10], [2, 20]])
    expect(windowSamples(data, [9, 10])).toEqual([])
    // A line that leaves and comes back is two runs, not one.
    const zig: [number, number][] = [[0, 0], [1, 1], [8, 8], [9, 9], [1, 5], [0, 6]]
    const cut = windowSamples(zig, [0, 2])
    expect(cut.filter(([x]) => Number.isNaN(x))).toHaveLength(1)
    expect(cut[0]).toEqual([0, 0])
    expect(cut[cut.length - 1]).toEqual([0, 6])
    // A gap in the data stays a gap.
    expect(windowSamples([[0, 1], [1, NaN], [2, 3]], [0, 2])).toEqual([[0, 1], [NaN, NaN], [2, 3]])
  })

  it('zoomY measures what shows: a spike just outside the window does not set the range', () => {
    const data: [number, number][] = [[0, 10], [1, 12], [2, 11], [3, 13], [4, 12], [5, 900], [6, 12]]
    const container = document.createElement('div')
    document.body.appendChild(container)
    const view = chartView(container, { at: point(50, 200), width: 200, height: 100, series: [{ data, id: 's' }] }, { zoom: 'x' })
    view.setDomain([1, 4])
    expect(view.frame.yDomain[1]).toBeLessThan(20)
    // Reaching into the rising segment counts what is visible of it: its height at the edge.
    view.setDomain([1, 4.5])
    expect(view.frame.yDomain[1]).toBeGreaterThan(400)
    expect(view.frame.yDomain[1]).toBeLessThan(900)
    view.destroy()
  })

  it('a render is one chart build: the extents come from chartDomains', () => {
    const data: [number, number][] = Array.from({ length: 12 }, (_, i) => [i, i * i])
    const spec: ChartOptions = { at: point(50, 200), width: 200, height: 100, series: [{ data, id: 's', kind: 'bar' }] }
    // chartDomains is what the frame ends up with, for the kinds that shape a domain.
    for (const s of [
      spec,
      { ...spec, series: [{ data, id: 'a', kind: 'area' as const, stack: 't' }, { data, id: 'b', kind: 'area' as const, stack: 't' }] },
      { ...spec, y: { logarithmic: true }, series: [{ data: data.slice(1), id: 'l' }] },
      { ...spec, x: { categories: ['a', 'b'] }, series: [{ data: [['a', 3], ['b', 7]] as [string, number][], kind: 'bar' as const }] },
      { ...spec, x: { time: true }, series: [{ data: data.map(([x, y]) => [new Date(Date.UTC(2026, 0, 1 + x)), y] as [Date, number]) }] },
      { ...spec, y: { includeValue: -50, padding: 5 } },
    ] as ChartOptions[]) {
      const frame = chart(picture(), s)
      expect(chartDomains(s)).toEqual({ x: frame.xDomain, y: frame.yDomain })
    }
    // And the view measures with it: its full domain without a probe chart.
    const container = document.createElement('div')
    document.body.appendChild(container)
    const view = chartView(container, spec, { brush: true })
    expect(view.fullDomain).toEqual(chartDomains(spec).x)
    view.destroy()
  })

  it('responsive follows the container width when it has one', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    Object.defineProperty(container, 'clientWidth', { value: 500, configurable: true })
    const view = chartView(container, SPEC, { responsive: true, padding: 10 })
    expect(view.frame.plotArea[2] - view.frame.plotArea[0]).toBe(500 - 50 - 20 - 8)
    const fixed = chartView(container, SPEC, { responsive: false })
    expect(fixed.frame.plotArea[2] - fixed.frame.plotArea[0]).toBe(100)
    view.destroy()
    fixed.destroy()
  })
})
