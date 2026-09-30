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
import { chart, type ChartOptions } from '../../../src/ext/dataviz/chart'
import { attachChart, viewBoxOf, viewportTransformOf, defaultTooltip } from '../../../src/ext/dataviz/interact'
import { chartView } from '../../../src/ext/dataviz/view'

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
