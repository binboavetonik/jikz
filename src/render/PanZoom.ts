/**
 * PanZoom — first-class pan/zoom interaction for mounted pictures.
 *
 * Split in two, matching the library's architecture:
 *
 *   - a DOM-free core (`meetFit`, `screenToScene`, `zoomAtScreenPoint`,
 *     `panByScreenDelta`) — pure math over the viewBox letterbox mapping,
 *     unit-testable in Node;
 *   - a DOM adapter ({@link attachPanZoom} / {@link PanZoomController}) —
 *     listeners on the mounted `<svg>`, mutating the viewport group's
 *     `transform` attribute. No re-rendering: one attribute write per frame.
 *
 * The scene is wrapped in `<g class="jikz-viewport">` by
 * `SVGRendererOptions.viewportGroup`; the controller owns that attribute.
 * All geometry stays in user space — anchors, edge endpoints and hit
 * targets are unaffected, exactly like TikZ canvas transformations.
 *
 * Cursor→user conversion deliberately uses `getBoundingClientRect` +
 * viewBox `meet` letterbox math instead of `getScreenCTM`, which jsdom
 * does not implement — DOM tests can stub the rect.
 */

import { Point, point } from '../core/Point'

/** Class of the viewport group the controller drives. */
export const PANZOOM_VIEWPORT_CLASS = 'jikz-viewport'

/**
 * Pan/zoom state: `screen = scale · user + t`, applied to the viewport
 * group as `translate(tx ty) scale(scale)`.
 */
export interface ViewTransform {
  tx: number
  ty: number
  scale: number
}

/** Identity: the viewBox fit (browser letterboxing) frames the content. */
export const IDENTITY_TRANSFORM: ViewTransform = { tx: 0, ty: 0, scale: 1 }

/** A viewBox rectangle in user coordinates. */
export interface ViewBoxRect {
  x: number
  y: number
  width: number
  height: number
}

/** A container size in CSS px. */
export interface ViewportSize {
  width: number
  height: number
}

/** Options for {@link attachPanZoom} / `Picture.mount({ panZoom })`. */
export interface PanZoomOptions {
  /** Minimum zoom scale (default: 0.15). */
  minScale?: number
  /** Maximum zoom scale (default: 4). */
  maxScale?: number
  /** Wheel zooms to the cursor (default: true). */
  wheel?: boolean
  /**
   * Zoom factor per wheel notch (default: 1.1). Applied exponentially —
   * `factor^(-deltaY/100)` — so trackpads zoom smoothly and notched wheels
   * match the factor per click.
   */
  wheelFactor?: number
  /** Pointer-drag pans (default: true). Touch drags included. */
  drag?: boolean
  /**
   * Drag threshold in px (default: 3). Movement below it does not set the
   * drag flag, so click handlers on scene elements stay clean.
   */
  dragThreshold?: number
  /** Two-pointer pinch zooms (default: true). */
  pinch?: boolean
  /** Double-click resets to the fitted view (default: true). */
  doubleClickReset?: boolean
  /** Called after every applied transform change. */
  onTransform?(t: ViewTransform): void
}

/**
 * Handle returned by `Picture.mount(container, { panZoom: … })`.
 * Owns the viewport group's `transform` attribute and all listeners.
 */
export interface PanZoomController {
  /** The mounted root element. */
  readonly svg: SVGElement
  /** Current pan/zoom state (a copy). */
  readonly transform: ViewTransform
  /** Merge a partial transform (scale is clamped) and apply it. */
  setTransform(t: Partial<ViewTransform>): void
  /** Back to the viewBox fit (identity transform). */
  resetToFit(): void
  /** True when the last pointer interaction moved past the drag threshold —
   *  check this in click handlers to suppress click-after-pan. */
  wasDrag(): boolean
  /** Convert client (viewport) coordinates to scene user coordinates. */
  screenToUser(clientX: number, clientY: number): Point | null
  /** Remove all listeners. Call on unmount/remount cycles. */
  destroy(): void
}

// ─────────────────────────────────────────────────────────────────
// Pure core — node-testable
// ─────────────────────────────────────────────────────────────────

/**
 * The base `preserveAspectRatio="xMidYMid meet"` mapping: scale and offset
 * that fit `viewBox` into `container`, centered. Returns null for degenerate
 * (zero-size) containers or viewBoxes — callers skip the interaction.
 */
