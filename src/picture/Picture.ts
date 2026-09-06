import { Point, point } from '../core/Point'
import type { PointLike } from '../core/types'
import { Transform } from '../core/Transform'
import { type Anchorable } from '../core/Anchor'
import { estimateLabelSize } from '../text/placeText'
import {
  DEFAULT_LABEL_FONT_SIZE,
  Node,
  type NodeLabel,
  type NodeOptions,
  type ShapeSpec,
} from '../node/Node'
import { Edge, type EdgeOptions } from '../node/Edge'
import { Pen, type PenOptions } from './Pen'
import type { Renderable, RenderOptions, TextOptions } from '../render/Renderer'
import { mergeStyles, type RenderStyle } from '../render/StyleMapper'
import { SVGRenderer } from '../render/SVGRenderer'
import type { ViewBoxSpec } from '../render/SVGBuilder'
import { placeText, type TextPlacement } from '../text/placeText'

/**
 * Options for {@link Picture.text}: renderer {@link TextOptions} plus
 * TikZ-style placement relative to the reference point —
 * `pic.text(p, 'h', { at: 'north east', distance: 6 })` is
 * `\node[above right] at (p) {h}`. Placement keys are consumed by
 * Picture and never reach the renderer.
 */
export interface PictureTextOptions extends TextOptions, TextPlacement {}

/**
 * Viewport for `toSVG`/`mount`. Pass `{ width, height }` for a fixed
 * `0 0 w h` viewBox, or `{ fit: true }` for TikZ's auto-sizing: the
 * viewBox is computed from the content bounds, so pictures never need
 * a hand-computed size or a centering {@link Transform}.
 */
export interface PictureViewBox {
  /** Explicit viewport size; ignored when `fit` is set. */
  width?: number
  height?: number
  /**
   * Compute the viewBox from content bounds. Text boxes are
   * font-metric estimates and strokes/markers extend past geometry
   * bounds — `padding` covers both.
   */
  fit?: boolean
  /** Padding around the content when `fit` is set, px. Default: 4. */
  padding?: number
}

/**
 * Label spec for the draw verbs: the shared {@link NodeLabel}
 * vocabulary (anchor placement via `at`/`distance`/`frame`) plus
 * PATH-RELATIVE placement — `{ pos: 0.5, offset: 8 }` is TikZ's
 * `node[midway, above]`: the label sits on the shape at parameter
 * `pos` ∈ [0,1], pushed `offset` px to the LEFT of the travel
 * direction (matching Edge's labelPos/labelOffset; negative flips
 * sides, and arcs travel in their sweep direction). Requires a
 * t-parameterized renderable (Line, Arc, Path); Circle's pointAt is
 * angle-based — use `{ at: <angle> }` there instead.
 */
export type { DrawLabel } from '../text/shapeLabels'
import { shapeLabelPoint, type DrawLabel } from '../text/shapeLabels'

/**
 * Options for the draw verbs (`draw`/`fill`/`filldraw`/`path`):
 * renderer {@link RenderOptions} plus TikZ-style shape labels —
 * `pic.draw(l, { label: { text: 'x', at: 'east' } })` is
 * `\draw … node[right]{x}`. Labels are desugared into text items at
 * call time (like node labels), so every backend supports them for
 * free; the keys never reach the renderer.
 */
export interface DrawOptions extends RenderOptions {
  /** Single-label shorthand: a plain string or a full {@link DrawLabel}. */
  label?: string | DrawLabel
  /** Multiple labels — TikZ allows several nodes per path statement. */
  labels?: readonly DrawLabel[]
}

/**
 * An endpoint in {@link Picture.edge} can be:
 *   - a string spec like `"A"` or `"A.north"` / `"A.45"` (resolved against
 *     the picture's named-node and coordinate registries),
 *   - a raw {@link PointLike},
 *   - an {@link Anchorable} instance (a Node or any object with anchors).
 */
export type PictureEndpoint = string | PointLike | Anchorable

/**
 * Options for a {@link Picture}.
 */
