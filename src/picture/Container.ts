import { JikzError } from '../core/errors'
import { Point, point } from '../core/Point'
import type { ShapeOptions } from '../geometry/Shape'
import type { ShapeKind, ShapeSet } from '../geometry/ShapeKind'
import type { PointLike } from '../core/types'
import { Transform } from '../core/Transform'
import { type AnchorSpec, type Anchorable } from '../core/Anchor'
import {
  DEFAULT_LABEL_FONT_SIZE,
  Node,
  type NodeOptions,
  type ShapeSpec,
} from '../node/Node'
import { Edge, type EdgeOptions } from '../node/Edge'
import { Pen, type PenOptions } from './Pen'
import { pointMarkerRadius } from '../render/Renderer'
import type { Renderable, RenderOptions } from '../render/Renderer'
import { mergeStyles, styleList } from '../render/StyleMapper'
import type { ClipSpec, RenderStyle, StyleSpec } from '../render/StyleMapper'
import { resolveShading, type ShadingOptions } from '../render/Shadings'
import { shapeLabelPoint } from '../text/shapeLabels'
import { labelList, type Label, type LabelSpec, type TextStyle } from '../text/Label'
import type { SVGAnimation } from '../render/Renderer'
import { calculateRelativePosition, type PositionDirection } from '../node/Positioning'

/**
 * Options for {@link ItemContainer.text} — `\node at (p) {text}`
 * without a shape. `at`/`distance` place the text relative to the
 * point (`pic.text(p, 'h', { at: 'north east', distance: 6 })` is
 * `\node[above right] at (p) {h}`), `style` is the one
 * {@link TextStyle} every label uses, and the rest reach the backend
 * unchanged.
 */
export interface PictureTextOptions {
  /** Direction from the point to the text. Default: centred on it. */
  at?: AnchorSpec
  /** Gap between the point and the text's border along `at`, px. */
  distance?: number
  /** Colour and font. Absent, text follows the pen. */
  style?: TextStyle
  /** Horizontal alignment on the point (default `'middle'`). */
  textAnchor?: 'start' | 'middle' | 'end'
  /** Vertical alignment on the point (default `'middle'`). */
  dominantBaseline?: 'auto' | 'middle' | 'hanging' | 'alphabetic'
  className?: string
  id?: string
  attributes?: Record<string, string | number>
  animate?: SVGAnimation | SVGAnimation[]
}

/**
 * Options for the draw verbs (`draw`/`fill`/`filldraw`/`path`):
 * renderer {@link RenderOptions} plus TikZ-style shape labels —
 * `pic.draw(l, { label: { text: 'x', at: 'east' } })` is
 * `\draw … node[right]{x}`. Labels are desugared into text items at
 * call time (like node labels), so every backend supports them for
 * free; the keys never reach the renderer.
 */
export interface DrawOptions extends RenderOptions {
  /** Single-label shorthand: a plain string or a full {@link Label}. */
  label?: LabelSpec
  /** Multiple labels — TikZ allows several nodes per path statement. */
  labels?: readonly Label[]
}

/**
 * Kind-scoped defaults — TikZ's `every node`, `every edge`, `every
 * path` and `every label`. They sit under a scope's `style` and above
 * the path-mode baseline, so `every: { edge: dashed }` dashes every
 * edge and an edge's own `style` still wins.
 */
export interface EveryOptions {
  /** Applied to every node's shape. */
  node?: StyleSpec
  /** Applied to every edge. */
  edge?: StyleSpec
  /** Applied to every bare shape and pen statement. */
  path?: StyleSpec
  /** Applied to every label, node text and bare text. */
  text?: TextStyle
}

/**
 * Relative placement — TikZ's positioning library, `right=of A`. One
 * of the eight direction keys names the reference (a node or
 * coordinate name, an {@link Anchorable}, or a point); `distance` is
 * the border-to-border gap along that direction (TikZ `node
 * distance`). The node's `at` is ignored when one is set.
 */
