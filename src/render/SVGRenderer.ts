import { Point } from '../core/Point'
import type { Transform } from '../core/Transform'
import { PANZOOM_VIEWPORT_CLASS } from './PanZoom'
import { Path } from '../path/Path'
import { MarkedPath } from '../path/MarkedPath'
import { TextPath } from '../path/TextPath'
import { Line } from '../geometry/Line'
import { Circle } from '../geometry/Circle'
import { Arc } from '../geometry/Arc'
import { Rectangle } from '../geometry/Rectangle'
import { Ellipse } from '../geometry/Ellipse'
import type { Shape } from '../geometry/Shape'
import { Polygon } from '../geometry/Polygon'
import { Rotated } from '../geometry/Rotated'
import { Plot } from '../geometry/Plot'
import { plotMarkPath, plotMarkFilled } from '../geometry/PlotMark'
import { Node } from '../node/Node'
import { Edge } from '../node/Edge'
import {
  Renderer,
  Renderable,
  RenderOptions,
  TextOptions,
  GroupOptions,
  isPoint,
  pointMarkerRadius,
  isPath,
  isLine,
  isCircle,
  isArc,
  isRectangle,
  isEllipse,
  isPolygon,
  isNode,
  isEdge,
} from './Renderer'
import {
  RenderStyle,
  DEFAULT_STYLE,
  mergeStyles,
  styleList,
  styleToSVGAttributes,
  SVGAttributes,
  ClipSpec,
  DoubleLineSpec,
} from './StyleMapper'
import {
  FillPatternSpec,
  generatePatternId,
  normalizePatternSpec,
} from './FillPattern'
import {
  GradientSpec,
  generateGradientId,
  normalizeGradientSpec,
  angleToGradientCoords,
  createStopElements,
  isLinearGradient,
} from './Gradient'
import {
  DropShadowSpec,
  generateShadowId,
  normalizeShadowSpec,
  parseColorForFilter,
} from './Shadow'
import type { LayerName } from './Layer'
import { createSVGBuilder, SVGBuilder, SVGElement } from './SVGBuilder'
import { DefsManager } from './DefsManager'
import { LayerStack } from './LayerStack'
import { getArrowTip, resolveArrowTipKind } from './ArrowTip'
import {
  MathRenderer,
  MathRendererOptions,
  resolveMathRenderer,
  isLaTeX,
  extractLaTeX,
} from './MathRenderer'
import type { GroupRenderOptions, PictureRenderer } from '../picture/Picture'

// Re-export SVGBuilder so existing imports of the old SVGBuilder type
// that expected `createSVGRenderer(SVG().addTo(...))` can migrate by
// passing an SVGBuilder (or leaving it unset and letting the renderer
// create its own). SVG.js is no longer a dependency of this renderer.
export { SVGBuilder } from './SVGBuilder'

// ─────────────────────────────────────────────────────────────────────────────
// Arrow markers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fallback guard for the generic shape pipeline: anything with a
 * toSVGPath() that wasn't claimed by a more specific guard. Internal —
 * the public guards live in render/index.
 */
function isShapeLike(obj: unknown): obj is Shape {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as Shape).toSVGPath === 'function'
  )
}

/** Make a CSS color safe for use inside an SVG id. */
function colorKey(color: string): string {
  return color.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'none'
}

/**
 * Options for the KaTeX-based math pipeline.
 * @deprecated Use {@link MathRendererOptions} (identical shape).
 */
export type KaTeXOptions = MathRendererOptions

/**
 * Construction options for {@link SVGRenderer}.
 */
export interface SVGRendererOptions {
  /**
   * Math renderer for LaTeX labels (e.g. `katexAdapter(katex)`).
   * Falls back to a global `katex` binding when omitted (deprecated).
   */
  mathRenderer?: MathRenderer
  /**
   * Canvas-level transform applied to the whole scene: all render
   * output is wrapped in a root `<g transform="…">` (defs stay at the
   * document root). Geometry APIs (anchors, bounds, edge endpoints)
   * are unaffected — the transform is purely visual, like TikZ's
   * canvas transformations. Strokes and markers scale with the scene.
   */
  transform?: Transform
  /**
   * Wrap the scene in a dedicated viewport group
   * (`<g class="jikz-viewport">`), the element a {@link PanZoomController}
   * drives. `Picture.mount({ panZoom })` sets this; the group sits INSIDE
   * any canvas-transform group, so the two compose. Defs stay on the
   * document root either way.
   */
  viewportGroup?: boolean
}

/**
 * SVG renderer that emits through an {@link SVGBuilder}.
 *
 * The renderer produces a structured SVG tree. Call `toSVG()` on the
 * builder to serialize (works in any JS environment), or `mount()` to
 * attach a live DOM tree (browser only). SVG.js is no longer required.
 */