export interface PictureOptions {
  /**
   * Canvas-level transform applied to the entire scene at render time
   * (TikZ canvas transformation). All geometry — coordinates, anchors,
   * edge endpoints — stays in user space; the SVG backend wraps the
   * scene in a `<g transform>`, so strokes and markers scale too.
   */
  transform?: Transform
  /**
   * Uniform canvas scale — convenience for
   * `transform: Transform.scaling(s)`. Composes with `transform`
   * (applied after it) when both are given.
   */
  scale?: number
}

/**
 * TikZ-style path mode. Controls whether a bare renderable is stroked,
 * filled, both, or neither when the picture compiles.
 *
 *   - `path`     → `\path`     — invisible unless the caller overrides style.
 *   - `draw`     → `\draw`     — stroked only (`\path[draw]`).
 *   - `fill`     → `\fill`     — filled only (`\path[fill]`).
 *   - `filldraw` → `\filldraw` — stroked and filled.
 */
export type PathMode = 'path' | 'draw' | 'fill' | 'filldraw'

/**
 * TikZ-faithful baseline styles per path mode. The caller's own style
 * overrides these where they overlap — see {@link mergePathMode}.
 */
export const PATH_MODE_STYLE: Record<PathMode, Partial<RenderStyle>> = {
  path: { stroke: 'none', fill: 'none' },
  draw: { stroke: '#000000', fill: 'none' },
  fill: { stroke: 'none', fill: '#000000' },
  filldraw: { stroke: '#000000', fill: '#000000' },
}

/**
 * Fold a {@link PathMode} baseline into caller-supplied render options.
 * Mode attributes act as defaults; anything the caller set explicitly
 * in `options.style` wins.
 */
export function mergePathMode(
  mode: PathMode,
  options: RenderOptions | undefined
): RenderOptions {
  const base = PATH_MODE_STYLE[mode]
  return {
    ...options,
    // mergeStyles handles the array form of style; mode attrs act as
    // defaults, caller entries win (including array order semantics).
    style: mergeStyles(base, options?.style),
  }
}

/**
 * The minimal renderer surface {@link Picture.renderWith} needs.
 * `SVGRenderer` satisfies it; alternate backends can implement these
 * four methods to compile pictures without touching SVG.
 */
export interface PictureRenderer {
  renderNode(node: Node, options?: RenderOptions): unknown
  renderEdge(edge: Edge, options?: RenderOptions): unknown
  render(obj: Renderable, options?: RenderOptions): unknown
  renderText(text: string, position: Point, options?: TextOptions): unknown
}

/**
 * Items stored in the picture in the order they were added. `SVGRenderer.
 * renderPicture` iterates this list — insertion order is paint order.
 */
export type PictureItem =
  | { kind: 'node'; node: Node; name: string; options?: RenderOptions }
  | { kind: 'edge'; edge: Edge; options?: RenderOptions }
  | { kind: 'bare'; obj: Renderable; mode: PathMode; options?: RenderOptions }
  | { kind: 'text'; at: Point; text: string; options?: PictureTextOptions }
  | { kind: 'pen'; pen: Pen }

/**
 * A Picture is the TikZ-style scope: it owns named nodes, edges that
 * reference those nodes by name, and any bare geometry/paths that render
 * alongside. The named-node registry is what lets you write
 * `edge('A', 'B.north')` without threading JS variables through every
 * call site.
 *
 * Usage:
 *
 *     picture()
 *       .draw(circle(point(0, 0), 40))
 *       .node('A', { at: point(0, 0),   shape: 'circle',    text: 'A' })
 *       .node('B', { at: point(100, 0), shape: 'rectangle', text: 'B' })
 *       .edge('A', 'B.north', { label: 'x' })
 *       .toSVG({ width: 200, height: 80 })
 *
 * Endpoint resolution follows TikZ conventions:
 *   - Bare name (`"A"`): the edge treats A as an {@link Anchorable}, so
 *     the Edge layer auto-resolves the boundary point along the ray
 *     toward the other endpoint — identical to `edge(a, b)` with node
 *     variables.
 *   - Name with anchor (`"A.north"`, `"A.45"`, `"A.center"`): resolves
 *     immediately to a fixed point on node A.
 */
