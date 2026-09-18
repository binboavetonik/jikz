import { JikzError } from '../core/errors'
import { Point, point } from '../core/Point'
import type { ShapeSet } from '../geometry/ShapeKind'
import { Transform } from '../core/Transform'
import { estimateLabelSize } from '../text/placeText'
import type { Node } from '../node/Node'
import type { Edge } from '../node/Edge'
import type { Renderable, RenderOptions, TextOptions } from '../render/Renderer'
import type { RenderStyle, StyleSpec } from '../render/StyleMapper'
import type { ArrowTipDefinition } from '../render/ArrowTip'
import { SVGRenderer } from '../render/SVGRenderer'
import type { MathRenderer } from '../render/MathRenderer'
import type { ViewBoxSpec } from '../render/SVGBuilder'
import type {
  PanZoomController,
  PanZoomOptions,
  ViewBoxRect,
} from '../render/PanZoom'
import { placeText } from '../text/placeText'
import {
  ItemContainer,
  composeTransform,
  mergePathModeIn,
  type ContainerRoot,
  type EveryOptions,
  type GroupRenderOptions,
  type PictureItem,
  type PictureTextOptions,
  type Scope,
} from './Container'
import { styleList } from '../render/StyleMapper'

// Re-exported so `import { PathMode } from 'jikz'` keeps working after
// the container/scope split.
export {
  PATH_MODE_STYLE,
  mergePathMode,
  mergePathModeIn,
  ItemContainer,
  Scope,
  TransformedAnchorable,
} from './Container'
export type {
  AddableItems,
  AddOptions,
  DrawOptions,
  EveryOptions,
  PictureEdgeOptions,
  PlacementOptions,
  ShadeOptions,
  GroupRenderOptions,
  PathMode,
  PictureEndpoint,
  PictureItem,
  PictureTextOptions,
  ScopeOptions,
  ContainerRoot,
} from './Container'

/**
 * Viewport for `toSVG`/`mount`. Pass `{ width, height }` for a fixed
 * `0 0 w h` viewBox, or `{ fit: true }` for TikZ's auto-sizing: the
 * viewBox is computed from the content bounds, so pictures never need
 * a hand-computed size or a centering {@link Transform}.
 */
export interface PictureViewBox {
  /**
   * Math renderer for this render only, overriding the picture's own
   * and the module default. Rarely needed — set it on the picture.
   */
  mathRenderer?: MathRenderer
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
 * Options for {@link Picture.mount}. With `panZoom` set, the scene is
 * wrapped in a viewport group, the root svg fills its container
 * (`width`/`height: 100%`) and lets the browser letterbox the viewBox, and
 * mount returns a {@link PanZoomController} instead of the bare element.
 */
/**
 * `attachPanZoom`, as {@link MountOptions.panZoom} takes it. Passing the
 * function rather than a flag is what keeps the pan/zoom controller out
 * of a bundle that never pans: importing it is the opt-in.
 */
export type PanZoomAttach = (
  svg: SVGElement,
  viewBox: ViewBoxRect,
  options?: PanZoomOptions
) => PanZoomController

/** {@link MountOptions.panZoom}: the attach function, with options. */
export type PanZoomMount = PanZoomAttach | ({ attach: PanZoomAttach } & PanZoomOptions)

export interface MountOptions extends PictureViewBox {
  /**
   * First-class pan/zoom interaction. Hand over `attachPanZoom` itself:
   *
   * ```ts
   * import { attachPanZoom } from '@ozan.e/jikz'
   * pic.mount(el, { fit: true, panZoom: attachPanZoom })
   * pic.mount(el, { fit: true, panZoom: { attach: attachPanZoom, maxScale: 6 } })
   * ```
   */
  panZoom?: PanZoomMount
}

/**
 * Options for a {@link Picture}.
 */
export interface PictureOptions<S extends ShapeSet = {}> {
  /**
   * Shape kinds this picture resolves string shape names against —
   * `picture({ shapes: allShapes })` for the whole catalogue, or just
   * the sets you use. Names not in the set are compile errors, and the
   * per-name `shapeOptions` type comes from the set itself.
   */
  shapes?: S

