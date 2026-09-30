/**
 * `chartView()` — the stateful loop around a chart: it renders a
 * `chart()` spec into a container, attaches the interaction adapter,
 * and re-renders when the x domain changes (drag-zoom, the brush),
 * when the container resizes, or when new data arrives. The one
 * stateful object in dataviz — the analogue of the pan/zoom
 * controller, confined to this file.
 *
 * A re-render is a fresh `picture()` + `chart()` + `mount()`: the
 * spec is a value, so zoom and brush are just a different x domain.
 *
 * ```ts
 * const view = chartView(el, spec, { zoom: 'x', brush: true, responsive: true })
 * view.update({ ...spec, series: newSeries })
 * view.destroy()
 * ```
 */
import { point } from '../../core/Point'
import type { Picture, PictureOptions } from '../../picture/Picture'
import { picture } from '../../picture/Picture'
import { rect } from '../../geometry/Rectangle'
import { attachChart, type ChartController, type ChartInteractionOptions } from './interact'
import { chart, type ChartOptions } from './chart'
import { axes, type ChartFrame, type AxisOptions } from './frame'
import type { DataInput } from './scale'

/** Brush options for {@link chartView}. */
export interface ChartBrushOptions {
  /** Height of the brush strip, px (default 32). */
  height?: number
  /** Gap between the axes and the brush, px (default 12). */
  gap?: number
  /** Re-render the chart while dragging, not only on release (default false). */
  live?: boolean
}

/** Options for {@link chartView}. */
export interface ChartViewOptions extends ChartInteractionOptions {
  /** Fit the viewBox to the content (default true), with this padding (default 12). */
  fit?: boolean
  padding?: number
  /** Drag across the plot area to zoom the x domain; double-click resets. */
  zoom?: 'x' | false
  /** A brush strip under the axes: drag its window or handles to set the x domain. */
  brush?: boolean | ChartBrushOptions
  /**
   * Re-lay the chart out at the container's width when it resizes
   * (the plot width follows the container; the height stays).
   */
  responsive?: boolean | { minWidth?: number }
  /** Options for the `picture()` each render creates. */
  pictureOptions?: PictureOptions
  /** Called with the new x domain after a zoom or brush, null on reset. */
  onDomainChange?: (domain: readonly [number, number] | null) => void
}

/** What {@link chartView} returns. */
export interface ChartView {
  readonly container: HTMLElement
  /** The current render's root element. */
  readonly svg: SVGElement
  readonly frame: ChartFrame
  readonly controller: ChartController
  readonly spec: ChartOptions
  /** The x domain in force, or null for the data's own. */
  readonly domain: readonly [number, number] | null
  /** The unzoomed x domain — what the brush spans. */
  readonly fullDomain: readonly [number, number]
  readonly hidden: ReadonlySet<string>
  /** Re-render with new data or options; zoom and hidden series persist. */
  update(spec: ChartOptions): void
  /** Zoom to an x domain (null resets) and re-render. */
  setDomain(domain: readonly [number, number] | null): void
  resetZoom(): void
  setVisible(id: string, visible: boolean): void
  /** Re-render as is. */
  render(): void
  destroy(): void
}

const BRUSH_HANDLE = 6

/** The spec without its enter animations. */
function stripEnter(spec: ChartOptions): ChartOptions {
  const { enter: _enter, ...rest } = spec
  return { ...rest, series: spec.series.map(({ enter: _e, ...s }) => s) }
}

/** Series kinds the brush strip draws, simplified. */
function brushSeries(pic: Picture, frame: ChartFrame, spec: ChartOptions): void {
  spec.series.forEach((s, i) => {
    if (s.kind === 'candlestick') return
    const id = `brush-${i}`
    const style = { stroke: '#cbd5e1', strokeWidth: 1, fill: '#e2e8f0' }
    const data = s.data as DataInput
    if (s.kind === 'bar') frame.bars(data, { id, style, stack: s.stack })
    else if (s.kind === 'area') frame.area(data, { id, style, stack: s.stack })
    else frame.line(data, { id, style })
  })
  void pic
}