export class Picture {
  private readonly nodesByName = new Map<string, Node>()
  private readonly coordsByName = new Map<string, Point>()
  private readonly itemList: PictureItem[] = []
  private readonly options: PictureOptions

  constructor(options: PictureOptions = {}) {
    this.options = options
  }

  /**
   * The canvas transform for the SVG backend, or undefined when the
   * scene renders untransformed.
   */
  private canvasTransform(): Transform | undefined {
    const { transform, scale } = this.options
    if (transform && scale !== undefined) return transform.scale(scale)
    if (scale !== undefined) return Transform.scaling(scale)
    return transform
  }

  /**
   * Add a named node to the picture. Throws on duplicate name.
   * Any `name` in the supplied options is ignored — the registry name
   * is authoritative.
   */
  node<S extends ShapeSpec = ShapeSpec>(
    name: string,
    options: Omit<NodeOptions<S>, 'name'> = {},
    renderOptions?: RenderOptions
  ): this {
    if (this.nodesByName.has(name) || this.coordsByName.has(name)) {
      throw new Error(
        `Picture: node name "${name}" already exists in this picture.`
      )
    }
    const n = new Node({ ...options, name })
    this.nodesByName.set(name, n)
    this.itemList.push({ kind: 'node', node: n, name, options: renderOptions })

    // Desugar TikZ-style labels into bare text items, painted right
    // after their node. They flow through the PictureRenderer.renderText
    // seam, so every backend supports labels (and KaTeX) for free.
    // Placement is resolved once, here — labels don't track later
    // mutations of the node.
    for (const label of n.labels) {
      this.itemList.push({
        kind: 'text',
        at: n.labelPoint(label),
        text: label.text,
        options: { fontSize: DEFAULT_LABEL_FONT_SIZE, ...label.options },
      })
    }
    return this
  }

  /**
   * Add an edge. Endpoints may be string specs, raw points, or any
   * Anchorable instance. Unknown names throw with a helpful message.
   */
  edge(
    from: PictureEndpoint,
    to: PictureEndpoint,
    options: EdgeOptions = {},
    renderOptions?: RenderOptions
  ): this {
    const fromEnd = this.resolveEndpoint(from)
    const toEnd = this.resolveEndpoint(to)
    const e = new Edge(fromEnd, toEnd, options)
    this.itemList.push({ kind: 'edge', edge: e, options: renderOptions })
    return this
  }

  /**
   * Shared body of the draw verbs: store the bare renderable, then
   * desugar any labels into text items painted right after it — like
   * node labels, resolved once at call time (labels don't track later
   * mutations of the shape).
   */
  private bare(obj: Renderable, mode: PathMode, options?: DrawOptions): this {
    const { label, labels, ...renderOptions } = options ?? {}
    this.itemList.push({
      kind: 'bare',
      obj,
      mode,
      options: options ? renderOptions : undefined,
    })
    const allLabels: DrawLabel[] = [
      ...(typeof label === 'string' ? [{ text: label }] : label ? [label] : []),
      ...(labels ?? []),
    ]
    for (const l of allLabels) {
      this.itemList.push({
        kind: 'text',
        at: shapeLabelPoint(obj, l),
        text: l.text,
        options: { fontSize: DEFAULT_LABEL_FONT_SIZE, ...l.options },
      })
    }
    return this
  }

  /**
   * Name a point (TikZ `\coordinate (A) at (x,y);`). Coordinates are
   * invisible — they paint nothing — but resolve everywhere a node
   * name does: `edge('A', 'B')`, `resolve('A')`, pen verbs
   * (`lineTo('A')`). Anchor specs on a coordinate (`'A.north'`)
   * resolve to the point itself, like a zero-size node.
   * Throws on duplicate name (against nodes and coordinates alike).
   */
  coordinate(name: string, at: PointLike): this {
    if (this.nodesByName.has(name) || this.coordsByName.has(name)) {
      throw new Error(
        `Picture: name "${name}" already exists in this picture.`
      )
    }
    this.coordsByName.set(name, point(at.x, at.y))
    return this
  }