  /**
   * Renders `$...$` labels. KaTeX is an optional peer and `toSVG()` is
   * synchronous, so jikz cannot import it for you — hand it over:
   *
   * ```ts
   * import katex from 'katex'
   * import { picture, katexAdapter } from '@ozan.e/jikz'
   *
   * const pic = picture({ shapes, mathRenderer: katexAdapter(katex) })
   * ```
   *
   * Without one, math labels fall back to plain text. For a harness
   * that renders pictures it does not build, see
   * {@link setDefaultMathRenderer}.
   */
  mathRenderer?: MathRenderer

  /**
   * Named styles local to this picture — TikZ `\tikzset` scoped to one
   * `tikzpicture`. A name here resolves before the global registry
   * ({@link registerStyle}) and the built-in presets, wherever a style
   * is given: `style: 'brand'`, `style: ['brand', dashed]`,
   * `every: { node: 'brand' }`. A recipe may name other styles.
   *
   * ```ts
   * picture({ styles: { brand: { stroke: '#2563eb', strokeWidth: 2 }, soft: ['brand', 'dashed'] } })
   * ```
   */
  styles?: Readonly<Record<string, StyleSpec>>

  /**
   * Arrow tips local to this picture, resolved before the global
   * registry ({@link registerArrowTip}) — the same {@link ArrowTipDefinition}
   * shape, keyed by the name `arrowEnd`/`arrowStart` will use.
   */
  arrowTips?: Readonly<Record<string, ArrowTipDefinition>>