export class SVGRenderer implements Renderer<SVGElement, SVGBuilder> {
  private draw: SVGBuilder
  private sceneRoot: SVGBuilder
  private currentGroup: SVGBuilder | null = null
  /** Open scope groups, innermost last — see beginGroup/endGroup. */
  private readonly groupStack: (SVGBuilder | null)[] = []
  private defaultStyle: RenderStyle
  private clipPathCounter: number = 0
  private textPathCounter: number = 0

  // Collaborators: def bookkeeping, layers, math
  private readonly defsManager: DefsManager
  private readonly layerStack: LayerStack
  private readonly mathRenderer?: MathRenderer

  constructor(
    draw?: SVGBuilder,
    defaultStyle?: Partial<RenderStyle>,
    options?: SVGRendererOptions
  ) {
    this.draw = draw ?? createSVGBuilder()
    this.defaultStyle = mergeStyles(DEFAULT_STYLE, defaultStyle)
    // Canvas transform: scene content (including layers) goes into a
    // transformed root group; defs stay on the document root. The pan/zoom
    // viewport group nests inside it, so the controller never clobbers a
    // canvas transform.
    const canvas = options?.transform
      ? this.draw.group().attr({ transform: options.transform.toSVGMatrix() })
      : this.draw
    this.sceneRoot = options?.viewportGroup
      ? canvas.group().attr({ class: PANZOOM_VIEWPORT_CLASS })
      : canvas
    this.defsManager = new DefsManager(this.draw)
    this.layerStack = new LayerStack(this.sceneRoot)
    this.mathRenderer = options?.mathRenderer
  }

  /**
   * The underlying builder. Use `builder.toSVG(viewBox)` to serialize or
   * `builder.mount(containerEl)` to attach to a DOM tree.
   */
  get builder(): SVGBuilder {
    return this.draw
  }