/**
 * Render a chart into a container and keep it live. See
 * {@link ChartViewOptions}.
 */
export function chartView(
  container: HTMLElement,
  spec: ChartOptions,
  options: ChartViewOptions = {}
): ChartView {
  const {
    fit = true,
    padding = 12,
    zoom = false,
    brush = false,
    responsive = false,
    pictureOptions,
    onDomainChange,
    ...interaction
  } = options
  const brushOpts: ChartBrushOptions | null = brush === false ? null : brush === true ? {} : brush
  const hidden = new Set<string>()
  let current = spec
  let domain: readonly [number, number] | null = null
  let fullDomain: readonly [number, number] = [0, 1]
  let fullYDomain: readonly [number, number] = [0, 1]
  let svg: SVGElement | null = null
  let frame: ChartFrame | null = null
  let controller: ChartController | null = null
  let brushFrame: ChartFrame | null = null
  let cleanup: (() => void)[] = []
  let rendered = false
  const doc = container.ownerDocument

  const categorical = (): boolean => !!current.x?.categories

  const plotWidth = (): number => {
    if (!responsive) return current.width
    const min = typeof responsive === 'object' ? (responsive.minWidth ?? 120) : 120
    const available = container.clientWidth
    if (!(available > 0)) return current.width
    return Math.max(min, available - current.at.x - padding * 2 - 8)
  }

  const clampDomain = (d: readonly [number, number]): readonly [number, number] => {
    const lo = Math.max(fullDomain[0], Math.min(d[0], d[1]))
    const hi = Math.min(fullDomain[1], Math.max(d[0], d[1]))
    return [lo, hi]
  }

  function render(): void {
    for (const undo of cleanup) undo()
    cleanup = []
    controller?.destroy()
    svg?.remove()

    const width = plotWidth()
    const xSpec: ChartOptions['x'] = domain
      ? { ...current.x, domain, exact: true }
      : current.x
    const pic = picture(pictureOptions)
    // Enter animations play once, on the first render — a zoom or a
    // resize is not an entrance.
    const spec = rendered ? stripEnter(current) : current
    rendered = true
    frame = chart(pic, { ...spec, width, x: xSpec })
    if (!domain) {
      fullDomain = frame.xDomain
      fullYDomain = frame.yDomain
    }

    // ── The brush strip: the whole data range, simplified, with the window.
    brushFrame = null
    if (brushOpts && !categorical()) {
      const height = brushOpts.height ?? 32
      const gap = brushOpts.gap ?? 12
      const top = frame.outerArea[3] + gap
      const x: AxisOptions = {
        ...(current.x?.time && { time: current.x.time }),
        ...(current.x?.logarithmic && { logarithmic: true }),
        domain: fullDomain,
        exact: true,
        tickLabels: false,
      }
      brushFrame = axes(pic, {
        at: point(current.at.x, top + height),
        width,
        height,
        x,
        y: { domain: fullYDomain, exact: true, tickLabels: false },
        tickSize: 2,
        style: { stroke: '#cbd5e1', strokeWidth: 1 },
        styleSheet: null,
      })
      brushSeries(pic, brushFrame, current)
      const [d0, d1] = domain ?? fullDomain
      const wx0 = brushFrame.x(d0)
      const wx1 = brushFrame.x(d1)
      pic.filldraw(rect(wx0, top, Math.max(1, wx1 - wx0), height), {
        style: { fill: '#2a78d6', fillOpacity: 0.12, stroke: '#2a78d6', strokeWidth: 1 },
        className: 'jikz-brush-window',
        attributes: { 'data-brush': 'window' },
      })
      for (const [side, x0] of [['w', wx0], ['e', wx1]] as const) {
        pic.filldraw(rect(x0 - BRUSH_HANDLE / 2, top + height / 4, BRUSH_HANDLE, height / 2), {
          style: { fill: '#ffffff', stroke: '#2a78d6', strokeWidth: 1, roundedCorners: 2 },
          className: 'jikz-brush-handle',
          attributes: { 'data-brush': side },
        })
      }
    }

    svg = pic.mount(container, fit ? { fit: true, padding } : { width: current.width + 2 * padding, height: current.height + 2 * padding })
    svg.setAttribute('style', 'max-width:100%;height:auto;display:block')
    controller = attachChart(svg, frame, interaction)
    for (const id of hidden) controller.setVisible(id, false)
    wireZoom()
    wireBrush()
  }

  const setDomain = (next: readonly [number, number] | null): void => {
    const clamped = next ? clampDomain(next) : null
    if (clamped && clamped[0] === clamped[1]) return
    domain = clamped
    render()
    onDomainChange?.(domain)
  }

  // ── Drag-zoom on the plot area.
  function wireZoom(): void {
    if (zoom !== 'x' || !svg || !frame || !controller || categorical()) return
    const s = svg
    const f = frame
    const c = controller
    let startX: number | null = null
    const box = c.overlay.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'rect')
    box.setAttribute('class', 'jikz-zoom-selection')
    box.setAttribute('fill', '#2a78d6')
    box.setAttribute('fill-opacity', '0.12')
    box.setAttribute('stroke', '#2a78d6')
    box.setAttribute('display', 'none')
    const [px0, py0, px1, py1] = f.plotArea
    box.setAttribute('x', String(px0))
    box.setAttribute('y', String(py0))
    box.setAttribute('width', '0')
    box.setAttribute('height', '0')
    c.overlay.appendChild(box)
    const down = (e: MouseEvent): void => {
      const target = e.target as Element | null
      if (target?.getAttribute('data-brush')) return
      const at = c.clientToUser(e.clientX, e.clientY)
      if (!at || !f.contains(at)) return
      startX = at.x
      e.preventDefault()
    }
    const move = (e: MouseEvent): void => {
      if (startX === null) return
      const at = c.clientToUser(e.clientX, e.clientY)
      if (!at) return
      const x = Math.max(px0, Math.min(px1, at.x))
      box.setAttribute('x', String(Math.min(startX, x)))
      box.setAttribute('y', String(py0))
      box.setAttribute('width', String(Math.abs(x - startX)))
      box.setAttribute('height', String(py1 - py0))
      box.removeAttribute('display')
      c.hover(null)
    }
    const up = (e: MouseEvent): void => {
      if (startX === null) return
      const at = c.clientToUser(e.clientX, e.clientY)
      const from = startX
      startX = null
      box.setAttribute('display', 'none')
      if (!at) return
      const x = Math.max(px0, Math.min(px1, at.x))
      if (Math.abs(x - from) < 4) return
      setDomain([f.invertX(Math.min(from, x)), f.invertX(Math.max(from, x))])
    }
    const dbl = (): void => {
      if (domain) setDomain(null)
    }
    s.addEventListener('pointerdown', down)
    doc.addEventListener('pointermove', move)
    doc.addEventListener('pointerup', up)
    s.addEventListener('dblclick', dbl)
    cleanup.push(() => {
      s.removeEventListener('pointerdown', down)
      doc.removeEventListener('pointermove', move)
      doc.removeEventListener('pointerup', up)
      s.removeEventListener('dblclick', dbl)
    })
  }

  // ── The brush: drag the window to pan it, a handle to resize it.
  function wireBrush(): void {
    if (!brushOpts || !svg || !brushFrame || !controller) return
    const s = svg
    const bf = brushFrame
    const c = controller
    const window = s.querySelector('[data-brush="window"]') as SVGRectElement | null
    const west = s.querySelector('[data-brush="w"]') as SVGRectElement | null
    const east = s.querySelector('[data-brush="e"]') as SVGRectElement | null
    if (!window || !west || !east) return
    for (const el of [window, west, east]) el.setAttribute('cursor', el === window ? 'grab' : 'ew-resize')
    let drag: { part: 'window' | 'w' | 'e'; startX: number; d0: number; d1: number } | null = null
    const [d0, d1] = domain ?? fullDomain
    const paintWindow = (a: number, b: number): void => {
      const x0 = bf.x(a)
      const x1 = bf.x(b)
      window.setAttribute('x', String(x0))
      window.setAttribute('width', String(Math.max(1, x1 - x0)))
      west.setAttribute('x', String(x0 - BRUSH_HANDLE / 2))
      east.setAttribute('x', String(x1 - BRUSH_HANDLE / 2))
    }
    const domainAt = (e: MouseEvent): readonly [number, number] | null => {
      if (!drag) return null
      const at = c.clientToUser(e.clientX, e.clientY)
      if (!at) return null
      const dx = bf.invertX(at.x) - bf.invertX(drag.startX)
      if (drag.part === 'window') {
        const span = drag.d1 - drag.d0
        let a = drag.d0 + dx
        a = Math.max(fullDomain[0], Math.min(fullDomain[1] - span, a))
        return [a, a + span]
      }
      if (drag.part === 'w') return clampDomain([drag.d0 + dx, drag.d1])
      return clampDomain([drag.d0, drag.d1 + dx])
    }
    const down = (part: 'window' | 'w' | 'e') => (e: MouseEvent) => {
      const at = c.clientToUser(e.clientX, e.clientY)
      if (!at) return
      const [a, b] = domain ?? fullDomain
      drag = { part, startX: at.x, d0: a, d1: b }
      e.preventDefault()
      e.stopPropagation()
    }
    const move = (e: MouseEvent): void => {
      const next = domainAt(e)
      if (!next) return
      if (brushOpts.live) setDomain(next)
      else paintWindow(next[0], next[1])
    }
    const up = (e: MouseEvent): void => {
      const next = domainAt(e)
      drag = null
      if (!next) return
      const full = next[0] <= fullDomain[0] && next[1] >= fullDomain[1]
      setDomain(full ? null : next)
    }
    const dw = down('window')
    const dwest = down('w')
    const deast = down('e')
    window.addEventListener('pointerdown', dw)
    west.addEventListener('pointerdown', dwest)
    east.addEventListener('pointerdown', deast)
    doc.addEventListener('pointermove', move)
    doc.addEventListener('pointerup', up)
    paintWindow(d0, d1)
    cleanup.push(() => {
      window.removeEventListener('pointerdown', dw)
      west.removeEventListener('pointerdown', dwest)
      east.removeEventListener('pointerdown', deast)
      doc.removeEventListener('pointermove', move)
      doc.removeEventListener('pointerup', up)
    })
  }

  // ── Responsive: follow the container's width.
  let observer: ResizeObserver | null = null
  let lastWidth = container.clientWidth
  if (responsive && typeof ResizeObserver !== 'undefined') {
    let pending = false
    observer = new ResizeObserver(() => {
      if (container.clientWidth === lastWidth || pending) return
      pending = true
      requestAnimationFrame(() => {
        pending = false
        lastWidth = container.clientWidth
        render()
      })
    })
    observer.observe(container)
  }

  render()

  return {
    container,
    get svg() {
      return svg!
    },
    get frame() {
      return frame!
    },
    get controller() {
      return controller!
    },
    get spec() {
      return current
    },
    get domain() {
      return domain
    },
    get fullDomain() {
      return fullDomain
    },
    hidden,
    update(next) {
      current = next
      // New data is worth an entrance again.
      rendered = false
      // New data may have a new extent: measure it before re-applying the zoom.
      const keep = domain
      domain = null
      render()
      if (keep) {
        domain = clampDomain(keep)
        render()
      }
    },
    setDomain,
    resetZoom: () => setDomain(null),
    setVisible(id, visible) {
      if (visible) hidden.delete(id)
      else hidden.add(id)
      controller?.setVisible(id, visible)
    },
    render,
    destroy() {
      observer?.disconnect()
      for (const undo of cleanup) undo()
      cleanup = []
      controller?.destroy()
      svg?.remove()
      svg = null
    },
  }
}