  /**
   * Kind-scoped defaults for the whole picture — TikZ's `every node`,
   * `every edge`, `every path`, `every label`:
   *
   * ```ts
   * picture({ every: { node: { fill: '#f1f5f9' }, edge: { strokeWidth: 1.5 }, text: { fontSize: 12 } } })
   * ```
   *
   * A scope may add its own; an item's own `style` wins over all of them.
   */
  every?: EveryOptions

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
 * The minimal renderer surface {@link Picture.renderWith} needs.
 * `SVGRenderer` satisfies it; alternate backends can implement the four
 * required methods to compile pictures without touching SVG.
 *
 * `beginGroup`/`endGroup` are optional. A backend without them still
 * receives every item — and the scope *style* cascade still applies,
 * because styles are folded into each item's options before dispatch.
 * Only a scope's visual group properties (transform, clip, opacity,
 * class, id) need real grouping; asking for those on a backend that
 * cannot group throws rather than silently dropping them.
 */
export interface PictureRenderer {
  renderNode(node: Node, options?: RenderOptions): unknown
  renderEdge(edge: Edge, options?: RenderOptions): unknown
  render(obj: Renderable, options?: RenderOptions): unknown
  renderText(text: string, position: Point, options?: TextOptions): unknown
  /** Open a group for a scope. */
  beginGroup?(options: GroupRenderOptions): unknown
  /** Close the most recently opened group. */
  endGroup?(): unknown
}

/**
 * A Picture is the TikZ-style scope root: it owns named nodes, edges
 * that reference those nodes by name, any bare geometry that renders
 * alongside, and nested {@link Scope}s.
 *
 * Usage:
 *
 *     picture({ shapes: basicShapes })
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
 *
 * Names are global to the picture, as in TikZ: a node declared inside a
 * scope is addressable from anywhere, and resolves into the coordinate
 * system of whichever container asks for it.
 */
export class Picture<S extends ShapeSet = {}>
  extends ItemContainer<S>
  implements ContainerRoot
{
  private readonly nodesByName = new Map<
    string,
    { node: Node; transform: Transform | undefined }
  >()
  private readonly coordsByName = new Map<
    string,
    { at: Point; transform: Transform | undefined }
  >()
  private readonly options: PictureOptions<S>

  /** This picture's math renderer, if it was given one. */
  private get mathRenderer(): MathRenderer | undefined {
    return this.options.mathRenderer
  }

  constructor(options: PictureOptions<S> = {}) {
    super()
    this.options = options
  }

  // ── ItemContainer wiring ────────────────────────────────────────────────
  // The picture is the root: it is its own registry, its coordinates are
  // picture space, and it contributes no inherited style. (The canvas
  // transform is deliberately NOT part of `ownTransform` — it is applied
  // outside the scene by the backend and folded into the viewBox by
  // `resolveViewBox`, exactly as before scopes existed.)

  protected get registry(): ContainerRoot {
    return this
  }

  /** The shape set in scope (see {@link PictureOptions.shapes}). */
  shapeSet(): ShapeSet | undefined {
    return this.options.shapes
  }

  protected get shapes(): S | undefined {
    return this.options.shapes
  }

  protected get ownTransform(): Transform | undefined {
    return undefined
  }

  protected get inheritedStyles(): readonly Partial<RenderStyle>[] {
    return EMPTY_STYLES
  }

  private everyCache?: readonly EveryOptions[]
  protected get inheritedEvery(): readonly EveryOptions[] {
    if (!this.options.every) return EMPTY_EVERY
    // Names inside `every` resolve against this picture's styles once.
    this.everyCache ??= [this.resolveEvery(this.options.every)]
    return this.everyCache
  }

  // ── ContainerRoot (name registries) ─────────────────────────────────────

  registerNode(name: string, node: Node, transform: Transform | undefined): void {
    this.nodesByName.set(name, { node, transform })
  }

  registerCoordinate(name: string, at: Point, transform: Transform | undefined): void {
    this.coordsByName.set(name, { at, transform })
  }

  lookupNode(name: string): { node: Node; transform: Transform | undefined } | undefined {
    return this.nodesByName.get(name)
  }

  lookupCoordinate(name: string): { at: Point; transform: Transform | undefined } | undefined {
    return this.coordsByName.get(name)
  }

  hasName(name: string): boolean {
    return this.nodesByName.has(name) || this.coordsByName.has(name)
  }

  knownNames(): string {
    const names = [...this.nodesByName.keys(), ...this.coordsByName.keys()]
    return names.length === 0 ? '<none>' : names.map((n) => `"${n}"`).join(', ')
  }

  /** Resolve every name inside an `every` block against this picture's styles. */
  resolveEvery(every: EveryOptions): EveryOptions {
    const out: EveryOptions = {}
    if (every.node !== undefined) out.node = this.resolveStyles(every.node)
    if (every.edge !== undefined) out.edge = this.resolveStyles(every.edge)
    if (every.path !== undefined) out.path = this.resolveStyles(every.path)
    if (every.text !== undefined) out.text = every.text
    return out
  }

  /**
   * Flatten a style spec, resolving names against this picture's own
   * `styles` first, then the registry and the built-in presets. A local
   * recipe may itself name other styles (local or global).
   */
  resolveStyles(spec: StyleSpec | undefined): Partial<RenderStyle>[] {
    const local = this.options.styles
    if (!local) return styleList(spec)
    const lookup = (name: string, depth = 0): Partial<RenderStyle> | undefined => {
      const recipe = local[name]
      if (recipe === undefined) return undefined
      if (depth > 32) {
        throw new JikzError('invalid-argument', `Picture: style "${name}" refers to itself.`)
      }
      return Object.assign(
        {},
        ...styleList(recipe, (inner) => lookup(inner, depth + 1))
      ) as Partial<RenderStyle>
    }
    return styleList(spec, (name) => lookup(name))
  }

  /**
   * The canvas transform for the SVG backend, or undefined when the
   * scene renders untransformed.
   */
  private canvasTransform(): Transform | undefined {
    return composeTransform(this.options.transform, this.options.scale)
  }

  /**
   * Compile this picture through any renderer implementing
   * {@link PictureRenderer}. Walks items in insertion order (which is
   * paint order), descending into scopes; bare renderables carry their
   * TikZ-style {@link PathMode} baseline merged under the enclosing
   * scope styles and then the caller's own style.
   *
   * This is the backend-decoupling seam: `toSVG()`/`mount()` are thin
   * conveniences that call `renderWith(new SVGRenderer())`.
   */
  renderWith(renderer: PictureRenderer): this {
    const cascade: Cascade = {
      styles: EMPTY_STYLES,
      every: this.inheritedEvery,
      resolve: (spec) => this.resolveStyles(spec),
    }
    for (const item of this.itemList) renderItem(renderer, item, cascade)
    return this
  }

  /**
   * Bounding box of everything in the picture, in picture space
   * (undefined when empty). Scope transforms are folded in; the canvas
   * transform is not (it is applied by `resolveViewBox`). Text boxes are
   * measured estimates (KaTeX formulas measure as their raw source
   * string); edge label boxes and stroke widths are not included — pad
   * in fit mode to cover them.
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
      growBounds(item, grow, undefined)
    }
    return minX === Infinity ? undefined : [minX, minY, maxX, maxY]
  }

  private resolveViewBox(viewBox?: PictureViewBox): ViewBoxSpec | undefined {
    if (!viewBox) return undefined
    if (!viewBox.fit) {
      if (viewBox.width === undefined || viewBox.height === undefined) {
        throw new JikzError('invalid-argument', 'Picture.toSVG/mount: pass { width, height } or { fit: true }.')
      }
      return { width: viewBox.width, height: viewBox.height }
    }
    const bounds = this.contentBounds()
    if (!bounds) {
      throw new JikzError('invalid-argument', 'Picture: { fit: true } requires at least one item.')
    }
    const pad = viewBox.padding ?? 4
    let [minX, minY, maxX, maxY] = bounds
    const t = this.canvasTransform()
    if (t) {
      // The viewBox lives OUTSIDE the scene's transform group, so the
      // content bounds must be mapped through the canvas transform.
      ;[minX, minY, maxX, maxY] = mapBox([minX, minY, maxX, maxY], t)
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
      mathRenderer: viewBox?.mathRenderer ?? this.mathRenderer,
      arrowTips: this.options.arrowTips,
    })
    this.renderWith(renderer)
    return renderer.toSVG(this.resolveViewBox(viewBox) as { width: number; height: number })
  }

  /**
   * Compile and attach a live SVG element to `container` (browser only).
   * With {@link MountOptions.panZoom} — the `attachPanZoom` function
   * itself — the scene gets a viewport group and the return value is a
   * {@link PanZoomController} owning its transform.
   */
  mount(container: Element, options: MountOptions & { panZoom: PanZoomMount }): PanZoomController
  mount(container: Element, viewBox?: PictureViewBox): ReturnType<SVGRenderer['builder']['mount']>
  mount(
    container: Element,
    viewBox?: MountOptions
  ): ReturnType<SVGRenderer['builder']['mount']> | PanZoomController {
    const panZoom = viewBox?.panZoom
    const renderer = new SVGRenderer(undefined, undefined, {
      transform: this.canvasTransform(),
      viewportGroup: !!panZoom,
      mathRenderer: viewBox?.mathRenderer ?? this.mathRenderer,
      arrowTips: this.options.arrowTips,
    })
    this.renderWith(renderer)
    const spec = this.resolveViewBox(viewBox)
    const svg = renderer.builder.mount(container, spec)
    if (!panZoom) return svg
    if (!spec) {
      throw new JikzError('invalid-argument', 
        'Picture.mount: panZoom requires a viewBox — pass { fit: true } or { width, height }.'
      )
    }
    const attach = typeof panZoom === 'function' ? panZoom : panZoom.attach
    const options = typeof panZoom === 'function' ? {} : panZoom
    return attach(
      svg,
      { x: spec.x ?? 0, y: spec.y ?? 0, width: spec.width, height: spec.height },
      options
    )
  }

  /**
   * Look up a node by name. Returns undefined if absent.
   */
  getNode(name: string): Node | undefined {
    return this.nodesByName.get(name)?.node
  }

  /**
   * All registered node names.
   */
  get names(): readonly string[] {
    return Array.from(this.nodesByName.keys())
  }

  /**
   * All nodes in the registry (useful for layout passes or debugging).
   * Nodes declared inside a scope appear here too, in their own
   * coordinates — use {@link Picture.resolve} for picture-space points.
   */
  get nodes(): ReadonlyMap<string, Node> {
    const out = new Map<string, Node>()
    for (const [name, entry] of this.nodesByName) out.set(name, entry.node)
    return out
  }
}

/** Shared empty chains, so the common case allocates nothing. */
const EMPTY_STYLES: readonly Partial<RenderStyle>[] = []
const EMPTY_EVERY: readonly EveryOptions[] = []

/**
 * What cascades onto an item: the scope style chain and the `every`
 * chain, outermost first, plus the picture's name resolver — an item's
 * own `style` may name picture-local styles, which only the root knows.
 */
interface Cascade {
  styles: readonly Partial<RenderStyle>[]
  every: readonly EveryOptions[]
  resolve: (spec: StyleSpec | undefined) => Partial<RenderStyle>[]
}

/** The `every` entries for one kind, flattened outermost first. */
function everyStyles(
  every: readonly EveryOptions[],
  kind: 'node' | 'edge' | 'path'
): Partial<RenderStyle>[] {
  const out: Partial<RenderStyle>[] = []
  for (const e of every) out.push(...styleList(e[kind]))
  return out
}

/** `every.text` merged outermost first, under the item's own style. */
function everyText(every: readonly EveryOptions[]): PictureTextOptions['style'] {
  let merged: PictureTextOptions['style']
  for (const e of every) if (e.text) merged = { ...merged, ...e.text }
  return merged
}

/** Map an axis-aligned box through a transform, returning its new AABB. */
function mapBox(
  box: readonly [number, number, number, number],
  t: Transform
): [number, number, number, number] {
  const [x0, y0, x1, y1] = box
  const corners = [
    point(x0, y0),
    point(x1, y0),
    point(x0, y1),
    point(x1, y1),
  ].map((c) => t.apply(c))
  return [
    Math.min(...corners.map((c) => c.x)),
    Math.min(...corners.map((c) => c.y)),
    Math.max(...corners.map((c) => c.x)),
    Math.max(...corners.map((c) => c.y)),
  ]
}

/**
 * Dispatch one item, carrying the enclosing cascade. Precedence for a
 * node or edge, weakest first: `every.<kind>` (outermost first) → scope
 * `style` chain → the item's own style. Bare shapes get the path-mode
 * baseline under all of that (see {@link mergePathModeIn}). Scopes
 * recurse; a scope needing a real group opens one first.
 */
function renderItem(
  renderer: PictureRenderer,
  item: PictureItem,
  cascade: Cascade
): void {
  if (item.kind === 'node') {
    renderer.renderNode(
      item.node,
      withStyles(item.options, [...everyStyles(cascade.every, 'node'), ...cascade.styles], cascade)
    )
  } else if (item.kind === 'edge') {
    renderer.renderEdge(
      item.edge,
      withStyles(item.options, [...everyStyles(cascade.every, 'edge'), ...cascade.styles], cascade)
    )
  } else if (item.kind === 'bare') {
    renderer.render(
      item.obj,
      mergePathModeIn(item.mode, resolveOwn(item.options, cascade), [
        ...everyStyles(cascade.every, 'path'),
        ...cascade.styles,
      ])
    )
  } else if (item.kind === 'pen') {
    // A pen statement expands to its path + labels, in place.
    for (const sub of item.pen.items()) renderItem(renderer, sub, cascade)
  } else if (item.kind === 'scope') {
    renderScope(renderer, item.scope, cascade)
  } else {
    // Picture.text is TikZ's `\node at (x,y) {text}` — centered on the
    // point unless placed directionally (options.at/distance) or the
    // caller overrides alignment. Placement is computed here so every
    // backend gets it for free. Scope `style` deliberately does NOT
    // cascade onto text: a scope setting `fill` for its shapes would
    // otherwise recolor every label inside it. `every.text` does.
    renderer.renderText(item.text, textCenter(item), toTextOptions(item.options, cascade.every))
  }
}

/**
 * The backend {@link TextOptions} for a text item: the one
 * {@link TextStyle} unpacked into the renderer's font keys, with
 * `every.text` underneath it.
 */
function toTextOptions(
  options: PictureTextOptions | undefined,
  every: readonly EveryOptions[]
): TextOptions {
  const { at: _at, distance: _distance, style: own, ...rest } = options ?? {}
  const style = { ...everyText(every), ...own }
  const out: TextOptions = {
    textAnchor: 'middle',
    dominantBaseline: 'middle',
    ...rest,
  }
  if (style.fontSize !== undefined) out.fontSize = style.fontSize
  if (style.fontFamily !== undefined) out.fontFamily = style.fontFamily
  if (style.fontWeight !== undefined) out.fontWeight = style.fontWeight
  if (style.fill !== undefined) out.style = { fill: style.fill }
  return out
}

// Renders a scope over any shape set; Scope<S> is invariant in S, and
// rendering never resolves a shape name.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderScope(renderer: PictureRenderer, scope: Scope<any>, parent: Cascade): void {
  const grouped = scope.needsGroup
  if (grouped) {
    if (!renderer.beginGroup || !renderer.endGroup) {
      throw new JikzError('unsupported', 
        'Picture: this renderer cannot group, but a scope asks for ' +
          'transform/clip/opacity/class/id. Implement beginGroup/endGroup ' +
          'on the PictureRenderer, or restrict the scope to `style` (which ' +
          'needs no grouping).'
      )
    }
    renderer.beginGroup(scope.groupOptions)
  }
  const cascade: Cascade = {
    styles: scope.styleChain,
    every: scope.everyChain,
    resolve: parent.resolve,
  }
  for (const sub of scope.items) renderItem(renderer, sub, cascade)
  if (grouped) renderer.endGroup!()
}