  /** Convenience: serialize the current scene to an SVG string. */
  toSVG(viewBox?: { width: number; height: number }): string {
    return this.draw.toSVG(viewBox)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Arrow Markers
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Lazily define a marker for (tip kind, color, position) and return
   * its url(). Markers are per-color because SVG marker paint cannot
   * inherit the referencing path's stroke — a red edge needs a red
   * arrowhead, which requires a marker whose artwork is painted red.
   * Start and end markers are separate defs (pre-mirrored artwork,
   * orient=auto) to avoid auto-start-reverse renderer bugs.
   */
  private ensureMarker(arrowType: string, color: string, position: 'start' | 'end' = 'end'): string | null {
    const kind = resolveArrowTipKind(arrowType)
    const shape = getArrowTip(kind)
    if (!shape) return null

    const art = shape[position]
    const id = `arrow-${kind}${position === 'start' ? '-start' : ''}-${colorKey(color)}`
    return this.defsManager.ensure(id, (defs) => {
      const artwork: Record<string, unknown> = shape.filled
        ? { fill: color }
        : { fill: 'none', stroke: color, 'stroke-width': shape.strokeWidth ?? 1.5 }

      defs
        .marker(10, 10, (add) => {
          add.path(art.d).attr(artwork)
        })
        .attr({
          id,
          refX: art.refX,
          refY: 5,
          markerWidth: 6,
          markerHeight: 6,
          orient: 'auto',
        })
    })
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Fill Patterns
  // ─────────────────────────────────────────────────────────────────────────────

  private ensurePattern(spec: FillPatternSpec): string {
    const id = generatePatternId(spec)

    return this.defsManager.ensure(id, (defs) => {
      const def = spec.pattern
      const color = spec.color ?? '#000000'
      const lw = spec.lineWidth ?? def.defaultLineWidth
      const scale = spec.scale ?? 1
      const w = def.width * scale
      const h = def.height * scale

      const attrs: Record<string, unknown> = {
        id,
        patternUnits: 'userSpaceOnUse',
        width: w,
        height: h,
      }
      if (spec.rotation || scale !== 1) {
        const parts: string[] = []
        if (spec.rotation) parts.push(`rotate(${spec.rotation})`)
        if (scale !== 1) parts.push(`scale(${scale})`)
        attrs.patternTransform = parts.join(' ')
      }

      const pattern = defs.el('pattern', attrs)
      if (spec.backgroundColor) {
        pattern.el('rect', {
          width: def.width,
          height: def.height,
          fill: spec.backgroundColor,
        })
      }
      // Pattern content is produced as a pre-built XML fragment; embed it
      // verbatim. The string goes out through toSVG() and is parsed by
      // mount() if this tree is later rendered to DOM.
      pattern.raw(def.createContent(color, lw))
    })
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Gradients
  // ─────────────────────────────────────────────────────────────────────────────

  private ensureGradient(spec: GradientSpec): string {
    const normalized = normalizeGradientSpec(spec)
    const id = generateGradientId(normalized)

    return this.defsManager.ensure(id, (defs) => {
      if (isLinearGradient(normalized)) {
        const coords = angleToGradientCoords(normalized.angle ?? 90)
        defs
          .el('linearGradient', {
            id,
            x1: coords.x1,
            y1: coords.y1,
            x2: coords.x2,
            y2: coords.y2,
          })
          .raw(createStopElements(normalized.stops))
      } else {
        const attrs: Record<string, unknown> = {
          id,
          cx: `${(normalized.cx ?? 0.5) * 100}%`,
          cy: `${(normalized.cy ?? 0.5) * 100}%`,
          r: `${(normalized.r ?? 0.5) * 100}%`,
        }
        if (normalized.fx !== undefined) {
          attrs.fx = `${normalized.fx * 100}%`
        }
        if (normalized.fy !== undefined) {
          attrs.fy = `${normalized.fy * 100}%`
        }
        defs.el('radialGradient', attrs).raw(createStopElements(normalized.stops))
      }
    })
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Drop Shadows
  // ─────────────────────────────────────────────────────────────────────────────

  private ensureDropShadow(spec: DropShadowSpec): string {
    const normalized = normalizeShadowSpec(spec)
    const id = generateShadowId(normalized)

    return this.defsManager.ensure(id, (defs) => {
      const { floodColor, floodOpacity } = parseColorForFilter(
        normalized.color ?? 'rgba(0,0,0,0.3)'
      )

      const filter = defs.el('filter', {
        id,
        x: '-50%',
        y: '-50%',
        width: '200%',
        height: '200%',
      })

      filter.el('feGaussianBlur', {
        in: 'SourceAlpha',
        stdDeviation: normalized.blur ?? 3,
        result: 'blur',
      })
      filter.el('feOffset', {
        in: 'blur',
        dx: normalized.offsetX ?? 2,
        dy: normalized.offsetY ?? 2,
        result: 'offsetBlur',
      })
      filter.el('feFlood', {
        'flood-color': floodColor,
        'flood-opacity': floodOpacity,
        result: 'color',
      })
      filter.el('feComposite', {
        in: 'color',
        in2: 'offsetBlur',
        operator: 'in',
        result: 'shadow',
      })
      const feMerge = filter.el('feMerge', {})
      feMerge.el('feMergeNode', { in: 'shadow' })
      feMerge.el('feMergeNode', { in: 'SourceGraphic' })
    })
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Clip Paths
  // ─────────────────────────────────────────────────────────────────────────────

  private ensureClipPath(spec: ClipSpec): string {
    const id = `jikz-clip-${this.clipPathCounter++}`
    const clip = this.draw.defs().el('clipPath', { id })

    switch (spec.shape) {
      case 'rect':
        clip.el('rect', {
          x: spec.x ?? 0,
          y: spec.y ?? 0,
          width: spec.width ?? 100,
          height: spec.height ?? 100,
        })
        break
      case 'circle':
        clip.el('circle', {
          cx: spec.cx ?? 50,
          cy: spec.cy ?? 50,
          r: spec.r ?? 50,
        })
        break
      case 'ellipse':
        clip.el('ellipse', {
          cx: spec.cx ?? 50,
          cy: spec.cy ?? 50,
          rx: spec.rx ?? 50,
          ry: spec.ry ?? 30,
        })
        break
      case 'path':
        clip.el('path', {
          d: spec.d ?? 'M0,0 L100,0 L100,100 L0,100 Z',
        })
        break
      default:
        clip.el('rect', { width: 100, height: 100 })
    }

    return `url(#${id})`
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Style Resolution
  // ─────────────────────────────────────────────────────────────────────────────

  private resolveStyleAttributes(style: RenderStyle): SVGAttributes {
    const attrs = styleToSVGAttributes(style)

    // Fill pattern (takes precedence over gradient for fill)
    if (style.fillPattern) {
      const spec = normalizePatternSpec(style.fillPattern)
      attrs.fill = this.ensurePattern(spec)
    }

    // Gradient (only if no fill pattern)
    if (style.gradient && !style.fillPattern) {
      attrs.fill = this.ensureGradient(style.gradient)
    }

    // Drop shadow
    if (style.dropShadow) {
      const spec = typeof style.dropShadow === 'boolean' ? {} : style.dropShadow
      attrs.filter = this.ensureDropShadow(spec)
    }

    // Clip path
    if (style.clip) {
      attrs['clip-path'] = this.ensureClipPath(style.clip)
    }

    // Border radius (handled in renderRect, but also add to attrs for consistency)
    if (style.borderRadius !== undefined || style.borderRadiusX !== undefined) {
      attrs.rx = style.borderRadiusX ?? style.borderRadius
    }
    if (style.borderRadius !== undefined || style.borderRadiusY !== undefined) {
      attrs.ry = style.borderRadiusY ?? style.borderRadius
    }

    return attrs
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────────

  private getTarget(): SVGBuilder {
    // Priority: currentGroup > currentLayer > draw
    if (this.currentGroup) {
      return this.currentGroup
    }

    return this.layerStack.current() ?? this.sceneRoot
  }

  private applyOptions(el: SVGElement, options?: RenderOptions): SVGElement {
    if (!options) return el

    if (options.className) {
      el.addClass(options.className)
    }

    if (options.id) {
      el.id(options.id)
    }

    if (options.attributes) {
      el.attr(options.attributes)
    }

    if (options.animate) {
      const list = Array.isArray(options.animate) ? options.animate : [options.animate]
      for (const spec of list) el.animate(spec)
    }

    return el
  }

  private getStyle(options?: RenderOptions): RenderStyle {
    return mergeStyles(this.defaultStyle, options?.style)
  }

  /**
   * What the CALLER wrote, with no defaults underneath — the question
   * {@link getStyle} cannot answer, since it merges {@link DEFAULT_STYLE}
   * in and an unset key comes back with the default's value rather than
   * `undefined`. Use it where "asked for" and "currently is" differ.
   */
  private ownStyle(options?: RenderOptions): Partial<RenderStyle> {
    return Object.assign({}, ...styleList(options?.style))
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Primitive Rendering
  // ─────────────────────────────────────────────────────────────────────────────

  renderPoint(p: Point, options?: RenderOptions): SVGElement {
    const style = this.getStyle(options)
    const radius = pointMarkerRadius(style.strokeWidth)

    const el = this.getTarget()
      .circle(radius * 2)
      .attr({
        cx: p.x,
        cy: p.y,
        fill: style.stroke ?? '#000',
        'fill-opacity': style.strokeOpacity ?? 1,
      })

    return this.applyOptions(el, options)
  }

  renderLine(line: Line, options?: RenderOptions): SVGElement {
    // Double lines go through the shared path pipeline
    const style = this.getStyle(options)
    if (style.doubleLine) {
      return this.renderPathData(
        `M ${line.start.x} ${line.start.y} L ${line.end.x} ${line.end.y}`,
        options
      )
    }

    const attrs = this.resolveStyleAttributes(style)
    const el = this.getTarget()
      .line(line.start.x, line.start.y, line.end.x, line.end.y)
      .attr(attrs)

    return this.applyOptions(el, options)
  }

  renderCircle(circle: Circle, options?: RenderOptions): SVGElement {
    const style = this.getStyle(options)
    const attrs = this.resolveStyleAttributes(style)

    const el = this.getTarget()
      .circle(circle.radius * 2)
      .attr({
        ...attrs,
        cx: circle.center.x,
        cy: circle.center.y,
      })

    return this.applyOptions(el, options)
  }

  renderArc(arc: Arc, options?: RenderOptions): SVGElement {
    const style = this.getStyle(options)
    const attrs = this.resolveStyleAttributes(style)

    const el = this.getTarget()
      .path(arc.toSVGPath())
      .attr(attrs)

    return this.applyOptions(el, options)
  }

  renderEllipse(ellipse: Ellipse, options?: RenderOptions): SVGElement {
    const style = this.getStyle(options)
    const attrs = this.resolveStyleAttributes(style)

    // Native <ellipse> only when axis-aligned; SVG has no rotated
    // ellipse element, so rotated ones go through the path pipeline.
    if (ellipse.rotation % 360 !== 0) {
      return this.renderPathData(ellipse.toSVGPath(), options)
    }

    const el = this.getTarget()
      .ellipse(ellipse.a * 2, ellipse.b * 2)
      .attr({
        ...attrs,
        cx: ellipse.center.x,
        cy: ellipse.center.y,
      })

    return this.applyOptions(el, options)
  }

  /**
   * Generic fallback for any geometry {@link Shape} without a dedicated
   * render method (Triangle, Parabola, Hyperbola, Plot, complex shapes):
   * rendered through its toSVGPath() outline.
   */
  renderShape(shape: Shape, options?: RenderOptions): SVGElement {
    return this.renderPathData(shape.toSVGPath(), options)
  }

  /**
   * Render a {@link Plot}: the line/curve through its points plus, when
   * `marks` is set, a scatter marker at each (or every Nth) point.
   * Marks inherit the plot's resolved stroke color — open marks stroke
   * it, `*Filled` marks fill with it.
   */
  renderPlot(plot: Plot, options?: RenderOptions): SVGElement {
    const el = this.renderPathData(plot.toSVGPath(), options)

    const marks = plot.marks
    if (!marks || marks.name === 'none') return el

    const markPath = plotMarkPath(marks.name, marks.size ?? 5)
    if (!markPath) return el

    const style = this.getStyle(options)
    const color = style.stroke ?? '#000'
    const every = Math.max(1, marks.every ?? 1)
    const markAttrs = plotMarkFilled(marks.name)
      ? { fill: color, stroke: 'none' }
      : { fill: 'none', stroke: color, 'stroke-width': 1.5 }

    const target = this.getTarget()
    for (let i = 0; i < plot.points.length; i += every) {
      const p = plot.points[i]!
      target.path(markPath).attr({ ...markAttrs, transform: `translate(${p.x} ${p.y})` })
    }

    return el
  }

  renderRect(rect: Rectangle, options?: RenderOptions): SVGElement {
    const style = this.getStyle(options)
    const attrs = this.resolveStyleAttributes(style)

    const el = this.getTarget()
      .rect(rect.width, rect.height)
      .attr({
        ...attrs,
        x: rect.x,
        y: rect.y,
      })

    return this.applyOptions(el, options)
  }

  renderPolygon(polygon: Polygon, options?: RenderOptions): SVGElement {
    const style = this.getStyle(options)
    const attrs = this.resolveStyleAttributes(style)

    const el = this.getTarget()
      .path(polygon.toSVGPath())
      .attr(attrs)

    return this.applyOptions(el, options)
  }

  renderPath(path: Path, options?: RenderOptions): SVGElement {
    return this.renderPathData(path.toSVGPath(), options)
  }

  /**
   * Render a {@link MarkedPath}: the base path with the caller's style,
   * then each mark as its own element — placed at its position, rotated
   * to the tangent, painted in the path's stroke color (the arrowhead
   * convention). Arrow-tip artwork is drawn in a 10×10 box with the tip
   * pointing +x and (refX, 5) on the path, so the transform mirrors
   * SVG's `orient=auto` marker placement.
   */
  renderMarkedPath(mp: MarkedPath, options?: RenderOptions): SVGElement {
    const el = this.renderPathData(mp.path.toSVGPath(), options)
    if (mp.marks.length === 0) return el

    const style = this.getStyle(options)
    const color = style.stroke ?? '#000'
    const target = this.getTarget()

    for (const m of mp.marks) {
      const paint = m.filled
        ? { fill: color, stroke: 'none' }
        : { fill: 'none', stroke: color, 'stroke-width': m.strokeWidth ?? 1.5 }
      const transform =
        `translate(${m.point.x} ${m.point.y}) rotate(${m.angle})` +
        (m.scale !== 1 ? ` scale(${m.scale})` : '') +
        ` translate(${-m.refX} ${-m.refY})`
      target.path(m.d).attr({ ...paint, transform })
    }

    return el
  }

  /**
   * Render a {@link TextPath}: the guide path is defined once in
   * `<defs>` (never painted) and the text rides it via `<textPath>`.
   * Text color follows the text convention — the resolved stroke —
   * unless the TextPath carries its own `color`.
   */
  renderTextPath(tp: TextPath, options?: RenderOptions): SVGElement {
    const style = this.getStyle(options)
    const o = tp.options

    const id = `jikz-textpath-${this.textPathCounter++}`
    this.defsManager.ensure(id, (defs) => {
      defs.el('path', { id, d: tp.toSVGPath() })
    })

    const anchor = o.anchor
    const startOffset =
      o.startOffset ?? (anchor === 'middle' ? 0.5 : anchor === 'end' ? 1 : 0)

    const textAttrs: Record<string, unknown> = {
      'font-family': o.fontFamily ?? 'sans-serif',
      'font-size': o.fontSize ?? 14,
      'font-weight': o.fontWeight ?? 'normal',
      fill: o.color ?? style.stroke ?? '#000',
    }
    if (o.letterSpacing !== undefined) {
      textAttrs['letter-spacing'] = o.letterSpacing
    }

    const textEl = this.getTarget().el('text', textAttrs)
    const tpAttrs: Record<string, unknown> = {
      href: `#${id}`,
      startOffset: `${startOffset * 100}%`,
    }
    if (anchor) tpAttrs['text-anchor'] = anchor
    textEl.el('textPath', tpAttrs).node.text = tp.text

    return this.applyOptions(textEl, options)
  }

  /**
   * Shared pipeline for anything emitted as path data: double-line
   * expansion, style resolution, target/layer routing. Used by
   * renderPath, renderShape, rotated-ellipse, and double renderLine.
   */
  private renderPathData(pathData: string, options?: RenderOptions): SVGElement {
    const style = this.getStyle(options)
    const attrs = this.resolveStyleAttributes(style)

    // Handle double line
    if (style.doubleLine) {
      const spec: DoubleLineSpec = typeof style.doubleLine === 'boolean' ? {} : style.doubleLine
      const spacing = spec.spacing ?? 3
      const innerColor = spec.innerColor ?? 'white'
      const strokeWidth = style.strokeWidth ?? 1

      const g = this.getTarget().group()

      // Outer (thicker) path
      g.path(pathData)
        .attr({
          ...attrs,
          'stroke-width': strokeWidth + spacing,
        })

      // Inner path (creates the gap)
      g.path(pathData)
        .attr({
          stroke: innerColor,
          'stroke-width': spacing - strokeWidth,
          'stroke-linecap': attrs['stroke-linecap'] ?? 'round',
          fill: 'none',
        })

      return this.applyOptions(g, options)
    }

    const el = this.getTarget()
      .path(pathData)
      .attr(attrs)

    return this.applyOptions(el, options)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Node System Rendering
  // ─────────────────────────────────────────────────────────────────────────────

  renderNode(node: Node, options?: RenderOptions): SVGElement {
    const style = this.getStyle(options)
    const attrs = this.resolveStyleAttributes(style)

    const g = this.getTarget().group()

    // Render shape
    g.path(node.toSVGPath()).attr(attrs)

    // Render text if present. On rotated nodes the text goes into a
    // subgroup carrying the rotation transform (the shape outline is
    // already rotated in absolute coordinates via toSVGPath, so it
    // must stay OUTSIDE this subgroup).
    if (node.text) {
      const textOpts = options?.textStyle ?? {}
      const textStyleAttrs = {
        'font-family': textOpts.fontFamily ?? 'sans-serif',
        'font-size': textOpts.fontSize ?? 14,
        'font-weight': textOpts.fontWeight ?? 'normal',
        fill: textOpts.fill ?? style.stroke ?? '#000',
      }

      const textTarget =
        node.rotate !== 0 && node.rotateText
          ? g.group().attr({
              transform: `rotate(${node.rotate} ${node.center.x} ${node.center.y})`,
            })
          : g

      // Check if text looks like LaTeX (contains $ or \)
      if (this.isLaTeX(node.text)) {
        this.renderLaTeX(node.text, node.center, textTarget)
      } else {
        textTarget.text(node.text)
          .center(node.center.x, node.center.y)
          .font(textStyleAttrs)
      }
    }

    return this.applyOptions(g, options)
  }

  renderEdge(edge: Edge, options?: RenderOptions): SVGElement {
    const style = this.getStyle(options)
    const attrs = this.resolveStyleAttributes(style)

    const g = this.getTarget().group()

    // Add marker references. Arrowheads take the edge's stroke color:
    // SVG marker paint cannot inherit it, so ensureMarker defines a
    // per-color variant and we reference that.
    const markerColor = style.stroke ?? '#000000'
    const pathAttrs: Record<string, unknown> = { ...attrs }

    if (edge.arrowEnd !== 'none') {
      const marker = this.ensureMarker(edge.arrowEnd, markerColor)
      if (marker) {
        pathAttrs['marker-end'] = marker
      }
    }

    if (edge.arrowStart !== 'none') {
      const marker = this.ensureMarker(edge.arrowStart, markerColor, 'start')
      if (marker) {
        pathAttrs['marker-start'] = marker
      }
    }

    // Render path
    g.path(edge.toSVGPath()).attr(pathAttrs)

    // Render label if present
    if (edge.label) {
      const labelPoint = edge.labelPoint

      if (this.isLaTeX(edge.label)) {
        this.renderLaTeX(edge.label, labelPoint, g)
      } else {
        // An edge's label is its own text, so it answers to `textStyle`
        // exactly as a node's does — and not to `style.fill`, which on
        // an edge already paints the path (a filled lens under a bend).
        // Behind it, the label follows the pen.
        const textOpts = options?.textStyle ?? {}
        const font: Record<string, unknown> = {
          'font-family': textOpts.fontFamily ?? 'sans-serif',
          'font-size': textOpts.fontSize ?? 12,
          'text-anchor': 'middle',
          'dominant-baseline': 'middle',
          fill: textOpts.fill ?? style.stroke ?? '#000',
        }
        // Only when asked: `normal` is the SVG default, and emitting it
        // would add a redundant attribute to every edge label ever drawn.
        if (textOpts.fontWeight !== undefined) font['font-weight'] = textOpts.fontWeight
        g.text(edge.label).center(labelPoint.x, labelPoint.y).font(font)
      }
    }

    return this.applyOptions(g, options)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Text Rendering
  // ─────────────────────────────────────────────────────────────────────────────

  renderText(text: string, position: Point, options?: TextOptions): SVGElement {
    const style = this.getStyle(options)

    // Check if it's LaTeX
    if (this.isLaTeX(text)) {
      return this.renderLaTeX(text, position, this.getTarget(), options)
    }

    const el = this.getTarget()
      .text(text)
      .move(position.x, position.y)
      .font({
        'font-family': options?.fontFamily ?? 'sans-serif',
        'font-size': options?.fontSize ?? 14,
        'font-weight': options?.fontWeight ?? 'normal',
        // Glyphs are painted with `fill`, but only an EXPLICIT one: the
        // merged style carries DEFAULT_STYLE's `fill: 'none'`, which
        // would render every unstyled label invisible. Absent that, text
        // follows the pen, as it does in TikZ.
        fill: this.ownStyle(options).fill ?? style.stroke ?? '#000',
      })
      .attr({
        'text-anchor': options?.textAnchor ?? 'start',
        'dominant-baseline': options?.dominantBaseline ?? 'auto',
      })

    return this.applyOptions(el, options)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // LaTeX/KaTeX Rendering
  // ─────────────────────────────────────────────────────────────────────────────

  private isLaTeX(text: string): boolean {
    return isLaTeX(text)
  }

  private extractLaTeX(text: string): { tex: string; displayMode: boolean } {
    return extractLaTeX(text)
  }

  /**
   * Render LaTeX using KaTeX.
   *
   * KaTeX renders to an HTML string, which we embed verbatim inside a
   * `<foreignObject>` via the builder's `.raw()` — no DOM APIs involved,
   * so this works in Node exactly as in the browser. `mount()` parses
   * the raw fragment into XHTML; inline-SVG consumers parse it as HTML.
   * (Strict standalone-.svg XML parsers may reject unescaped HTML
   * entities in KaTeX output — a known foreignObject limitation.)
   *
   * Falls back to plain italic text when KaTeX isn't loaded or the
   * expression fails to parse.
   */
  renderLaTeX(
    text: string,
    position: Point,
    target?: SVGBuilder,
    options?: TextOptions
  ): SVGElement {
    const container = target ?? this.getTarget()
    const { tex, displayMode } = this.extractLaTeX(text)
    const mathRenderer = resolveMathRenderer(this.mathRenderer)

    if (mathRenderer) {
      let html: string | undefined
      try {
        html = mathRenderer.renderToString(tex, {
          displayMode,
          throwOnError: false,
          errorColor: '#cc0000',
        })
      } catch (e) {
        console.warn('KaTeX rendering failed:', e)
      }

      if (html !== undefined) {
        // Size the box from the measured formula when the math renderer
        // supports it (browser); otherwise keep the generous default —
        // overflow:visible keeps long formulas unclipped either way.
        const measured = mathRenderer.measure?.(tex, {
          displayMode,
          fontSize: options?.fontSize,
        })
        const w = Math.ceil(measured?.width ?? 200)
        const h = Math.ceil(measured?.height ?? 50)
        const fo = container.foreignObject(w, h)
        fo.attr({
          x: position.x - w / 2, // Center horizontally
          y: position.y - h / 2, // Center vertically
          overflow: 'visible',
        })
        // white-space:nowrap is essential: KaTeX emits MULTIPLE `.base`
        // spans (e.g. for `A \\cap B`), and katex.css applies nowrap only
        // per `.base` — without a container-level nowrap the second base
        // can wrap under the first whenever the measured box is even 1px
        // narrow (e.g. when measure() ran before KaTeX's web fonts
        // loaded). With nowrap, an undersized box simply overflows
        // symmetrically (justify-content:center + overflow:visible) and
        // the formula stays centered on the intended point.
        fo.raw(
          `<div xmlns="http://www.w3.org/1999/xhtml" style="display:flex;` +
          `justify-content:center;align-items:center;width:100%;height:100%;` +
          `white-space:nowrap;font-size:${options?.fontSize ?? 14}px">${html}</div>`
        )
        return this.applyOptions(fo, options)
      }
    }

    // Fallback: render as plain text with $ markers
    const el = container
      .text(text)
      .center(position.x, position.y)
      .font({
        'font-family': options?.fontFamily ?? 'serif',
        'font-size': options?.fontSize ?? 14,
        'font-style': 'italic',
        fill: '#000',
      })

    return this.applyOptions(el, options)
  }

  /**
   * Render LaTeX label at a position
   */
  renderMath(tex: string, position: Point, options?: KaTeXOptions & TextOptions): SVGElement {
    const displayMode = options?.displayMode ?? false
    const wrapped = displayMode ? `$$${tex}$$` : `$${tex}$`
    return this.renderLaTeX(wrapped, position, undefined, options)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Grouping
  // ─────────────────────────────────────────────────────────────────────────────

  group(options?: GroupOptions): SVGBuilder {
    const g = this.getTarget().group()

    if (options?.id) {
      g.id(options.id)
    }

    if (options?.className) {
      g.addClass(options.className)
    }

    if (options?.transform) {
      g.attr({ transform: options.transform })
    }

    return g
  }

  setGroup(group: SVGBuilder): void {
    this.currentGroup = group
  }

  /**
   * Open a `<g>` for a {@link Scope} and make it the target for
   * everything drawn until the matching {@link endGroup}.
   *
   * Geometry inside a scope stays in the scope's own coordinates — the
   * transform rides on the group, so strokes and arrow tips scale with
   * it, matching the picture-level canvas transform.
   */
  beginGroup(options: GroupRenderOptions): SVGBuilder {
    const g = this.getTarget().group()

    if (options.transform) g.attr({ transform: options.transform.toSVGMatrix() })
    if (options.opacity !== undefined) g.attr({ opacity: options.opacity })
    if (options.className) g.addClass(options.className)
    if (options.id) g.id(options.id)
    if (options.clip) g.attr({ 'clip-path': this.ensureClipPath(options.clip) })

    this.groupStack.push(this.currentGroup)
    this.currentGroup = g
    return g
  }

  /** Close the most recent {@link beginGroup}. */
  endGroup(): void {
    if (this.groupStack.length === 0) {
      throw new Error('SVGRenderer.endGroup: no group is open')
    }
    this.currentGroup = this.groupStack.pop() ?? null
  }

  clearGroup(): void {
    this.currentGroup = null
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────────────────────────

  render(obj: Renderable, options?: RenderOptions): SVGElement {
    // Rotated reports its BASE shape's `type` so shape-set lookups stay
    // transparent — which would route a rotated rectangle to the
    // axis-aligned <rect> path. Claim it first: its toSVGPath() already
    // carries the rotation.
    if (obj instanceof Rotated) {
      return this.renderShape(obj, options)
    }
    if (isPoint(obj)) {
      return this.renderPoint(obj, options)
    }
    if (isPath(obj)) {
      return this.renderPath(obj, options)
    }
    if (isLine(obj)) {
      return this.renderLine(obj, options)
    }
    if (isArc(obj)) {
      return this.renderArc(obj, options)
    }
    if (isEllipse(obj)) {
      return this.renderEllipse(obj, options)
    }
    if (isCircle(obj)) {
      return this.renderCircle(obj, options)
    }
    if (isRectangle(obj)) {
      return this.renderRect(obj, options)
    }
    if (isPolygon(obj)) {
      return this.renderPolygon(obj, options)
    }
    if (obj instanceof Plot) {
      return this.renderPlot(obj, options)
    }
    if (obj instanceof MarkedPath) {
      return this.renderMarkedPath(obj, options)
    }
    if (obj instanceof TextPath) {
      return this.renderTextPath(obj, options)
    }
    if (isNode(obj)) {
      return this.renderNode(obj, options)
    }
    if (isEdge(obj)) {
      return this.renderEdge(obj, options)
    }
    if (isShapeLike(obj)) {
      return this.renderShape(obj, options)
    }

    throw new Error(`Unknown renderable type: ${obj}`)
  }

  /**
   * Render a {@link Picture} — delegates to `pic.renderWith(this)`,
   * which iterates the picture's items in insertion order (paint order)
   * and dispatches each to the appropriate renderX method. Bare
   * renderables carry a TikZ-style {@link PathMode} baseline merged
   * under the caller's own `options.style`.
   */
  renderPicture(pic: { renderWith(renderer: PictureRenderer): unknown }): void {
    pic.renderWith(this)
  }

  clear(): void {
    this.draw.clear()
    this.defsManager.clear()
    this.clipPathCounter = 0
    this.textPathCounter = 0
    this.layerStack.clear()
    this.currentGroup = null
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Layer Management
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Define layers in order (bottom to top)
   * Earlier layers appear behind later layers in the SVG
   */
  defineLayers(layerNames: LayerName[], defaultLayer?: LayerName): void {
    this.layerStack.define(layerNames, defaultLayer)
  }

  /**
   * Set the current layer for subsequent renders
   */
  setLayer(name: LayerName): void {
    this.layerStack.set(name)
  }

  /**
   * Get a layer's container by name
   */
  getLayer(name: LayerName): SVGBuilder | undefined {
    return this.layerStack.get(name)
  }

  /**
   * Reset to the default layer
   */
  resetLayer(): void {
    this.layerStack.reset()
  }

  /**
   * Execute callback on a specific layer, then restore previous layer
   */
  onLayer<T>(name: LayerName, callback: () => T): T {
    return this.layerStack.onLayer(name, callback)
  }

  /**
   * Get the current layer name
   */
  getCurrentLayer(): LayerName {
    return this.layerStack.currentLayerName
  }

  /**
   * Get all layer names in order
   */
  getLayers(): LayerName[] {
    return this.layerStack.names()
  }

  getContext(): SVGBuilder {
    return this.draw
  }

  /**
   * Get the default style
   */
  getDefaultStyle(): RenderStyle {
    return { ...this.defaultStyle }
  }

  /**
   * Set the default style
   */
  setDefaultStyle(style: Partial<RenderStyle>): void {
    this.defaultStyle = mergeStyles(this.defaultStyle, style)
  }
}

/**
 * Create an SVG renderer
 */
export function createSVGRenderer(
  draw: SVGBuilder,
  defaultStyle?: Partial<RenderStyle>
): SVGRenderer {
  return new SVGRenderer(draw, defaultStyle)
}
