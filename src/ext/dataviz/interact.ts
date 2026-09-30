/**
 * The interaction adapter — what recharts gives for free: a tooltip
 * and crosshair that follow the pointer, active dots on the samples
 * under it, hover highlight, and legend rows that toggle their series.
 *
 * Thin DOM over the pure model: the frame's `hitTest` says what is
 * under the pointer, the series' `data-series` tags say which
 * elements belong to it, and this file only paints an overlay and a
 * tooltip. Opt in by importing it — a bundle that never interacts
 * pays nothing.
 *
 * ```ts
 * const frame = chart(pic, spec)
 * const svg = pic.mount(el, { fit: true })
 * const chartUi = attachChart(svg, frame, { tooltip: true, crosshair: 'x' })
 * ```
 */
import { point, type Point } from '../../core/Point'
import type { PointLike } from '../../core/types'
import {
  PANZOOM_VIEWPORT_CLASS,
  screenToScene,
  sceneToScreen,
  IDENTITY_TRANSFORM,
  type ViewTransform,
  type ViewBoxRect,
} from '../../render/PanZoom'
import { seriesColor, type ChartFrame, type HitResult, type HitTestOptions } from './frame'

/** Tooltip options for {@link attachChart}. */
export interface ChartTooltipOptions {
  /**
   * What the tooltip shows for a hit: an HTML string or a DOM node.
   * Default: the x value as a title and one row per series — a
   * swatch, the label, the y value — through the axes' formatters.
   */
  format?: (hit: HitResult, frame: ChartFrame) => string | Node
  /** Extra class on the tooltip element (it always has `jikz-tooltip`). */
  className?: string
  /** Gap between the pointer and the tooltip, px (default 12). */
  offset?: number
}

/** Options for {@link attachChart}. */
export interface ChartInteractionOptions {
  /** Show a tooltip (default true). */
  tooltip?: boolean | ChartTooltipOptions
  /**
   * Crosshair lines through the hit: along x (the line-chart cursor),
   * y, both, or none. Default: `'x'` in x mode, none in nearest mode.
   */
  crosshair?: 'x' | 'y' | 'both' | false
  /** Mark the samples under the pointer with dots (default true). */
  activeDots?: boolean
  /** Hovering a legend row dims the other series (default true). */
  highlight?: boolean
  /** Clicking a legend row hides or shows its series (default true). */
  legendToggle?: boolean
  /**
   * How hits are found. Default: `mode: 'nearest'` within 24px when
   * every visible series is a scatter, else `mode: 'x'`.
   */
  hitTest?: HitTestOptions
  onHover?: (hit: HitResult | null) => void
  onClick?: (hit: HitResult | null, event: MouseEvent) => void
}

/** What {@link attachChart} returns: the live handle on one chart. */
export interface ChartController {
  readonly svg: SVGElement
  readonly frame: ChartFrame
  /** The overlay group crosshairs and dots paint into — free for callers too. */
  readonly overlay: SVGGElement
  /** Ids of the series currently hidden. */
  readonly hidden: ReadonlySet<string>
  /** The tooltip element, once one has shown. */
  readonly tooltipElement: HTMLElement | null
  /** Client coordinates → picture coordinates (null when the svg has no size). */
  clientToUser(clientX: number, clientY: number): Point | null
  /**
   * Run the hover pipeline at a picture point — what a pointer move
   * does — or clear it with null. Returns the hit, so linked charts
   * can pass a hit's x along.
   */
  hover(at: PointLike | null): HitResult | null
  /** Dim every series but this one; null restores. */
  highlight(id: string | null): void
  setVisible(id: string, visible: boolean): void
  toggle(id: string): void
  isVisible(id: string): boolean
  /** Remove listeners, the overlay's contents and the tooltip. */
  destroy(): void
}

const SVG_NS = 'http://www.w3.org/2000/svg'
const DIM_OPACITY = '0.25'
const HIDDEN_LEGEND_OPACITY = '0.35'

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

/** The svg's viewBox, or its width/height when it has none. */
export function viewBoxOf(svg: SVGElement): ViewBoxRect {
  const raw = svg.getAttribute('viewBox')
  if (raw) {
    const [x = 0, y = 0, width = 0, height = 0] = raw.trim().split(/[\s,]+/).map(Number)
    return { x, y, width, height }
  }
  return { x: 0, y: 0, width: Number(svg.getAttribute('width')) || 0, height: Number(svg.getAttribute('height')) || 0 }
}