export interface PlacementOptions {
  rightOf?: PictureEndpoint
  leftOf?: PictureEndpoint
  above?: PictureEndpoint
  below?: PictureEndpoint
  aboveLeft?: PictureEndpoint
  aboveRight?: PictureEndpoint
  belowLeft?: PictureEndpoint
  belowRight?: PictureEndpoint
  /** Gap along the placement direction, px. Default: 10. */
  distance?: number
}

const PLACEMENT_KEYS: Record<keyof Omit<PlacementOptions, 'distance'>, PositionDirection> = {
  rightOf: 'right',
  leftOf: 'left',
  above: 'above',
  below: 'below',
  aboveLeft: 'above left',
  aboveRight: 'above right',
  belowLeft: 'below left',
  belowRight: 'below right',
}

/** The render keys a node or edge call carries alongside its geometry. */
const RENDER_KEYS = ['style', 'textStyle', 'className', 'id', 'attributes', 'animate'] as const

/**
 * Split one option bag into what the geometry constructor takes and
 * what the renderer takes. `undefined` when nothing render-related was
 * given, so items built without any stay exactly as before.
 */
function splitRender<T extends RenderOptions>(
  options: T
): { rest: Omit<T, keyof RenderOptions>; render: RenderOptions | undefined } {
  const rest: Record<string, unknown> = { ...(options as Record<string, unknown>) }
  const render: Record<string, unknown> = {}
  let any = false
  for (const k of RENDER_KEYS) {
    if (k in rest) {
      if (rest[k] !== undefined) {
        render[k] = rest[k]
        any = true
      }
      delete rest[k]
    }
  }
  return {
    rest: rest as Omit<T, keyof RenderOptions>,
    render: any ? (render as RenderOptions) : undefined,
  }
}

/**
 * Options for the `shade()` verb — {@link DrawOptions} plus TikZ's
 * shading keys (`left color`, `ball color`, …). The shading resolves to
 * a gradient that fills the shape's bounding box.
 */
export interface ShadeOptions extends DrawOptions, ShadingOptions {}

/**
 * An endpoint in {@link ItemContainer.edge} can be:
 *   - a string spec like `"A"` or `"A.north"` / `"A.45"` (resolved against
 *     the picture's named-node and coordinate registries),
 *   - a raw {@link PointLike},
 *   - an {@link Anchorable} instance (a Node or any object with anchors).
 */
export type PictureEndpoint = string | PointLike | Anchorable

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
  return mergePathModeIn(mode, options, [])
}

/**
 * {@link mergePathMode} with an enclosing scope chain spliced in.
 *
 * Precedence, weakest first: mode baseline → scope styles (outermost
 * first) → the item's own style. Scopes beating the mode baseline is
 * what makes `scope({ style: { stroke: 'red' } }, s => s.draw(c))` draw
 * red rather than the `draw` baseline's black.
 *
 * `path` is the exception: its whole point is to paint nothing, so its
 * `none` baseline is applied *after* the scope chain and only an
 * explicit style on the call itself makes the shape visible. Without
 * that, any enclosing `stroke` would silently make every `\path`
 * visible.
 */
export function mergePathModeIn(
  mode: PathMode,
  options: RenderOptions | undefined,
  scopeStyles: readonly Partial<RenderStyle>[]
): RenderOptions {
  const base = PATH_MODE_STYLE[mode]
  const own = styleList(options?.style)
  // Merged to a flat object, not left as a chain: `options.style` has
  // always reached backends as a resolved RenderStyle here, and
  // third-party PictureRenderers read it as one.
  const style =
    mode === 'path'
      ? mergeStyles(...scopeStyles, base, ...own)
      : mergeStyles(base, ...scopeStyles, ...own)
  return { ...options, style }
}

/**
 * What {@link ItemContainer.add} accepts: a layout result (anything
 * with `nodes` and/or `edges` arrays — every layout builder's `build()`
 * returns one) or a flat list of nodes and edges (`toRenderables()`).
 */