export function meetFit(
  container: ViewportSize,
  viewBox: ViewBoxRect
): { scale: number; offsetX: number; offsetY: number } | null {
  if (container.width <= 0 || container.height <= 0) return null
  if (viewBox.width <= 0 || viewBox.height <= 0) return null
  const scale = Math.min(container.width / viewBox.width, container.height / viewBox.height)
  return {
    scale,
    offsetX: (container.width - viewBox.width * scale) / 2,
    offsetY: (container.height - viewBox.height * scale) / 2,
  }
}

/**
 * Screen px (container-relative) → scene user coordinates, inverting both
 * the viewBox fit and the pan/zoom transform:
 * `screen = ((scale·scene + t) − vbOrigin) · fit + offset`.
 */
export function screenToScene(
  container: ViewportSize,
  viewBox: ViewBoxRect,
  t: ViewTransform,
  sx: number,
  sy: number
): Point | null {
  const fit = meetFit(container, viewBox)
  if (!fit || t.scale === 0) return null
  const vbX = (sx - fit.offsetX) / fit.scale + viewBox.x
  const vbY = (sy - fit.offsetY) / fit.scale + viewBox.y
  return point((vbX - t.tx) / t.scale, (vbY - t.ty) / t.scale)
}

/** Scene user coordinates → screen px (container-relative). Inverse of
 *  {@link screenToScene}; mostly for tests and overlays. */
export function sceneToScreen(
  container: ViewportSize,
  viewBox: ViewBoxRect,
  t: ViewTransform,
  px: number,
  py: number
): Point | null {
  const fit = meetFit(container, viewBox)
  if (!fit) return null
  return point(
    (t.scale * px + t.tx - viewBox.x) * fit.scale + fit.offsetX,
    (t.scale * py + t.ty - viewBox.y) * fit.scale + fit.offsetY
  )
}

/** Clamp a scale factor into [minScale, maxScale]. */
export function clampScale(s: number, minScale: number, maxScale: number): number {
  return Math.min(maxScale, Math.max(minScale, s))
}

/**
 * Zoom by `factor`, keeping the scene point under `(sx, sy)` fixed.
 * Returns the input unchanged when the scale clamps out or the container
 * is degenerate.
 */
export function zoomAtScreenPoint(
  container: ViewportSize,
  viewBox: ViewBoxRect,
  t: ViewTransform,
  sx: number,
  sy: number,
  factor: number,
  minScale: number,
  maxScale: number
): ViewTransform {
  const scene = screenToScene(container, viewBox, t, sx, sy)
  if (!scene || factor <= 0) return t
  const s2 = clampScale(t.scale * factor, minScale, maxScale)
  if (s2 === t.scale) return t
  // vbUser = s·scene + t must stay equal across the zoom:
  // t2 = t + (s − s2)·scene
  return {
    scale: s2,
    tx: t.tx + (t.scale - s2) * scene.x,
    ty: t.ty + (t.scale - s2) * scene.y,
  }
}

/** Pan by a screen-px delta. The viewport translate lives in viewBox
 *  units — before the fit mapping — so the shift is `ds / fit` regardless
 *  of the current zoom scale. */
export function panByScreenDelta(
  container: ViewportSize,
  viewBox: ViewBoxRect,
  t: ViewTransform,
  dx: number,
  dy: number
): ViewTransform {
  const fit = meetFit(container, viewBox)
  if (!fit) return t
  return { ...t, tx: t.tx + dx / fit.scale, ty: t.ty + dy / fit.scale }
}

// ─────────────────────────────────────────────────────────────────
// DOM adapter
// ─────────────────────────────────────────────────────────────────

type ResolvedOptions = {
  minScale: number
  maxScale: number
  wheel: boolean
  wheelFactor: number
  drag: boolean
  dragThreshold: number
  pinch: boolean
  doubleClickReset: boolean
  onTransform?: (t: ViewTransform) => void
}