/** The pan/zoom viewport transform, when the scene has one. */
export function viewportTransformOf(svg: SVGElement): ViewTransform {
  const viewport = svg.querySelector(`g.${PANZOOM_VIEWPORT_CLASS}`)
  const raw = viewport?.getAttribute('transform')
  if (!raw) return IDENTITY_TRANSFORM
  const m = raw.match(/translate\(\s*([-\d.e]+)[\s,]+([-\d.e]+)\s*\)\s*scale\(\s*([-\d.e]+)\s*\)/)
  if (!m) return IDENTITY_TRANSFORM
  return { tx: Number(m[1]), ty: Number(m[2]), scale: Number(m[3]) }
}

/** The default tooltip body: title from the x axis, one row per sample. */
export function defaultTooltip(hit: HitResult, frame: ChartFrame, mode: 'x' | 'y' | 'nearest'): string {
  const title = mode === 'y' ? frame.yScale.format(hit.y) : frame.xScale.format(hit.x)
  const rows = hit.samples
    .map((s) => {
      const record = frame.seriesById(s.seriesId)
      const label = record?.label ?? s.seriesId
      const value = mode === 'y' ? frame.xScale.format(s.x) : frame.yScale.format(s.y)
      const color = record ? seriesColor(record) : '#0f172a'
      return (
        `<div class="jikz-tooltip-row" style="display:flex;align-items:center;gap:6px">` +
        `<span class="jikz-tooltip-swatch" style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${color}"></span>` +
        `<span class="jikz-tooltip-label" style="color:#475569">${escapeHtml(label)}</span>` +
        `<span class="jikz-tooltip-value" style="margin-left:auto;font-variant-numeric:tabular-nums">${escapeHtml(value)}</span>` +
        `</div>`
      )
    })
    .join('')
  return `<div class="jikz-tooltip-title" style="font-weight:600;margin-bottom:4px">${escapeHtml(title)}</div>${rows}`
}

const TOOLTIP_STYLE =
  'position:absolute;pointer-events:none;z-index:10;min-width:96px;padding:6px 8px;' +
  'font:12px/1.4 system-ui,sans-serif;color:#0f172a;background:#fff;' +
  'border:1px solid #cbd5e1;border-radius:6px;box-shadow:0 2px 8px rgba(15,23,42,.12);white-space:nowrap'

/**
 * Attach tooltip, crosshair, active dots, hover highlight and legend
 * toggles to a mounted chart. `frame` is what `chart()`/`axes()`
 * returned for the picture that `svg` renders.
 */