export type AddableItems =
  | { readonly nodes?: readonly Node[]; readonly edges?: readonly Edge[] }
  | readonly (Node | Edge)[]

/** `Array.isArray` narrows a readonly-array union poorly; this does not. */
function isItemList(items: AddableItems): items is readonly (Node | Edge)[] {
  return Array.isArray(items)
}

/** Render options {@link ItemContainer.add} applies to what it adds. */
export interface AddOptions {
  /** Applied to every node added. */
  nodes?: RenderOptions
  /** Applied to every edge added. */
  edges?: RenderOptions
}

/**
 * Items stored in a container in the order they were added.
 * Insertion order is paint order.
 */
export type PictureItem =
  | { kind: 'node'; node: Node; name: string; options?: RenderOptions }
  | { kind: 'edge'; edge: Edge; options?: RenderOptions }
  | { kind: 'bare'; obj: Renderable; mode: PathMode; options?: RenderOptions }
  | { kind: 'text'; at: Point; text: string; options?: PictureTextOptions }
  | { kind: 'pen'; pen: Pen }
  // A picture holds scopes over any shape set, and Scope<S> is
  // invariant in S — the set only matters while nodes are being added.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | { kind: 'scope'; scope: Scope<any> }

/**
 * A scope's own settings — TikZ's `\begin{scope}[…]`.
 *
 * `style` cascades onto the nodes, edges and bare shapes inside (text
 * items keep their own {@link TextOptions}: cascading `fill` onto them
 * would recolor every label whenever a scope set a shape fill). The
 * rest are group properties: the SVG backend emits them on a `<g>`
 * wrapping the scope's output.
 */
export interface ScopeOptions {
  /** Styles inherited by nodes, edges and bare shapes in this scope. */
  style?: StyleSpec
  /** Kind-scoped defaults for this scope — see {@link EveryOptions}. */
  every?: EveryOptions
  /**
   * Transform applied to the whole scope. Geometry inside stays in the
   * scope's own coordinates; the backend wraps it in a transform group,
   * so strokes and arrow tips scale with it (as with `Picture`'s
   * canvas transform).
   */
  transform?: Transform
  /** Uniform scale — sugar for `transform: Transform.scaling(s)`. */
  scale?: number
  /** Group opacity: composites the scope as a unit, not per item. */
  opacity?: number
  /** Clip everything in the scope to this region. */
  clip?: ClipSpec
  /** CSS class on the group. */
  className?: string
  /** Element id on the group. */
  id?: string
}

/** The group properties a backend needs to open a scope's group. */
export interface GroupRenderOptions {
  transform?: Transform
  opacity?: number
  clip?: ClipSpec
  className?: string
  id?: string
}

/**
 * The registries a container reaches for name lookups. Implemented by
 * {@link Picture}; scopes hold a reference rather than their own copy,
 * so node names are global to the picture exactly as in TikZ.
 */
export interface ContainerRoot {
  registerNode(name: string, node: Node, transform: Transform | undefined): void
  registerCoordinate(name: string, at: Point, transform: Transform | undefined): void
  lookupNode(name: string): { node: Node; transform: Transform | undefined } | undefined
  lookupCoordinate(name: string): { at: Point; transform: Transform | undefined } | undefined
  hasName(name: string): boolean
  knownNames(): string
  /** The shape set string shape names resolve against, if any. */
  shapeSet(): ShapeSet | undefined
  /** Flatten a style spec, picture-local names first. */
  resolveStyles(spec: StyleSpec | undefined): Partial<RenderStyle>[]
  /** Resolve the names inside an `every` block. */
  resolveEvery(every: EveryOptions): EveryOptions
}

/**
 * A Node seen from a different coordinate system.
 *
 * When a container resolves a name declared under a different accumulated
 * transform, the raw Node's anchors are in the wrong space. Wrapping it
 * keeps it {@link Anchorable} — so `edge('A', 'B')` still auto-resolves
 * the boundary point along the ray toward the other endpoint — while
 * mapping every anchor through the relative transform.
 */