class PanZoomControllerImpl implements PanZoomController {
  private t: ViewTransform = { ...IDENTITY_TRANSFORM }
  /** Active pointers: pointerId → client position. */
  private readonly pointers = new Map<number, { x: number; y: number }>()
  private downPos: { x: number; y: number } | null = null
  private lastPos: { x: number; y: number } | null = null
  private dragExceeded = false
  /** Previous pinch frame: distance and midpoint, in client coords. */
  private pinchPrev: { dist: number; midX: number; midY: number } | null = null

  constructor(
    public readonly svg: SVGElement,
    private readonly viewport: Element,
    private readonly viewBox: ViewBoxRect,
    private readonly opts: ResolvedOptions
  ) {
    // React-style passive defaults don't apply here — bind wheel as
    // non-passive so preventDefault stops page scroll from hijacking zoom.
    svg.addEventListener('wheel', this.onWheel, { passive: false })
    svg.addEventListener('pointerdown', this.onPointerDown as EventListener)
    svg.addEventListener('pointermove', this.onPointerMove as EventListener)
    svg.addEventListener('pointerup', this.onPointerUp as EventListener)
    svg.addEventListener('pointercancel', this.onPointerUp as EventListener)
    svg.addEventListener('dblclick', this.onDblClick)
  }

  get transform(): ViewTransform {
    return { ...this.t }
  }

  setTransform(partial: Partial<ViewTransform>): void {
    this.commit({
      tx: partial.tx ?? this.t.tx,
      ty: partial.ty ?? this.t.ty,
      scale: clampScale(partial.scale ?? this.t.scale, this.opts.minScale, this.opts.maxScale),
    })
  }

  resetToFit(): void {
    this.commit({ ...IDENTITY_TRANSFORM })
  }

  wasDrag(): boolean {
    return this.dragExceeded
  }

  screenToUser(clientX: number, clientY: number): Point | null {
    const m = this.metrics()
    if (!m) return null
    return screenToScene(m.size, this.viewBox, this.t, clientX - m.rect.left, clientY - m.rect.top)
  }

  destroy(): void {
    const svg = this.svg
    svg.removeEventListener('wheel', this.onWheel)
    svg.removeEventListener('pointerdown', this.onPointerDown as EventListener)
    svg.removeEventListener('pointermove', this.onPointerMove as EventListener)
    svg.removeEventListener('pointerup', this.onPointerUp as EventListener)
    svg.removeEventListener('pointercancel', this.onPointerUp as EventListener)
    svg.removeEventListener('dblclick', this.onDblClick)
    this.pointers.clear()
  }

  // ── internals ─────────────────────────────────────────────────

  /** Fresh container metrics each event; null for 0×0 (detached panels). */
  private metrics(): { rect: { left: number; top: number }; size: ViewportSize } | null {
    const rect = this.svg.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return null
    return { rect, size: { width: rect.width, height: rect.height } }
  }

  private commit(t: ViewTransform): void {
    this.t = t
    this.viewport.setAttribute('transform', `translate(${t.tx} ${t.ty}) scale(${t.scale})`)
    this.opts.onTransform?.({ ...t })
  }

  private onWheel = (e: WheelEvent): void => {
    if (!this.opts.wheel) return
    e.preventDefault()
    const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY // lines → px (Firefox)
    if (dy === 0) return
    const m = this.metrics()
    if (!m) return
    const factor = Math.pow(this.opts.wheelFactor, -dy / 100)
    this.commit(
      zoomAtScreenPoint(
        m.size, this.viewBox, this.t,
        e.clientX - m.rect.left, e.clientY - m.rect.top,
        factor, this.opts.minScale, this.opts.maxScale
      )
    )
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (!this.opts.drag && !this.opts.pinch) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    // Do NOT capture the pointer here: capture retargets the compatibility
    // click event to the svg root, which would break click handlers on
    // scene elements. Capture lazily once the drag threshold is exceeded.
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (this.pointers.size === 1) {
      this.dragExceeded = false
      this.downPos = { x: e.clientX, y: e.clientY }
      this.lastPos = { x: e.clientX, y: e.clientY }
      this.pinchPrev = null
    } else if (this.pointers.size === 2 && this.opts.pinch) {
      this.capture(e)
      this.pinchPrev = this.pinchState()
      this.dragExceeded = true
    }
  }