  /**
   * Start a fluent TikZ path statement (see {@link Pen}) —
   * `\draw (a) -- (b) node[right]{x} -- cycle` as a chain:
   *
   * ```ts
   * pic.pen({ style: { stroke: '#0f172a' } })
   *   .moveTo(40, 170).label('A', { at: 'south west' })
   *   .lineTo(300, 170).label('c', { pos: 0.5, offset: -10 })
   *   .lineTo(300, 90).label('C', { at: 'north east' })
   *   .close()
   * ```
   *
   * The pen registers immediately and expands at render time, so it
   * interleaves correctly with other picture calls.
   */
  pen(options?: PenOptions): Pen {
    const p = new Pen(options, this)
    this.itemList.push({ kind: 'pen', pen: p })
    return p
  }

  /**
   * `\path` — append a renderable with no style flags. Invisible unless
   * the caller overrides stroke or fill through `options.style`. Useful
   * for clip regions, hit areas, or hanging decorations off an
   * otherwise-invisible path.
   */
  path(obj: Renderable, options?: DrawOptions): this {
    return this.bare(obj, 'path', options)
  }

  /**
   * `\draw` — append stroked, no fill. Equivalent to `\path[draw]` in
   * TikZ. The workhorse verb for lines, outlines, and bare geometry.
   * `{ label: { text, at } }` hangs a TikZ-style label on the shape's
   * anchor — `\draw … node[right]{…}`.
   */
  draw(obj: Renderable, options?: DrawOptions): this {
    return this.bare(obj, 'draw', options)
  }

  /**
   * `\fill` — append filled, no stroke. Equivalent to `\path[fill]`.
   */
  fill(obj: Renderable, options?: DrawOptions): this {
    return this.bare(obj, 'fill', options)
  }

  /**
   * `\filldraw` — append stroked and filled. Equivalent to
   * `\path[draw, fill]`.
   */
  filldraw(obj: Renderable, options?: DrawOptions): this {
    return this.bare(obj, 'filldraw', options)
  }

  /**
   * Bare text at a position — the `\node at (x,y) {text}` shorthand
   * without a shape. Text is centered on `at` by default; pass
   * `options.at`/`options.distance` for TikZ-style directional
   * placement (`{ at: 'south east', distance: 4 }` = `node[below right]`),
   * and override alignment/font via the other {@link TextOptions}.
   * Strings that look like LaTeX (`$...$`) go through KaTeX when it's
   * loaded.
   */
  text(at: PointLike, text: string, options?: PictureTextOptions): this {
    this.itemList.push({ kind: 'text', at: point(at.x, at.y), text, options })
    return this
  }

  /**
   * Compile this picture through any renderer implementing
   * {@link PictureRenderer}. Iterates items in insertion order (which
   * is paint order); bare renderables carry their TikZ-style
   * {@link PathMode} baseline merged under the caller's style.
   *
   * This is the backend-decoupling seam: `toSVG()`/`mount()` are thin
   * conveniences that call `renderWith(new SVGRenderer())`.
   */
  renderWith(renderer: PictureRenderer): this {
    for (const item of this.itemList) {
      this.renderItem(renderer, item)
    }
    return this
  }

  private renderItem(renderer: PictureRenderer, item: PictureItem): void {
    if (item.kind === 'node') {
      renderer.renderNode(item.node, item.options)
    } else if (item.kind === 'edge') {
      renderer.renderEdge(item.edge, item.options)
    } else if (item.kind === 'bare') {
      renderer.render(item.obj, mergePathMode(item.mode, item.options))
    } else if (item.kind === 'pen') {
      // A pen statement expands to its path + labels, in place.
      for (const sub of item.pen.items()) this.renderItem(renderer, sub)
    } else if (item.kind === 'text') {
        // Picture.text is TikZ's `\node at (x,y) {text}` — centered on
        // the point unless placed directionally (options.at/distance)
        // or the caller overrides alignment. Placement is computed here
        // so every backend gets it for free.
        const { at: _place, distance: _dist, ...styleOpts } = item.options ?? {}
        const textOpts: TextOptions = {
          textAnchor: 'middle',
          dominantBaseline: 'middle',
          ...styleOpts,
        }
        renderer.renderText(item.text, this.textCenter(item), textOpts)
      }
  }

