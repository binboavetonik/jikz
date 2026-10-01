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
import { chart, chartDomains, type ChartOptions } from './chart'
import { axes, type ChartFrame, type AxisOptions, type Candle } from './frame'
import { toSeries, toNumber, type DataInput, type DataSeries, type DataValue } from './scale'
import type { ChartTheme } from './theme'

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
  /**
   * Coalesce `update()` calls: the re-render waits for the next
   * animation frame, and several updates in one frame cost one
   * render — for data arriving faster than it can be drawn.
   * `flush()` renders at once. Default false: `update()` is
   * synchronous.
   */
  batchUpdates?: boolean
  /** Options for the `picture()` each render creates. */
  pictureOptions?: PictureOptions
  /**
   * What the y axis does while zoomed: `'visible'` (default) rescales
   * it to the samples in the window, as a brush is expected to;
   * `'full'` keeps the whole data's range. Only an auto y domain
   * moves — one the spec pins stays pinned.
   */
  zoomY?: 'visible' | 'full'
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
  /** The cursor's x in data units, or null. */
  readonly cursor: number | null
  /**
   * Re-render with new data or options. Zoom, hidden series, the
   * cursor and the hover under the pointer all persist. The enter
   * animation does **not** replay — an update is not an entrance —
   * unless `{ enter: true }` asks for it.
   */
  update(spec: ChartOptions, options?: { enter?: boolean }): void
  /** Render a pending batched update now. */
  flush(): void
  /** Move the cursor (null removes it); it survives re-renders. */
  setCursor(x: DataValue | null): void
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

/**
 * A series as it appears inside an x window: the samples in it, and
 * — where a segment crosses an edge — the point ON the edge, linearly
 * interpolated. So a window between two sparse samples still sees the
 * line through it, and a spike just outside it does not count: what
 * is measured is what shows. A gap marks where samples were dropped,
 * so separate runs never join.
 */
export function windowSamples(data: DataSeries, window: readonly [number, number]): DataSeries {
  const [lo, hi] = window
  const inside = (x: number): boolean => x >= lo && x <= hi
  const finite = (p: readonly [number, number] | undefined): p is readonly [number, number] =>
    p !== undefined && Number.isFinite(p[0]) && Number.isFinite(p[1])
  /** Where the segment a→b meets the window's edges, in travel order. */
  const crossings = (a: readonly [number, number], b: readonly [number, number]): (readonly [number, number])[] => {
    if (a[0] === b[0]) return []
    const at = (x: number): readonly [number, number] => [x, a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0])]
    const between = (x: number): boolean => x > Math.min(a[0], b[0]) && x < Math.max(a[0], b[0])
    const edges = [lo, hi].filter(between).map(at)
    return a[0] < b[0] ? edges : edges.reverse()
  }
  const out: (readonly [number, number])[] = []
  let open = false // whether the output currently ends in a live run
  const push = (p: readonly [number, number]): void => {
    out.push(p)
    open = true
  }
  const gap = (): void => {
    if (open) out.push([NaN, NaN])
    open = false
  }
  data.forEach((sample, i) => {
    const prev = data[i - 1]
    if (!finite(sample)) {
      gap()
      return
    }
    if (finite(prev)) {
      const edge = crossings(prev, sample)
      // Leaving the window ends the run at the edge; entering starts one there.
      if (inside(prev[0]) && !inside(sample[0])) {
        for (const p of edge) push(p)
        gap()
      } else if (!inside(prev[0])) {
        if (edge.length === 2) {
          // Straight through the window: both edges, then out again.
          gap()
          for (const p of edge) push(p)
          if (!inside(sample[0])) gap()
        } else if (inside(sample[0])) {
          gap()
          for (const p of edge) push(p)
        }
      }
    } else if (!inside(sample[0])) {
      return
    }
    if (inside(sample[0])) push(sample)
  })
  if (out.length && Number.isNaN(out[out.length - 1]![0])) out.pop()
  return out
}

/** A spec cut to the x window — what the y axis should scale to. */
function windowSpec(spec: ChartOptions, window: readonly [number, number]): ChartOptions {
  const categories = { x: spec.x?.categories, y: spec.y?.categories }
  return {
    ...spec,
    legend: false,
    series: spec.series.map((s) => {
      if (s.kind === 'candlestick') {
        const candles = (s.data as readonly Candle[]).filter((c) => {
          const x = toNumber(c[0], categories.x)
          return x >= window[0] && x <= window[1]
        })
        return { ...s, data: candles, enter: undefined }
      }
      const pairs = toSeries(s.data as DataInput, categories)
      // Bars and scatter marks are in the window or not; a line or an
      // area also reaches the window's edges.
      const cut =
        s.kind === 'bar' || s.kind === 'scatter'
          ? pairs.filter((p) => p[0] >= window[0] && p[0] <= window[1])
          : windowSamples(pairs, window)
      return { ...s, data: cut, enter: undefined }
    }),
  }
}