export class TransformedAnchorable implements Anchorable {
  constructor(
    private readonly inner: Anchorable,
    private readonly transform: Transform
  ) {}

  anchor(spec: AnchorSpec): Point {
    return this.transform.apply(this.inner.anchor(spec))
  }

  get center(): Point {
    return this.transform.apply(this.inner.center)
  }
}

/** Compose an optional transform with an optional scale, TikZ order. */
export function composeTransform(
  transform: Transform | undefined,
  scale: number | undefined
): Transform | undefined {
  if (transform && scale !== undefined) return transform.scale(scale)
  if (scale !== undefined) return Transform.scaling(scale)
  return transform
}

/**
 * Everything that can hold drawing items: {@link Picture} (the root)
 * and {@link Scope} (a nested group). The verbs live here so a scope
 * accepts exactly the same calls as the picture it sits in.
 */
/**
 * Options for {@link ItemContainer.node}, typed against the container's
 * shape set: `shape` is one of the set's names (or a kind/instance
 * directly), and `shapeOptions` is whatever that entry accepts.
 */
export type NodeOptionsFor<S extends ShapeSet, K> = Omit<
  NodeOptions,
  'name' | 'shape' | 'shapeOptions'
> & {
  shape?: K
  shapeOptions?: K extends keyof S
    ? Parameters<S[K]>[0]
    : K extends ShapeKind<infer O>
      ? O
      : Record<string, unknown>
} & RenderOptions &
  PlacementOptions

/** What {@link ItemContainer.edge} takes: the edge's keys and its render keys, one bag. */
export type PictureEdgeOptions = EdgeOptions & RenderOptions

export abstract class ItemContainer<S extends ShapeSet = {}> {
  protected readonly itemList: PictureItem[] = []

  /**
   * Registries live on the root picture; scopes borrow them. Expressed
   * as an abstract getter rather than a constructor parameter because
   * `Picture` *is* its own registry and cannot pass `this` to `super`.
   */
  protected abstract get registry(): ContainerRoot

  /**
   * The shape set in scope for string shape names. Scopes borrow the
   * root picture's set, so a name means the same thing everywhere in
   * one picture.
   */
  protected abstract get shapes(): S | undefined

  /**
   * Resolve a string shape name against the set in scope. Unknown names
   * throw here — at the call site that used the name, naming what IS in
   * scope — rather than surfacing later as a missing shape.
   */
  protected resolveShape(name: string): ShapeKind<ShapeOptions> {
    const kind = this.shapes?.[name]
    if (!kind) {
      const known = Object.keys(this.shapes ?? {})
        .map((n) => `"${n}"`)
        .join(', ')
      throw new JikzError('unknown-name', 
        `Picture: unknown shape "${name}" ` +
          `(shapes in scope: ${known || 'none'}). Pass the shape set to ` +
          `picture({ shapes }), or hand the shape value to node() directly.`
      )
    }
    return kind
  }

  /**
   * Transform from this container's coordinates up to picture space —
   * the composition of every enclosing scope's transform. `undefined`
   * means identity.
   */
  protected abstract get ownTransform(): Transform | undefined

  /** Style chain from the root down to (and including) this container. */
  protected abstract get inheritedStyles(): readonly Partial<RenderStyle>[]

  /** `every` defaults from the root down to (and including) this container. */
  protected abstract get inheritedEvery(): readonly EveryOptions[]

  /** `every.text` in force here, outermost first, merged. */
  protected everyText(): TextStyle | undefined {
    let merged: TextStyle | undefined
    for (const e of this.inheritedEvery) if (e.text) merged = { ...merged, ...e.text }
    return merged
  }

  /**
   * A label with its effective text style: the label default size,
   * then `every.text`, then the label's own `style`. Resolved once, at
   * insertion, so placement (which measures the text) and rendering
   * agree on the font.
   */
  labelStyle(label: Label): Label {
    return {
      ...label,
      style: { fontSize: DEFAULT_LABEL_FONT_SIZE, ...this.everyText(), ...label.style },
    }
  }