export function attachChart(
  svg: SVGElement,
  frame: ChartFrame,
  options: ChartInteractionOptions = {}
): ChartController {
  const {
    tooltip = true,
    activeDots = true,
    highlight: highlightOn = true,
    legendToggle = true,
    onHover,
    onClick,
  } = options
  const tooltipOpts: ChartTooltipOptions | null =
    tooltip === false ? null : tooltip === true ? {} : tooltip
  const hidden = new Set<string>()
  const doc = svg.ownerDocument

  // ── The overlay: the frame's group, moved to the end so it paints on top.
  let overlay = frame.overlayClass
    ? (svg.querySelector(`g.${frame.overlayClass}`) as SVGGElement | null)
    : null
  if (!overlay) {
    overlay = doc.createElementNS(SVG_NS, 'g') as SVGGElement
    overlay.setAttribute('class', 'jikz-chart-overlay')
  }
  const scene = overlay.parentElement ?? svg
  scene.appendChild(overlay) // re-appending moves it last

  // ── Element lookup by series id (ids may hold any character, so no selector).
  const byId = new Map<string, Element[]>()
  const elementsOf = (id: string): Element[] => {
    let list = byId.get(id)
    if (!list) {
      list = [...svg.querySelectorAll('[data-series]')].filter(
        (el) => el.getAttribute('data-series') === id && !el.classList.contains('jikz-legend-entry')
      )
      byId.set(id, list)
    }
    return list
  }
  const legendRows = (id: string): Element[] =>
    [...svg.querySelectorAll('.jikz-legend-entry')].filter((el) => el.getAttribute('data-series') === id)

  // ── Coordinates.
  const clientToUser = (clientX: number, clientY: number): Point | null => {
    const rect = svg.getBoundingClientRect()
    return screenToScene(
      { width: rect.width, height: rect.height },
      viewBoxOf(svg),
      viewportTransformOf(svg),
      clientX - rect.left,
      clientY - rect.top
    )
  }
  const userToClient = (p: PointLike): Point | null => {
    const rect = svg.getBoundingClientRect()
    const s = sceneToScreen({ width: rect.width, height: rect.height }, viewBoxOf(svg), viewportTransformOf(svg), p.x, p.y)
    return s ? point(s.x + rect.left, s.y + rect.top) : null
  }

  // ── Hit mode: nearest for pure scatter charts, x otherwise.
  const visibleIds = (): string[] => frame.series.map((s) => s.id).filter((id) => !hidden.has(id))
  const hitOptions = (): HitTestOptions => {
    const ids = visibleIds()
    const allScatter = ids.length > 0 && ids.every((id) => frame.seriesById(id)?.kind === 'scatter')
    const mode = options.hitTest?.mode ?? (allScatter ? 'nearest' : 'x')
    return {
      mode,
      maxDistance: options.hitTest?.maxDistance ?? (mode === 'nearest' ? 24 : Infinity),
      ids,
    }
  }
  const crosshairFor = (mode: HitTestOptions['mode']): 'x' | 'y' | 'both' | false =>
    options.crosshair !== undefined ? options.crosshair : mode === 'nearest' ? false : mode === 'y' ? 'y' : 'x'

  // ── Overlay parts, created once, shown as needed.
  const el = (tag: string, attrs: Record<string, string | number>): SVGElement => {
    const node = doc.createElementNS(SVG_NS, tag) as SVGElement
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v))
    return node
  }
  // Hidden parts still have a position: inside the plot area, so a
  // bounds check of the DOM never sees them at the origin.
  const [ax0, ay0] = frame.plotArea
  const crossX = el('line', { class: 'jikz-crosshair', stroke: '#94a3b8', 'stroke-width': 1, 'stroke-dasharray': '3 3', x1: ax0, x2: ax0, y1: ay0, y2: ay0, display: 'none' })
  const crossY = el('line', { class: 'jikz-crosshair', stroke: '#94a3b8', 'stroke-width': 1, 'stroke-dasharray': '3 3', x1: ax0, x2: ax0, y1: ay0, y2: ay0, display: 'none' })
  overlay.append(crossX, crossY)
  const dots: SVGElement[] = []
  const dotAt = (i: number): SVGElement => {
    while (dots.length <= i) {
      const dot = el('circle', { class: 'jikz-active-dot', r: 4.5, stroke: '#ffffff', 'stroke-width': 2, cx: ax0, cy: ay0, display: 'none' })
      overlay.append(dot)
      dots.push(dot)
    }
    return dots[i]!
  }

  // ── Tooltip.
  let tip: HTMLElement | null = null
  const host = (): HTMLElement | null => (svg.parentElement as HTMLElement | null)
  const ensureTip = (): HTMLElement | null => {
    if (tip) return tip
    const container = host()
    if (!container || !tooltipOpts) return null
    const view = doc.defaultView
    if (view && view.getComputedStyle(container).position === 'static') container.style.position = 'relative'
    tip = doc.createElement('div')
    tip.className = `jikz-tooltip${tooltipOpts.className ? ` ${tooltipOpts.className}` : ''}`
    tip.setAttribute('style', `${TOOLTIP_STYLE};display:none`)
    container.appendChild(tip)
    return tip
  }
  const showTip = (hit: HitResult, mode: HitTestOptions['mode'], at: PointLike): void => {
    const node = ensureTip()
    const container = host()
    if (!node || !container || !tooltipOpts) return
    const content = tooltipOpts.format ? tooltipOpts.format(hit, frame) : defaultTooltip(hit, frame, mode ?? 'x')
    if (typeof content === 'string') node.innerHTML = content
    else node.replaceChildren(content)
    node.style.display = 'block'
    // Position beside the pointer, in the container's box, flipping
    // away from the edges it would cross.
    const client = userToClient(at)
    const box = container.getBoundingClientRect()
    if (!client) return
    const offset = tooltipOpts.offset ?? 12
    let left = client.x - box.left + offset
    let top = client.y - box.top + offset
    const w = node.offsetWidth
    const h = node.offsetHeight
    if (left + w > box.width - 4) left = client.x - box.left - offset - w
    if (top + h > box.height - 4) top = client.y - box.top - offset - h
    node.style.left = `${Math.max(0, left)}px`
    node.style.top = `${Math.max(0, top)}px`
  }
  const hideTip = (): void => {
    if (tip) tip.style.display = 'none'
  }

  // ── The hover pipeline.
  let pointerAt: PointLike | null = null
  const paint = (hit: HitResult | null, mode: HitTestOptions['mode'], at: PointLike | null): void => {
    const [x0, y0, x1, y1] = frame.plotArea
    const cross = hit ? crosshairFor(mode) : false
    if (hit && (cross === 'x' || cross === 'both')) {
      crossX.setAttribute('x1', String(hit.at.x))
      crossX.setAttribute('x2', String(hit.at.x))
      crossX.setAttribute('y1', String(y0))
      crossX.setAttribute('y2', String(y1))
      crossX.removeAttribute('display')
    } else crossX.setAttribute('display', 'none')
    if (hit && (cross === 'y' || cross === 'both')) {
      crossY.setAttribute('x1', String(x0))
      crossY.setAttribute('x2', String(x1))
      crossY.setAttribute('y1', String(hit.at.y))
      crossY.setAttribute('y2', String(hit.at.y))
      crossY.removeAttribute('display')
    } else crossY.setAttribute('display', 'none')
    const shown = hit && activeDots ? hit.samples : []
    shown.forEach((s, i) => {
      const dot = dotAt(i)
      const record = frame.seriesById(s.seriesId)
      dot.setAttribute('cx', String(s.at.x))
      dot.setAttribute('cy', String(s.at.y))
      dot.setAttribute('fill', record ? seriesColor(record) : '#0f172a')
      dot.setAttribute('data-series', s.seriesId)
      dot.removeAttribute('display')
    })
    for (let i = shown.length; i < dots.length; i++) dots[i]!.setAttribute('display', 'none')
    if (hit && at && tooltipOpts) showTip(hit, mode, at)
    else hideTip()
  }
  const hover = (at: PointLike | null): HitResult | null => {
    pointerAt = at
    const opts = hitOptions()
    const hit = at && opts.ids!.length ? frame.hitTest(at, opts) : null
    paint(hit, opts.mode, at)
    onHover?.(hit)
    return hit
  }

  // ── Highlight and visibility.
  const highlight = (id: string | null): void => {
    for (const s of frame.series) {
      const dim = id !== null && s.id !== id
      for (const node of elementsOf(s.id)) {
        if (dim) node.setAttribute('style', `opacity:${DIM_OPACITY}`)
        else node.removeAttribute('style')
        node.classList.toggle('jikz-dim', dim)
      }
    }
  }
  const setVisible = (id: string, visible: boolean): void => {
    if (visible) hidden.delete(id)
    else hidden.add(id)
    for (const node of elementsOf(id)) {
      if (visible) node.removeAttribute('display')
      else node.setAttribute('display', 'none')
    }
    for (const row of legendRows(id)) {
      row.classList.toggle('jikz-hidden', !visible)
      if (visible) row.removeAttribute('style')
      else row.setAttribute('style', `opacity:${HIDDEN_LEGEND_OPACITY}`)
    }
    hover(pointerAt)
  }

  // ── Listeners.
  const onMove = (e: MouseEvent): void => {
    hover(clientToUser(e.clientX, e.clientY))
  }
  const onLeave = (): void => {
    hover(null)
  }
  const onClickSvg = (e: MouseEvent): void => {
    if (!onClick) return
    const at = clientToUser(e.clientX, e.clientY)
    onClick(at ? frame.hitTest(at, hitOptions()) : null, e)
  }
  svg.addEventListener('pointermove', onMove)
  svg.addEventListener('pointerleave', onLeave)
  svg.addEventListener('click', onClickSvg)

  const legendCleanup: (() => void)[] = []
  for (const s of frame.series) {
    for (const row of legendRows(s.id)) {
      row.setAttribute('cursor', 'pointer')
      const enter = (): void => {
        if (highlightOn) highlight(s.id)
      }
      const leave = (): void => {
        if (highlightOn) highlight(null)
      }
      const click = (e: Event): void => {
        if (!legendToggle) return
        e.stopPropagation()
        setVisible(s.id, hidden.has(s.id))
      }
      row.addEventListener('pointerenter', enter)
      row.addEventListener('pointerleave', leave)
      row.addEventListener('click', click)
      legendCleanup.push(() => {
        row.removeEventListener('pointerenter', enter)
        row.removeEventListener('pointerleave', leave)
        row.removeEventListener('click', click)
        row.removeAttribute('cursor')
      })
    }
  }

  return {
    svg,
    frame,
    overlay,
    hidden,
    get tooltipElement() {
      return tip
    },
    clientToUser,
    hover,
    highlight,
    setVisible,
    toggle: (id) => setVisible(id, hidden.has(id)),
    isVisible: (id) => !hidden.has(id),
    destroy() {
      svg.removeEventListener('pointermove', onMove)
      svg.removeEventListener('pointerleave', onLeave)
      svg.removeEventListener('click', onClickSvg)
      for (const undo of legendCleanup) undo()
      highlight(null)
      for (const id of [...hidden]) setVisible(id, true)
      overlay.replaceChildren()
      tip?.remove()
      tip = null
    },
  }
}