/** Series kinds the brush strip draws, simplified. */
function brushSeries(pic: Picture, frame: ChartFrame, spec: ChartOptions, theme: ChartTheme): void {
  spec.series.forEach((s, i) => {
    if (s.kind === 'candlestick') return
    const id = `brush-${i}`
    const style = { stroke: theme.brushStrip.stroke, strokeWidth: 1, fill: theme.brushStrip.fill }
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
    zoomY = 'visible',
    batchUpdates = false,
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
  // What outlives a render: the cursor, and whether the data's own
  // extent needs measuring again.
  let cursor: DataValue | null = interaction.cursor ?? null
  let fullDirty = true
  let pendingFrame: number | null = null
  // A drag (zoom selection, brush) ends in a click event; it must not
  // reach onClick as if the user had clicked a sample.
  let swallowClick = false
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
    // The pointer has not moved just because the chart re-rendered:
    // the tooltip and crosshair come back where they were.
    const hoverAt = controller?.hoverPoint ?? null
    controller?.destroy()
    svg?.remove()

    const width = plotWidth()
    // The data's own extent — what the brush spans and a zoom is
    // clamped to — worked out without drawing, whenever the spec
    // changes: a render is one chart build, never two.
    if (fullDirty) {
      const full = chartDomains(current)
      fullDomain = full.x
      fullYDomain = full.y
      fullDirty = false
      if (domain) {
        const clamped = clampDomain(domain)
        domain = clamped[0] < clamped[1] ? clamped : null
      }
    }
    const xSpec: ChartOptions['x'] = domain
      ? { ...current.x, domain, exact: true }
      : current.x
    const pic = picture(pictureOptions)
    // Enter animations play once, on the first render — a zoom or a
    // resize is not an entrance.
    const spec = rendered ? stripEnter(current) : current
    rendered = true
    // A view that zooms or brushes shows a window of the data, so it
    // clips — from the first render, not only once a domain is applied,
    // so nothing shifts on the first zoom. Without the clip a zoomed
    // series runs past the axes and the fitted viewBox grows to hold
    // it. `clip: false` in the spec still wins.
    const windowed = (zoom === 'x' || brushOpts !== null) && !categorical()
    // While zoomed, an auto y domain follows the window: chart() works
    // it out from the windowed samples (stacks, baselines and nice
    // ticks included) without drawing them, and the real render —
    // every sample, so indices stay the caller's — is pinned to that.
    let ySpec = spec.y
    const yAuto = spec.y?.domain === undefined || spec.y.domain === 'auto'
    if (domain && zoomY === 'visible' && yAuto && !spec.y?.categories) {
      ySpec = { ...spec.y, domain: chartDomains({ ...windowSpec(spec, domain), x: xSpec }).y, exact: true }
    }
    frame = chart(pic, { ...spec, clip: spec.clip ?? windowed, width, x: xSpec, y: ySpec })

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
        style: { stroke: frame.theme.brushStrip.stroke, strokeWidth: 1 },
        styleSheet: null,
        theme: frame.theme,
      })
      brushSeries(pic, brushFrame, current, frame.theme)
      const [d0, d1] = domain ?? fullDomain
      const wx0 = brushFrame.x(d0)
      const wx1 = brushFrame.x(d1)
      pic.filldraw(rect(wx0, top, Math.max(1, wx1 - wx0), height), {
        style: { fill: frame.theme.accent, fillOpacity: 0.12, stroke: frame.theme.accent, strokeWidth: 1 },
        className: 'jikz-brush-window',
        attributes: { 'data-brush': 'window' },
      })
      for (const [side, x0] of [['w', wx0], ['e', wx1]] as const) {
        pic.filldraw(rect(x0 - BRUSH_HANDLE / 2, top + height / 4, BRUSH_HANDLE, height / 2), {
          style: { fill: frame.theme.surface, stroke: frame.theme.accent, strokeWidth: 1, roundedCorners: 2 },
          className: 'jikz-brush-handle',
          attributes: { 'data-brush': side },
        })
      }
    }

    svg = pic.mount(container, fit ? { fit: true, padding } : { width: current.width + 2 * padding, height: current.height + 2 * padding })
    svg.setAttribute('style', 'max-width:100%;height:auto;display:block')
    controller = attachChart(svg, frame, { ...interaction, cursor })
    for (const id of hidden) controller.setVisible(id, false)
    if (hoverAt) controller.hover(hoverAt)
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
    box.setAttribute('fill', f.theme.accent)
    box.setAttribute('fill-opacity', '0.12')
    box.setAttribute('stroke', f.theme.accent)
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
      swallowClick = true
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
      if (drag) swallowClick = true
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

  // A drag's trailing click is swallowed before it reaches the chart;
  // any new press clears the flag, so a click that never came cannot
  // eat the next real one. On the container: it outlives re-renders.
  const onClickCapture = (e: Event): void => {
    if (!swallowClick) return
    swallowClick = false
    e.stopPropagation()
    e.preventDefault()
  }
  const onPressCapture = (): void => {
    swallowClick = false
  }
  container.addEventListener('click', onClickCapture, true)
  container.addEventListener('pointerdown', onPressCapture, true)

  const flush = (): void => {
    if (pendingFrame !== null && typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(pendingFrame)
    pendingFrame = null
    render()
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
    get cursor() {
      return controller?.cursor ?? null
    },
    update(next, opts = {}) {
      current = next
      // New data may have a new extent; the next render measures it.
      fullDirty = true
      // An update is not an entrance, unless asked.
      if (opts.enter) rendered = false
      if (batchUpdates && typeof requestAnimationFrame !== 'undefined') {
        if (pendingFrame === null) pendingFrame = requestAnimationFrame(flush)
        return
      }
      render()
    },
    flush,
    setCursor(x) {
      cursor = x
      controller?.setCursor(x)
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
      if (pendingFrame !== null && typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(pendingFrame)
      container.removeEventListener('click', onClickCapture, true)
      container.removeEventListener('pointerdown', onPressCapture, true)
      for (const undo of cleanup) undo()
      cleanup = []
      controller?.destroy()
      svg?.remove()
      svg = null
    },
  }
}