  /**
   * Bounding box of everything in the picture, in user space
   * (undefined when empty). Text boxes are measured estimates (KaTeX
   * formulas measure as their raw source string); edge label boxes and
   * stroke widths are not included — pad in fit mode to cover them.
   */
  contentBounds(): [number, number, number, number] | undefined {
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    const grow = (b: readonly [number, number, number, number]) => {
      minX = Math.min(minX, b[0])
      minY = Math.min(minY, b[1])
      maxX = Math.max(maxX, b[2])
      maxY = Math.max(maxY, b[3])
    }
    for (const item of this.itemList) {
      this.growBounds(item, grow)
    }
    return minX === Infinity ? undefined : [minX, minY, maxX, maxY]
  }

  private growBounds(
    item: PictureItem,
    grow: (b: readonly [number, number, number, number]) => void
  ): void {
    if (item.kind === 'node') {
      grow(item.node.bounds)
    } else if (item.kind === 'edge') {
      // Control points can bulge past the endpoints on bent edges.
      const pts = [item.edge.from, item.edge.to, ...item.edge.controlPoints]
      for (const p of pts) grow([p.x, p.y, p.x, p.y])
    } else if (item.kind === 'bare') {
      if (item.obj instanceof Point) {
        grow([item.obj.x, item.obj.y, item.obj.x, item.obj.y])
      } else {
        grow((item.obj as { bounds: [number, number, number, number] }).bounds)
      }
    } else if (item.kind === 'pen') {
      for (const sub of item.pen.items()) this.growBounds(sub, grow)
    } else {
      const center = this.textCenter(item)
      const { width, height } = estimateLabelSize(item.text, {
        fontSize: item.options?.fontSize,
        fontFamily: item.options?.fontFamily,
      })
      grow([
        center.x - width / 2,
        center.y - height / 2,
        center.x + width / 2,
        center.y + height / 2,
      ])
    }
  }

  /** Resolved render point for a text item (placement-aware). */
  private textCenter(item: Extract<PictureItem, { kind: 'text' }>): Point {
    const o = item.options
    if (o?.at === undefined) return item.at
    return placeText(item.at, item.text, {
      at: o.at,
      distance: o.distance,
      fontSize: o.fontSize,
      fontFamily: o.fontFamily,
    })
  }

  private resolveViewBox(viewBox?: PictureViewBox): ViewBoxSpec | undefined {
    if (!viewBox) return undefined
    if (!viewBox.fit) {
      if (viewBox.width === undefined || viewBox.height === undefined) {
        throw new Error('Picture.toSVG/mount: pass { width, height } or { fit: true }.')
      }
      return { width: viewBox.width, height: viewBox.height }
    }
    const bounds = this.contentBounds()
    if (!bounds) {
      throw new Error('Picture: { fit: true } requires at least one item.')
    }
    const pad = viewBox.padding ?? 4
    let [minX, minY, maxX, maxY] = bounds
    const t = this.canvasTransform()
    if (t) {
      // The viewBox lives OUTSIDE the scene's transform group, so the
      // content bounds must be mapped through the canvas transform.
      const corners = [
        point(minX, minY),
        point(maxX, minY),
        point(minX, maxY),
        point(maxX, maxY),
      ].map((c) => t.apply(c))
      minX = Math.min(...corners.map((c) => c.x))
      minY = Math.min(...corners.map((c) => c.y))
      maxX = Math.max(...corners.map((c) => c.x))
      maxY = Math.max(...corners.map((c) => c.y))
    }
    return {
      x: minX - pad,
      y: minY - pad,
      width: maxX - minX + 2 * pad,
      height: maxY - minY + 2 * pad,
    }
  }