  /**
   * Open a nested scope — TikZ's `\begin{scope}[…] … \end{scope}`.
   *
   * The callback receives the scope; everything drawn on it is grouped,
   * transformed and styled together. Returns the *container* so the
   * fluent chain continues after the scope closes.
   *
   * @example
   * ```typescript
   * picture()
   *   .scope({ style: { stroke: '#2563eb' }, transform: Transform.translation(120, 0) }, (s) => {
   *     s.node('R1', { at: point(0, 0), text: 'R' })
   *      .node('C1', { at: point(60, 0), text: 'C' })
   *      .edge('R1', 'C1')
   *   })
   *   .draw(axis)
   * ```
   */
  scope(options: ScopeOptions, build: (scope: Scope<S>) => void): this {
    const local = composeTransform(options.transform, options.scale)
    const accumulated =
      local && this.ownTransform
        ? this.ownTransform.compose(local)
        : (local ?? this.ownTransform)
    const s = new Scope<S>(
      this.registry,
      accumulated,
      [...this.inheritedStyles, ...this.registry.resolveStyles(options.style)],
      options.every
        ? [...this.inheritedEvery, this.registry.resolveEvery(options.every)]
        : this.inheritedEvery,
      { ...options, transform: local, scale: undefined }
    )
    this.itemList.push({ kind: 'scope', scope: s })
    build(s)
    return this
  }

  /**
   * Add a named node. Throws on duplicate name — names are global to
   * the picture, so a scope cannot shadow an outer name. Any `name` in
   * the supplied options is ignored — the registry name is
   * authoritative.
   *
   * One option bag, as in TikZ: the node's geometry (`at`, `shape`,
   * `text`, `width`, …), its paint (`style`, `textStyle`, `className`,
   * `id`, `animate`) and its placement (`rightOf: 'A'`, … — see
   * {@link PlacementOptions}) all go together.
   */
  node<K extends (keyof S & string) | ShapeSpec = ShapeSpec>(
    name: string,
    options: NodeOptionsFor<S, K> = {} as NodeOptionsFor<S, K>
  ): this {
    if (this.registry.hasName(name)) {
      throw new JikzError('duplicate-name', 
        `Picture: node name "${name}" already exists in this picture.`
      )
    }
    const { rest, render } = splitRender(options)
    const {
      rightOf, leftOf, above, below, aboveLeft, aboveRight, belowLeft, belowRight,
      distance,
      ...nodeOpts
    } = rest
    const placement = { rightOf, leftOf, above, below, aboveLeft, aboveRight, belowLeft, belowRight }
    // Resolve a string name against the set in scope; a kind or an
    // instance passes straight through, and an absent shape stays
    // absent so Node applies its own default.
    const spec = nodeOpts.shape
    const shape = typeof spec === 'string' ? this.resolveShape(spec) : spec
    let n = new Node({
      ...nodeOpts,
      ...(shape ? { shape } : {}),
      name,
    } as NodeOptions)

    // TikZ `right=of A`: measure the node first, then put it where the
    // reference and the border-to-border gap say.
    for (const key of Object.keys(PLACEMENT_KEYS) as (keyof typeof PLACEMENT_KEYS)[]) {
      const ref = placement[key]
      if (ref === undefined) continue
      const at = calculateRelativePosition(
        this.resolveEndpoint(ref),
        PLACEMENT_KEYS[key],
        { distance },
        { width: n.width, height: n.height }
      )
      n = n.moveTo(at)
      break
    }

    this.registry.registerNode(name, n, this.ownTransform)
    this.itemList.push({ kind: 'node', node: n, name, options: render })
    this.pushLabels(n)
    return this
  }