  /** Capture the pointer so a drag keeps tracking outside the svg.
   *  jsdom and older engines may not implement pointer capture. */
  private capture(e: PointerEvent): void {
    try {
      this.svg.setPointerCapture?.(e.pointerId)
    } catch {
      /* not implemented */
    }
  }

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.pointers.has(e.pointerId)) return
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (this.pointers.size === 2 && this.opts.pinch) {
      const cur = this.pinchState()
      const prev = this.pinchPrev
      if (cur && prev && prev.dist > 0) {
        const m = this.metrics()
        if (!m) return
        // Pan with the midpoint drift, then zoom around the current midpoint.
        let t = panByScreenDelta(
          m.size, this.viewBox, this.t, cur.midX - prev.midX, cur.midY - prev.midY
        )
        t = zoomAtScreenPoint(
          m.size, this.viewBox, t,
          cur.midX - m.rect.left, cur.midY - m.rect.top,
          cur.dist / prev.dist, this.opts.minScale, this.opts.maxScale
        )
        this.commit(t)
        this.pinchPrev = cur
        this.dragExceeded = true
      }
      return
    }

    if (!this.opts.drag || this.pointers.size !== 1 || !this.lastPos || !this.downPos) return
    const dx = e.clientX - this.lastPos.x
    const dy = e.clientY - this.lastPos.y
    this.lastPos = { x: e.clientX, y: e.clientY }
    if (!this.dragExceeded) {
      // Ignore jitter so clicks still work; pan only past the threshold.
      if (
        Math.abs(e.clientX - this.downPos.x) < this.opts.dragThreshold &&
        Math.abs(e.clientY - this.downPos.y) < this.opts.dragThreshold
      ) {
        return
      }
      this.dragExceeded = true
      this.capture(e)
    }
    const m = this.metrics()
    if (!m) return
    this.commit(panByScreenDelta(m.size, this.viewBox, this.t, dx, dy))
  }

  private onPointerUp = (e: PointerEvent): void => {
    this.pointers.delete(e.pointerId)
    this.pinchPrev = null
    if (this.pointers.size === 0) {
      this.downPos = null
      this.lastPos = null
    }
  }

  private onDblClick = (): void => {
    if (this.opts.doubleClickReset) this.resetToFit()
  }

  /** Distance + midpoint of the two active pointers, in client coords. */
  private pinchState(): { dist: number; midX: number; midY: number } | null {
    const pts = [...this.pointers.values()]
    if (pts.length !== 2) return null
    const [a, b] = [pts[0]!, pts[1]!]
    return {
      dist: Math.hypot(b.x - a.x, b.y - a.y),
      midX: (a.x + b.x) / 2,
      midY: (a.y + b.y) / 2,
    }
  }
}

/**
 * Attach pan/zoom interaction to a mounted picture. The scene must already
 * be wrapped in `<g class="jikz-viewport">` (`SVGRendererOptions.viewportGroup`
 * — `Picture.mount({ panZoom })` does both).
 *
 * Sets the root svg to `width/height: 100%` (the browser letterboxes the
 * viewBox, so identity transform IS the fitted view) and
 * `touch-action: none` (so touch drags/pinches reach the pointer handlers).
 */
export function attachPanZoom(
  svg: SVGElement,
  viewBox: ViewBoxRect,
  options: PanZoomOptions = {}
): PanZoomController {
  const viewport = svg.querySelector(`g.${PANZOOM_VIEWPORT_CLASS}`)
  if (!viewport) {
    throw new Error(
      `attachPanZoom: scene is not wrapped in <g class="${PANZOOM_VIEWPORT_CLASS}">. ` +
        'Render with SVGRendererOptions.viewportGroup or Picture.mount({ panZoom }).'
    )
  }
  svg.setAttribute('width', '100%')
  svg.setAttribute('height', '100%')
  svg.style.touchAction = 'none'

  const resolved: ResolvedOptions = {
    minScale: options.minScale ?? 0.15,
    maxScale: options.maxScale ?? 4,
    wheel: options.wheel ?? true,
    wheelFactor: options.wheelFactor ?? 1.1,
    drag: options.drag ?? true,
    dragThreshold: options.dragThreshold ?? 3,
    pinch: options.pinch ?? true,
    doubleClickReset: options.doubleClickReset ?? true,
    onTransform: options.onTransform,
  }
  return new PanZoomControllerImpl(svg, viewport, viewBox, resolved)
}