/**
 * Splice the scope chain under an item's own style, and `every.text`
 * under its `textStyle`.
 */
function withStyles(
  options: RenderOptions | undefined,
  styles: readonly Partial<RenderStyle>[],
  cascade: Cascade
): RenderOptions | undefined {
  const text = everyText(cascade.every)
  const resolved = resolveOwn(options, cascade)
  if (styles.length === 0 && !text) return resolved
  const ownList = resolved?.style ? (resolved.style as Partial<RenderStyle>[]) : []
  const out: RenderOptions = { ...resolved }
  if (styles.length > 0) out.style = [...styles, ...ownList]
  if (text) out.textStyle = { ...text, ...options?.textStyle }
  return out
}

/**
 * An item's own options with any style NAMES resolved to objects
 * (picture-local first), so backends and `mergeStyles` only ever see
 * objects and a local name never leaks to the global registry.
 */
function resolveOwn(
  options: RenderOptions | undefined,
  cascade: Cascade
): RenderOptions | undefined {
  if (options?.style === undefined) return options
  return { ...options, style: cascade.resolve(options.style) }
}

/** Resolved render point for a text item (placement-aware). */
function textCenter(item: Extract<PictureItem, { kind: 'text' }>): Point {
  const o = item.options
  if (o?.at === undefined) return item.at
  return placeText(item.at, item.text, {
    at: o.at,
    distance: o.distance,
    fontSize: o.style?.fontSize,
    fontFamily: o.style?.fontFamily,
  })
}