  /**
   * Desugar a node's TikZ-style labels into bare text items, painted
   * right after it. They flow through the PictureRenderer.renderText
   * seam, so every backend supports labels (and math) for free.
   * Placement is resolved once, here — labels don't track later
   * mutations of the node.
   */
  private pushLabels(n: Node): void {
    for (const raw of n.labels) {
      const label = this.labelStyle(raw)
      this.itemList.push({
        kind: 'text',
        at: n.labelPoint(label),
        text: label.text,
        options: { style: label.style },
      })
    }
  }

  /**
   * Add already-built nodes and edges — the result of a layout builder
   * (`tree()`, `layered()`, `graph()`, `chain()`, `matrix()`), or any
   * array of `Node`/`Edge` values. Nodes that carry a name register
   * under it, so `edge('CEO', 'CTO')`, `'CEO.south'` and `resolve()`
   * work on them exactly as on nodes declared with {@link node};
   * unnamed nodes just paint. Duplicate names throw, as everywhere.
   *
   * ```ts
   * const org = tree({ at: point(220, 35) }).root('CEO').child('CTO').build()
   * picture({ shapes: allShapes })
   *   .add(org, { nodes: { style: green }, edges: { style: { stroke: '#64748b' } } })
   *   .edge('CTO', 'CEO', { bendAngle: 40 })
   * ```
   */
  add(
    items: AddableItems,
    options: AddOptions = {}
  ): this {
    // A result paints its edges first so nodes sit on top of them; a
    // flat list paints in the order given.
    const list: readonly (Node | Edge)[] = isItemList(items)
      ? items
      : [...(items.edges ?? []), ...(items.nodes ?? [])]
    for (const item of list) {
      if (item.kind === 'node') {
        if (item.name) {
          if (this.registry.hasName(item.name)) {
            throw new JikzError('duplicate-name', 
              `Picture: node name "${item.name}" already exists in this picture.`
            )
          }
          this.registry.registerNode(item.name, item, this.ownTransform)
        }
        this.itemList.push({
          kind: 'node',
          node: item,
          name: item.name,
          options: options.nodes,
        })
        this.pushLabels(item)
      } else {
        this.itemList.push({ kind: 'edge', edge: item, options: options.edges })
      }
    }
    return this
  }

  /**
   * Add an edge. Endpoints may be string specs, raw points, or any
   * Anchorable instance. Unknown names throw with a helpful message.
   *
   * Names declared in another scope resolve into *this* container's
   * coordinates, so an edge may cross scope boundaries freely.
   */
  edge(
    from: PictureEndpoint,
    to: PictureEndpoint,
    options: PictureEdgeOptions = {}
  ): this {
    const fromEnd = this.resolveEndpoint(from)
    const toEnd = this.resolveEndpoint(to)
    const { rest, render } = splitRender(options)
    const e = new Edge(fromEnd, toEnd, rest)
    this.itemList.push({ kind: 'edge', edge: e, options: render })
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
    const allLabels = labelList(label, labels)
    // A bare Point paints as a disc whose radius follows the stroke
    // width, so labels on one anchor to that disc rather than to the
    // mathematical point underneath it.
    const radius =
      obj instanceof Point
        ? pointMarkerRadius(
            mergeStyles(...this.inheritedStyles, ...this.registry.resolveStyles(options?.style))
              .strokeWidth
          )
        : 0
    for (const raw of allLabels) {
      const l = this.labelStyle(raw)
      this.itemList.push({
        kind: 'text',
        at: shapeLabelPoint(obj, l, radius),
        text: l.text,
        options: { style: l.style },
      })
    }
    return this
  }

  /**
   * Name a point (TikZ `\coordinate (A) at (x,y);`). Coordinates are
   * invisible — they paint nothing — but resolve everywhere a node
   * name does. Throws on duplicate name.
   */
  coordinate(name: string, at: PointLike): this {
    if (this.registry.hasName(name)) {
      throw new JikzError('duplicate-name', `Picture: name "${name}" already exists in this picture.`)
    }
    this.registry.registerCoordinate(name, point(at.x, at.y), this.ownTransform)
    return this
  }

