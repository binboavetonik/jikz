import { Point, point } from '../core/Point'
import type { ShapeSet } from '../geometry/ShapeKind'
import { Transform } from '../core/Transform'
import { estimateLabelSize } from '../text/placeText'
import type { Node } from '../node/Node'
import type { Edge } from '../node/Edge'
import type { Renderable, RenderOptions, TextOptions } from '../render/Renderer'
import type { RenderStyle } from '../render/StyleMapper'
import { SVGRenderer } from '../render/SVGRenderer'
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
  type GroupRenderOptions,
  type PictureItem,
  type Scope,
} from './Container'

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
  DrawLabel,
  DrawOptions,
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
    for (const item of this.itemList) {
      renderItem(renderer, item, EMPTY_STYLES)
    }
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
    })
    this.renderWith(renderer)
    const spec = this.resolveViewBox(viewBox)
    const svg = renderer.builder.mount(container, spec)
    if (!panZoom) return svg
    if (!spec) {
      throw new Error(
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

/** Shared empty chain, so the common case allocates nothing. */
const EMPTY_STYLES: readonly Partial<RenderStyle>[] = []

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
 * Dispatch one item, carrying the enclosing scope style chain.
 * Scopes recurse; a scope needing a real group opens one first.
 */
function renderItem(
  renderer: PictureRenderer,
  item: PictureItem,
  styles: readonly Partial<RenderStyle>[]
): void {
  if (item.kind === 'node') {
    renderer.renderNode(item.node, withStyles(item.options, styles))
  } else if (item.kind === 'edge') {
    renderer.renderEdge(item.edge, withStyles(item.options, styles))
  } else if (item.kind === 'bare') {
    renderer.render(item.obj, mergePathModeIn(item.mode, item.options, styles))
  } else if (item.kind === 'pen') {
    // A pen statement expands to its path + labels, in place.
    for (const sub of item.pen.items()) renderItem(renderer, sub, styles)
  } else if (item.kind === 'scope') {
    renderScope(renderer, item.scope)
  } else {
    // Picture.text is TikZ's `\node at (x,y) {text}` — centered on the
    // point unless placed directionally (options.at/distance) or the
    // caller overrides alignment. Placement is computed here so every
    // backend gets it for free. Scope styles deliberately do NOT cascade
    // onto text: a scope setting `fill` for its shapes would otherwise
    // recolor every label inside it.
    const { at: _place, distance: _dist, ...styleOpts } = item.options ?? {}
    const textOpts: TextOptions = {
      textAnchor: 'middle',
      dominantBaseline: 'middle',
      ...styleOpts,
    }
    renderer.renderText(item.text, textCenter(item), textOpts)
  }
}

// Renders a scope over any shape set; Scope<S> is invariant in S, and
// rendering never resolves a shape name.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderScope(renderer: PictureRenderer, scope: Scope<any>): void {
  const grouped = scope.needsGroup
  if (grouped) {
    if (!renderer.beginGroup || !renderer.endGroup) {
      throw new Error(
        'Picture: this renderer cannot group, but a scope asks for ' +
          'transform/clip/opacity/class/id. Implement beginGroup/endGroup ' +
          'on the PictureRenderer, or restrict the scope to `style` (which ' +
          'needs no grouping).'
      )
    }
    renderer.beginGroup(scope.groupOptions)
  }
  for (const sub of scope.items) renderItem(renderer, sub, scope.styleChain)
  if (grouped) renderer.endGroup!()
}

/** Splice the scope chain under an item's own style. */
function withStyles(
  options: RenderOptions | undefined,
  styles: readonly Partial<RenderStyle>[]
): RenderOptions | undefined {
  if (styles.length === 0) return options
  const own = options?.style
  const ownList = own ? (Array.isArray(own) ? own : [own as Partial<RenderStyle>]) : []
  return { ...options, style: [...styles, ...ownList] }
}

/** Resolved render point for a text item (placement-aware). */
function textCenter(item: Extract<PictureItem, { kind: 'text' }>): Point {
  const o = item.options
  if (o?.at === undefined) return item.at
  return placeText(item.at, item.text, {
    at: o.at,
    distance: o.distance,
    fontSize: o.fontSize,
    fontFamily: o.fontFamily,
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
      add((item.obj as { bounds: [number, number, number, number] }).bounds)
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
      fontSize: item.options?.fontSize,
      fontFamily: item.options?.fontFamily,
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