  /**
   * `\end{tikzpicture}` — compile the picture to an SVG string. Runs in
   * any environment (Node or browser) — no DOM required. Pass a
   * {@link PictureViewBox}: `{ width, height }` for a fixed viewport or
   * `{ fit: true }` to auto-size from content (TikZ's behavior).
   */
  toSVG(viewBox?: PictureViewBox): string {
    const renderer = new SVGRenderer(undefined, undefined, {
      transform: this.canvasTransform(),
    })
    this.renderWith(renderer)
    return renderer.toSVG(this.resolveViewBox(viewBox))
  }

  /**
   * `\end{tikzpicture}` into a live DOM container. Browser-only. Creates
   * real SVG elements via `document.createElementNS` and appends the
   * root `<svg>` to `container`.
   */
  mount(
    container: Element,
    viewBox?: PictureViewBox
  ): globalThis.SVGElement {
    const renderer = new SVGRenderer(undefined, undefined, {
      transform: this.canvasTransform(),
    })
    this.renderWith(renderer)
    return renderer.builder.mount(container, this.resolveViewBox(viewBox))
  }

  /**
   * Look up a node by name. Returns undefined if absent.
   */
  getNode(name: string): Node | undefined {
    return this.nodesByName.get(name)
  }

  /**
   * Resolve a string spec to a point.
   *
   * - `"A"` → `A.center`
   * - `"A.north"`, `"A.n"`, `"A.north east"` → `A.anchor(spec)`
   * - `"A.45"` → `A.anchor(45)` (numeric angle, screen convention:
   *   0° = east, clockwise positive — so 270 = north. See ANCHOR_ANGLES.)
   *
   * The separator is the *first* `.`. Node names therefore cannot
   * contain a `.`. Throws on unknown names.
   */
  resolve(spec: string): Point {
    const parsed = parseSpec(spec)
    const n = this.nodesByName.get(parsed.name)
    if (n) {
      if (parsed.anchor === undefined) return n.center
      return n.anchor(parsed.anchor)
    }
    const c = this.coordsByName.get(parsed.name)
    // A coordinate is a zero-size node: every anchor is the point.
    if (c) return c
    throw new Error(
      `Picture: unknown node "${parsed.name}" (known: ${this.knownNames()}).`
    )
  }

  /**
   * All registered node names.
   */
  get names(): readonly string[] {
    return Array.from(this.nodesByName.keys())
  }

  /**
   * All nodes in the registry (useful for layout passes or debugging).
   */
  get nodes(): ReadonlyMap<string, Node> {
    return this.nodesByName
  }

  /**
   * Items in insertion order. Consumed by `SVGRenderer.renderPicture`.
   */
  get items(): readonly PictureItem[] {
    return this.itemList
  }

  private resolveEndpoint(spec: PictureEndpoint): PointLike | Anchorable {
    if (typeof spec !== 'string') return spec
    const parsed = parseSpec(spec)
    const n = this.nodesByName.get(parsed.name)
    if (n) {
      // Bare name → keep the Anchorable, so Edge auto-resolves the
      // boundary point along the ray toward the other endpoint.
      if (parsed.anchor === undefined) return n
      // Explicit anchor → resolve now to a fixed point.
      return n.anchor(parsed.anchor)
    }
    const c = this.coordsByName.get(parsed.name)
    if (c) return c
    throw new Error(
      `Picture: unknown node "${parsed.name}" (known: ${this.knownNames()}).`
    )
  }

  private knownNames(): string {
    const names = [...this.nodesByName.keys(), ...this.coordsByName.keys()]
    return names.length === 0 ? '<none>' : names.map((n) => `"${n}"`).join(', ')
  }
}

/**
 * Parse a string spec like `"A"` or `"A.north"` or `"A.45"` into a name
 * and an optional anchor portion. The first `.` separates — node names
 * containing `.` are not supported.
 */
function parseSpec(spec: string): { name: string; anchor?: string } {
  const idx = spec.indexOf('.')
  if (idx < 0) return { name: spec }
  return { name: spec.slice(0, idx), anchor: spec.slice(idx + 1) }
}

/**
 * Create a new, empty picture. Accepts optional {@link PictureOptions}
 * (canvas transform/scale).
 */
export function picture(options: PictureOptions = {}): Picture {
  return new Picture(options)
}