  /**
   * Start a fluent TikZ path statement (see {@link Pen}). The pen
   * registers immediately and expands at render time, so it interleaves
   * correctly with other calls on this container.
   */
  pen(options?: PenOptions): Pen {
    const p = new Pen(options, this)
    this.itemList.push({ kind: 'pen', pen: p })
    return p
  }

  /**
   * `\path` — append a renderable with no style flags. Invisible unless
   * the caller overrides stroke or fill through `options.style`.
   */
  path(obj: Renderable, options?: DrawOptions): this {
    return this.bare(obj, 'path', options)
  }

  /**
   * `\draw` — append stroked, no fill. Equivalent to `\path[draw]`.
   */
  draw(obj: Renderable, options?: DrawOptions): this {
    return this.bare(obj, 'draw', options)
  }

  /** `\fill` — append filled, no stroke. Equivalent to `\path[fill]`. */
  fill(obj: Renderable, options?: DrawOptions): this {
    return this.bare(obj, 'fill', options)
  }

  /** `\filldraw` — append stroked and filled. */
  filldraw(obj: Renderable, options?: DrawOptions): this {
    return this.bare(obj, 'filldraw', options)
  }

  /**
   * `\shade` — append filled with a shading (gradient) that spans the
   * shape's bounding box. Accepts an explicit `gradient` spec or TikZ's
   * color keys:
   *
   * ```ts
   * pic.shade(circle(p, 40), { leftColor: '#2563eb', rightColor: '#7c3aed' })
   * pic.shade(rect(0, 0, 100, 100), { ballColor: '#dc2626' })
   * pic.shade(circle(p, 40), { gradient: { type: 'radial', stops: [...] } })
   * ```
   */
  shade(obj: Renderable, options?: ShadeOptions): this {
    const {
      gradient,
      shading,
      leftColor,
      rightColor,
      topColor,
      bottomColor,
      middleColor,
      innerColor,
      outerColor,
      ballColor,
      ...rest
    } = options ?? {}

    const spec = resolveShading({
      gradient,
      shading,
      leftColor,
      rightColor,
      topColor,
      bottomColor,
      middleColor,
      innerColor,
      outerColor,
      ballColor,
    })

    const own = styleList(rest.style)
    const style: StyleSpec =
      own.length > 0 ? [...own, { gradient: spec }] : { gradient: spec }
    return this.fill(obj, { ...rest, style })
  }

  /**
   * Bare text at a position — the `\node at (x,y) {text}` shorthand
   * without a shape.
   */
  text(at: PointLike, text: string, options?: PictureTextOptions): this {
    const every = this.everyText()
    const merged = every ? { ...options, style: { ...every, ...options?.style } } : options
    this.itemList.push({ kind: 'text', at: point(at.x, at.y), text, options: merged })
    return this
  }

  /** Items in insertion order. */
  get items(): readonly PictureItem[] {
    return this.itemList
  }

  /**
   * Resolve a string spec to a point in THIS container's coordinates.
   *
   * - `"A"` → `A.center`
   * - `"A.north"`, `"A.n"` → `A.anchor(spec)`
   * - `"A.45"` → `A.anchor(45)` (screen convention: 0° = east, clockwise)
   *
   * The separator is the *first* `.`, so node names cannot contain one.
   * Throws on unknown names.
   */
  resolve(spec: string): Point {
    const parsed = parseSpec(spec)
    const entry = this.registry.lookupNode(parsed.name)
    if (entry) {
      const local = this.relativeTo(entry.transform)
      const p =
        parsed.anchor === undefined
          ? entry.node.center
          : entry.node.anchor(parsed.anchor)
      return local ? local.apply(p) : p
    }
    const coord = this.registry.lookupCoordinate(parsed.name)
    // A coordinate is a zero-size node: every anchor is the point.
    if (coord) {
      const local = this.relativeTo(coord.transform)
      return local ? local.apply(coord.at) : coord.at
    }
    throw new JikzError('unknown-name', 
      `Picture: unknown node "${parsed.name}" (known: ${this.registry.knownNames()}).`
    )
  }