/**
 * Grow `grow` by an item's bounds, mapped through the accumulated scope
 * transform so the picture-space box is correct inside nested scopes.
 */
function growBounds(
  item: PictureItem,
  grow: (b: readonly [number, number, number, number]) => void,
  transform: Transform | undefined
): void {
  const add = (b: readonly [number, number, number, number]) =>
    grow(transform ? mapBox(b, transform) : b)

  if (item.kind === 'node') {
    add(item.node.bounds)
  } else if (item.kind === 'edge') {
    // Control points can bulge past the endpoints on bent edges.
    const pts = [item.edge.from, item.edge.to, ...item.edge.controlPoints]
    for (const p of pts) add([p.x, p.y, p.x, p.y])
  } else if (item.kind === 'bare') {
    if (item.obj instanceof Point) {
      add([item.obj.x, item.obj.y, item.obj.x, item.obj.y])
    } else {
      const b = (item.obj as { bounds?: [number, number, number, number] }).bounds
      // A renderable with no bounds used to reach Math.min as undefined
      // and fail with "Cannot read properties of undefined (reading '0')"
      // four frames away from the drawing that caused it.
      if (!b) {
        const kind =
          (item.obj as { kind?: string; type?: string }).kind ??
          (item.obj as { type?: string }).type ??
          item.obj.constructor?.name ??
          'object'
        throw new JikzError('unsupported', 
          `Picture: cannot auto-fit the viewBox — a drawn ${kind} has no ` +
            `\`bounds\`. Give the shape a bounds getter, or mount with an ` +
            `explicit { width, height } instead of { fit: true }.`
        )
      }
      add(b)
    }
  } else if (item.kind === 'pen') {
    for (const sub of item.pen.items()) growBounds(sub, grow, transform)
  } else if (item.kind === 'scope') {
    const local = item.scope.options.transform
    const next = local && transform ? transform.compose(local) : (local ?? transform)
    for (const sub of item.scope.items) growBounds(sub, grow, next)
  } else {
    const center = textCenter(item)
    const { width, height } = estimateLabelSize(item.text, {
      fontSize: item.options?.style?.fontSize,
      fontFamily: item.options?.style?.fontFamily,
    })
    add([
      center.x - width / 2,
      center.y - height / 2,
      center.x + width / 2,
      center.y + height / 2,
    ])
  }
}

/**
 * Create a new, empty picture. Accepts optional {@link PictureOptions}
 * (canvas transform/scale).
 */
export function picture<S extends ShapeSet = {}>(
  options: PictureOptions<S> = {}
): Picture<S> {
  return new Picture(options)
}