  /**
   * Transform carrying a point from a container with accumulated
   * transform `source` into this container's coordinates:
   * `own⁻¹ ∘ source`. `undefined` when both spaces coincide, which is
   * the common case and lets callers skip the wrapping entirely.
   */
  protected relativeTo(source: Transform | undefined): Transform | undefined {
    if (source === this.ownTransform) return undefined
    const own = this.ownTransform
    if (!own) return source
    const inverse = own.inverse()
    return source ? inverse.compose(source) : inverse
  }

  protected resolveEndpoint(spec: PictureEndpoint): PointLike | Anchorable {
    if (typeof spec !== 'string') return spec
    const parsed = parseSpec(spec)
    const entry = this.registry.lookupNode(parsed.name)
    if (entry) {
      const local = this.relativeTo(entry.transform)
      if (parsed.anchor === undefined) {
        // Bare name → keep it Anchorable, so Edge auto-resolves the
        // boundary point along the ray toward the other endpoint.
        return local ? new TransformedAnchorable(entry.node, local) : entry.node
      }
      // Explicit anchor → resolve now to a fixed point.
      const p = entry.node.anchor(parsed.anchor)
      return local ? local.apply(p) : p
    }
    const coord = this.registry.lookupCoordinate(parsed.name)
    if (coord) {
      const local = this.relativeTo(coord.transform)
      return local ? local.apply(coord.at) : coord.at
    }
    throw new JikzError('unknown-name', 
      `Picture: unknown node "${parsed.name}" (known: ${this.registry.knownNames()}).`
    )
  }
}

/**
 * A nested group inside a picture — TikZ's `\begin{scope}`.
 *
 * Created by {@link ItemContainer.scope}, never directly: the parent
 * needs to record it in paint order and hand it the accumulated
 * transform and style chain.
 */
export class Scope<S extends ShapeSet = {}> extends ItemContainer<S> {
  protected readonly registry: ContainerRoot
  protected readonly ownTransform: Transform | undefined

  /** Scopes borrow the root picture's shape set. */
  protected get shapes(): S | undefined {
    return this.registry.shapeSet() as S | undefined
  }

  protected readonly inheritedStyles: readonly Partial<RenderStyle>[]
  protected readonly inheritedEvery: readonly EveryOptions[]

  constructor(
    root: ContainerRoot,
    accumulated: Transform | undefined,
    styles: readonly Partial<RenderStyle>[],
    every: readonly EveryOptions[],
    /** This scope's own options; `transform` is local, not accumulated. */
    readonly options: ScopeOptions
  ) {
    super()
    this.registry = root
    this.ownTransform = accumulated
    this.inheritedStyles = styles
    this.inheritedEvery = every
  }

  /** Styles in force inside this scope, outermost first. */
  get styleChain(): readonly Partial<RenderStyle>[] {
    return this.inheritedStyles
  }

  /** `every` defaults in force inside this scope, outermost first. */
  get everyChain(): readonly EveryOptions[] {
    return this.inheritedEvery
  }

  /** The group properties the backend puts on the wrapping element. */
  get groupOptions(): GroupRenderOptions {
    return {
      transform: this.options.transform,
      opacity: this.options.opacity,
      clip: this.options.clip,
      className: this.options.className,
      id: this.options.id,
    }
  }

  /** Whether this scope needs a real group element in the output. */
  get needsGroup(): boolean {
    const o = this.options
    return Boolean(
      o.transform || o.opacity !== undefined || o.clip || o.className || o.id
    )
  }
}

/**
 * Parse a string spec like `"A"` or `"A.north"` or `"A.45"` into a name
 * and an optional anchor portion. The first `.` separates — node names
 * containing `.` are not supported.
 */
export function parseSpec(spec: string): { name: string; anchor?: string } {
  const idx = spec.indexOf('.')
  if (idx < 0) return { name: spec }
  return { name: spec.slice(0, idx), anchor: spec.slice(idx + 1) }
}
