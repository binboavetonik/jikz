import { Point, point } from '../core/Point'
import { measureText, LINE_HEIGHT } from '../text/measureText'
import {
  DEFAULT_LABEL_DISTANCE,
  DEFAULT_LABEL_FONT_SIZE,
  estimateLabelSize,
} from '../text/placeText'
import { degToRad } from '../utils/math'
// Deferred circular import: Positioning imports Node, Node imports the
// positioning wrappers. Both sides only touch the other's bindings
// inside function bodies, never at module-evaluation time, so the
// cycle is safe under ESM live bindings.
import { nodeRight, nodeLeft, nodeAbove, nodeBelow } from './Positioning'
import type { PointLike } from '../core/types'
import { parseAnchorSpec, isTextAnchor, type AnchorSpec, type Anchorable, type TextAnchor } from '../core/Anchor'
import type { Shape, ShapeOptions } from '../geometry/Shape'
import { Rotated } from '../geometry/Rotated'
// Type-only import: Renderer imports Node as a type too, so a value
// import would create a cycle. TextOptions is erased at compile time.
import type { TextOptions } from '../render/Renderer'

/**
 * Every built-in shape-type string, in gallery order. This array is the
 * RUNTIME source of truth for the built-in set: every entry is registered
 * in the shape registry (`geometry/registry`) — a string listed here
 * without a registration fails the registry consistency tests.
 *
 * The COMPILE-TIME source of truth is {@link BuiltinShapes} /
 * {@link ShapeRegistry} below; extension names (circuits, user shapes)
 * are not listed here — they join the type level by declaration merging.
 */
export const SHAPE_TYPES = [
  'rectangle',
  'circle',
  'ellipse',
  'diamond',
  'trapezium',
  'parallelogram',
  'regular polygon',
  'star',
  'cylinder',
  'isosceles triangle',
  'single arrow',
  'double arrow',
  'callout',
  'cloud',
  'signal',
  'tape',
  'starburst',
  // Geometric shapes
  'semicircle',
  'kite',
  'dart',
  'circular sector',
  // Misc shapes
  'rounded rectangle',
  'chamfered rectangle',
  'cross out',
  'strike out',
  // Symbol shapes
  'forbidden sign',
  'magnifying glass',
  'magnetic tape',
  // Callout shapes
  'ellipse callout',
  'cloud callout',
  // Arrow shapes
  'arrow box',
  // Multipart shapes
  'circle split',
  'rectangle split',
] as const

/**
 * The built-in shape names as an interface, so the augmentable
 * {@link ShapeRegistry} can extend it. Must mirror {@link SHAPE_TYPES}
 * exactly — the assertions at the bottom of this block enforce both
 * directions at compile time. Extension names do NOT go here; they
 * augment {@link ShapeRegistry} instead.
 *
 * The value type is reserved for future per-shape options typing; use `{}`.
 */
interface BuiltinShapes {
  rectangle: {}
  circle: {}
  ellipse: {}
  diamond: {}
  trapezium: {}
  parallelogram: {}
  'regular polygon': Pick<RegularPolygonOptions, 'sides' | 'rotation'>
  star: Pick<StarOptions, 'points' | 'innerRatio' | 'rotation'>
  cylinder: {}
  'isosceles triangle': {}
  'single arrow': {}
  'double arrow': {}
  callout: {}
  cloud: {}
  signal: {}
  tape: {}
  starburst: {}
  // Geometric shapes
  semicircle: {}
  kite: {}
  dart: {}
  'circular sector': {}
  // Misc shapes
  'rounded rectangle': Pick<RoundedRectangleOptions, 'cornerRadius'>
  'chamfered rectangle': Pick<ChamferedRectangleOptions, 'chamferSize'>
  'cross out': {}
  'strike out': {}
  // Symbol shapes
  'forbidden sign': {}
  'magnifying glass': {}
  'magnetic tape': {}
  // Callout shapes
  'ellipse callout': {}
  'cloud callout': {}
  // Arrow shapes
  'arrow box': {}
  // Multipart shapes
  'circle split': {}
  'rectangle split': {}
}

/**
 * Shape names known to the type system — the autocomplete and
 * typo-checking source for `node({ shape: ... })`. Declared as an
 * interface (not a union) so extensions add their names by declaration
 * merging. The circuits extension does this for you: importing it
 * (directly or via the package root) adds `'resistor'`, `'op amp'`, …
 * to {@link ShapeType}.
 *
 * Note the type level mirrors TikZ: a name is valid SYNTAX once the
 * extension is imported, but runtime resolution still requires the
 * matching registration call (for circuits: `registerCircuits()`),
 * just as `op amp` needs `\usetikzlibrary{circuits.ee}`.
 *
 * Registering your own shape? Augment alongside `registerShape()`:
 *
 * @example
 * ```ts
 * registerShape('house', (o) => new House(o))
 * declare module '@ozan.e/jikz' {
 *   interface ShapeRegistry { house: {} }
 * }
 * ```
 * (Inside the library source tree, augment via the relative module
 * path, e.g. `declare module './Node'`.)
 */
export interface ShapeRegistry extends BuiltinShapes {}

/**
 * Shape-type string accepted by `node({ shape: ... })`: the built-ins
 * plus every name extensions added to {@link ShapeRegistry}.
 */
export type ShapeType = keyof ShapeRegistry

/**
 * Shape spec accepted by `node({ shape: ... })`: a registered
 * {@link ShapeType} string (autocomplete-friendly; misspellings are
 * compile errors), or a pre-constructed {@link Shape} instance when you
 * need full control (`star({ points: 8 })`) or never registered the
 * shape under a name.
 */
export type ShapeSpec = ShapeType | Shape

/**
 * The `shapeOptions` type for a given shape spec: the value stored in
 * {@link ShapeRegistry} under that name. Typed entries (e.g. `star`'s
 * `{ points, innerRatio, rotation }`, circuit variants via the
 * extension's augmentation) autocomplete and excess-key-check;
 * untyped entries (`{}`) and pre-constructed {@link Shape} instances
 * stay permissive.
 */
export type ShapeOptionsFor<S> = S extends keyof ShapeRegistry
  ? ShapeRegistry[S]
  : Record<string, unknown>

/**
 * Compile-time assertion: `assertType<true>()` compiles only when the
 * type argument resolves to `true`. Pins type-level invariants that
 * runtime tests cannot see. (Not re-exported from the package root.)
 *
 * Write the failing branch as `false`, NEVER as `never`: `never` is
 * assignable to every type, so `X extends Y ? true : never` satisfies
 * the constraint however the condition resolves — a guard that pins
 * nothing. `? true : false` is the form that fails.
 */
export function assertType<T extends true>(_phantom?: T): void {
  /* compile-time only */
}

// Compile-time guards: BuiltinShapes must mirror SHAPE_TYPES exactly.
// (Asserted against BuiltinShapes, not ShapeRegistry — extensions
// legitimately widen ShapeRegistry by declaration merging.)
assertType<(typeof SHAPE_TYPES)[number] extends keyof BuiltinShapes ? true : false>()
assertType<keyof BuiltinShapes extends (typeof SHAPE_TYPES)[number] ? true : false>()
import { createShape, shapeTextAutoSize } from '../geometry/registry'
import type { StarOptions } from '../geometry/complex/Star'
import type { RegularPolygonOptions } from '../geometry/complex/RegularPolygon'
import type { RoundedRectangleOptions } from '../geometry/complex/RoundedRectangle'
import type { ChamferedRectangleOptions } from '../geometry/complex/ChamferedRectangle'

/**
 * A TikZ-style node label: `label=<spec>:<text>`.
 *
 * The label is placed on the node's boundary at `at` (outer sep
 * included, matching TikZ where label distance is measured from the
 * outer border), then pushed outward by `distance` plus half the
 * label's own extent along the placement ray — so `distance` is a
 * border-to-border gap, not a center offset.
 *
 * Numeric angles follow the library's screen convention (0° = east,
 * 90° = south, 270° = north) — consistent with {@link Node.anchor},
 * but note this differs from TikZ where numeric 90° is north.
 */
export interface NodeLabel {
  /** Label text. '$...$' routes through KaTeX like `Picture.text`. */
  text: string
  /**
   * Placement: compass anchor, alias ('ne'), or degrees.
   * TikZ: `label=<angle>:...`. Default: 'north'.
   *
   * On rotated nodes the placement follows the node's local frame
   * (labels rotate with the node, TikZ semantics): 'north' on a node
   * rotated 90° places the label on the node's visual right. Text
   * anchors ('base', 'mid', …) are rejected — they cannot position a
   * label outside the border.
   */
  at?: AnchorSpec
  /**
   * Gap between the node's (outer-sep) boundary and the label, px.
   * TikZ: `label distance=<d>`. Default: the node's `labelDistance`.
   */
  distance?: number
  /**
   * Per-label styling forwarded to the text renderer.
   * TikZ: `label={[red, font=\tiny]...}`.
   */
  options?: TextOptions
  /**
   * Which frame `at` is interpreted in. `'local'` (default): the label
   * rides the node's rotation — `'north'` on a node rotated 90° lands
   * on its visual right (TikZ label semantics under `transform shape`).
   * `'screen'`: `at` is a screen-absolute direction from the shape as
   * drawn — `'north'` is always the visual top; named specs resolve to
   * their screen angle, so the reference is the border point along that
   * ray (matching numeric-anchor behavior). The label text itself
   * stays upright in both frames (TikZ).
   */
  frame?: 'local' | 'screen'
}

/**
 * Label placement constants live in `text/placeText` (the placement
 * module) and are re-exported here for compatibility —
 * `DEFAULT_LABEL_DISTANCE` is the TikZ `label distance` equivalent,
 * `DEFAULT_LABEL_FONT_SIZE` the `every label` style equivalent.
 */
export { DEFAULT_LABEL_DISTANCE, DEFAULT_LABEL_FONT_SIZE }

/**
 * Options for creating a node.
 *
 * `shape` accepts either:
 *   - a shape-type string — any key of {@link ShapeRegistry}: a built-in
 *     or an extension name (circuits, user shapes) added by declaration
 *     merging (width/height/innerSep/outerSep drive sizing; pass
 *     shape-specific options through `shapeOptions`), or
 *   - a pre-constructed {@link Shape} instance (any `geometry.Shape`), when
 *     you need full control like `star({ points: 8 })`.
 */
export interface NodeOptions<S extends ShapeSpec = ShapeSpec> {
  name?: string
  text?: string
  at?: PointLike
  shape?: S
  /**
   * Shape-specific options forwarded to the shape factory when `shape`
   * is a string — typed per shape name ({ points: 8 } for 'star',
   * { sides: 3 } for 'regular polygon', { variant: 'iec' } for
   * 'resistor', …). Ignored when `shape` is a pre-constructed
   * {@link Shape} instance.
   */
  shapeOptions?: ShapeOptionsFor<S>
  width?: number
  height?: number
  minWidth?: number
  minHeight?: number
  innerSep?: number
  outerSep?: number
  /**
   * Explicit text dimensions for auto-sizing. When omitted (and no
   * width/height given), the node measures its own text via
   * {@link measureText} — canvas-accurate in the browser, font-metrics
   * approximation in Node. Supply these to pin exact dimensions.
   */
  textWidth?: number
  textHeight?: number
  /**
   * Rotate the node `angle` degrees (clockwise on screen, matching SVG's
   * `rotate()`) around its center. Rotation is geometric: anchors,
   * border points and hit-testing all follow the rotated shape, so
   * edges attach correctly. Named anchors rotate with the node (TikZ
   * semantics): `anchor('north')` on a node rotated 90° lies on the
   * visual right. Default: 0.
   */
  rotate?: number
  /**
   * Whether the node's own text rotates with the shape when `rotate`
   * is non-zero. Default: true (jikz fuses TikZ's `rotate` +
   * `transform shape` for geometry and text). Set false for upright
   * text on a rotated node — e.g. a rotated container whose caption
   * should stay readable. Labels are unaffected: their positions
   * follow `frame`, their text is always upright.
   */
  rotateText?: boolean
  /**
   * Place the node so that this anchor sits at `at`, instead of the
   * center (TikZ: `at` + `anchor=`). Combined with `rotate`, the
   * *rotated* anchor is placed at `at` — e.g. `rotate: 90,
   * anchor: 'north'` puts the rotated node's north point (visual east
   * edge midpoint) at `at`. Essential for positioning symbols by their
   * connection points.
   */
  anchor?: AnchorSpec
  /**
   * TikZ-style labels: `label=<spec>:<text>` entries rendered as text
   * placed outward from the node's boundary. See {@link NodeLabel}.
   */
  labels?: NodeLabel[]
  /**
   * Node-wide default gap between boundary and labels, px.
   * TikZ: `label distance=<d>`. Default: {@link DEFAULT_LABEL_DISTANCE}.
   */
  labelDistance?: number
}

const DEFAULT_NODE_OPTIONS = {
  at: { x: 0, y: 0 } as PointLike,
  shape: 'rectangle' as ShapeType,
  width: 0,
  height: 0,
  minWidth: 20,
  minHeight: 20,
  innerSep: 4,
  outerSep: 0,
  rotate: 0,
  rotateText: true,
  labelDistance: DEFAULT_LABEL_DISTANCE,
}

/**
 * A node in a TikZ-style diagram.
 *
 * A `Node` composes a geometry {@link Shape} with text and spacing. All
 * shape geometry (anchors, bounds, hit-testing, SVG path) is delegated to
 * the underlying shape; the Node layer only adds text, a name/id, and the
 * innerSep/outerSep spacing concepts.
 */
export class Node implements Anchorable {
  readonly kind = 'node' as const
  readonly name: string
  readonly text: string
  readonly shape: Shape
  readonly innerSep: number
  readonly outerSep: number
  readonly labels: readonly NodeLabel[]
  readonly labelDistance: number
  /** Rotation in degrees (clockwise on screen); 0 when unrotated. */
  readonly rotate: number
  /**
   * Whether the node's own text rotates with the shape (default true).
   * `false` keeps text upright on a rotated node — TikZ's plain
   * `rotate` (coordinate transform) vs `rotate` + `transform shape`.
   */
  readonly rotateText: boolean
  /** Explicit text dimensions from options, if supplied (see {@link NodeOptions.textWidth}). */
  readonly textWidth?: number
  readonly textHeight?: number

  constructor(options: NodeOptions = {}) {
    const opts = { ...DEFAULT_NODE_OPTIONS, ...options }

    this.name = options.name ?? ''
    this.text = options.text ?? ''
    this.innerSep = opts.innerSep
    this.outerSep = opts.outerSep
    this.labels = options.labels ?? []
    this.labelDistance = opts.labelDistance
    this.rotate = opts.rotate
    this.rotateText = opts.rotateText
    this.textWidth = options.textWidth
    this.textHeight = options.textHeight

    let shape: Shape

    if (opts.shape && typeof opts.shape !== 'string') {
      // Pre-constructed Shape instance: honor it as-is. We don't resize
      // pre-constructed shapes: the caller is in charge of dimensions.
      shape = opts.shape
    } else {
      // String shape-type path: derive width/height, auto-size from text
      // if no explicit dimensions (and the shape opts into text
      // auto-sizing — domain shapes with intrinsic sizes, like circuit
      // symbols, opt out via the registry), apply minimums, then factory.
      let width = opts.width
      let height = opts.height

      const textAutoSize = shapeTextAutoSize(opts.shape as string)
      if ((width === 0 || height === 0) && this.text && textAutoSize) {
        const measured = measureText(this.text)
        if (width === 0) {
          width = (options.textWidth ?? measured.width) + 2 * opts.innerSep
        }
        if (height === 0) {
          height = (options.textHeight ?? measured.height) + 2 * opts.innerSep
        }
      }

      width = Math.max(width, opts.minWidth)
      height = Math.max(height, opts.minHeight)

      const shapeOpts = {
        center: opts.at,
        width,
        height,
        minWidth: opts.minWidth,
        minHeight: opts.minHeight,
        innerSep: opts.innerSep,
        outerSep: opts.outerSep,
        // Shape-specific options (e.g. star points, polygon sides) flow
        // through to the registered factory.
        ...options.shapeOptions,
      }

      shape = Node.createShape(opts.shape as string, shapeOpts)
    }

    // Rotate geometrically (anchors/border/hit-testing follow). Guard
    // against double-wrapping: moveTo()/resize() reconstruct Nodes with
    // an already-rotated shape instance plus `rotate`.
    if (this.rotate !== 0 && !(shape instanceof Rotated)) {
      shape = new Rotated(shape, this.rotate)
    }

    // TikZ `at` + `anchor=`: shift so the (possibly rotated) anchor
    // lands on `at` rather than the center.
    if (options.anchor !== undefined) {
      const a = shape.anchor(options.anchor)
      const c = shape.center
      shape = shape.moveTo(
        point(opts.at.x - (a.x - c.x), opts.at.y - (a.y - c.y))
      )
    }

    this.shape = shape
  }

  /**
   * Build a shape from a type string and standard options.
   *
   * The 4 basic shapes (rectangle, circle, ellipse, diamond) are constructed
   * from geometry primitives directly. All other shape types delegate to
   * the shape-specific factory functions exported from `./shapes`.
   */
  private static createShape(type: string, options: ShapeOptions): Shape {
    return createShape(type, options)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Anchorable implementation
  // ─────────────────────────────────────────────────────────────────────────────

  get center(): Point {
    return this.shape.center
  }

  /**
   * Anchor point by name or angle.
   *
   * Text anchors ('base', 'mid', 'base east', …) are intercepted and
   * computed from the node's measured text — see {@link textAnchorPoint}.
   * Everything else is pure delegation to the underlying shape's
   * `anchor()`. `outerSep` is applied by asking an outerSep-expanded
   * copy of the shape for the anchor — this preserves TikZ's semantics
   * where `outer sep` offsets anchors without moving the drawn boundary.
   */
  anchor(spec: AnchorSpec): Point {
    if (isTextAnchor(spec)) {
      return this.textAnchorPoint(spec)
    }
    const base =
      this.outerSep === 0
        ? this.shape
        : this.shape.resize(
            this.shape.width + 2 * this.outerSep,
            this.shape.height + 2 * this.outerSep
          )
    return base.anchor(spec)
  }

  // Typographic ratios for text anchors (typical sans-serif metrics).
  // measureText returns only extents, so ascent/x-height are derived
  // from the effective em (textHeight / (lines × LINE_HEIGHT)).
  private static readonly TEXT_ASCENT_RATIO = 0.8
  private static readonly TEXT_X_HEIGHT_RATIO = 0.5

  /**
   * Compute a text anchor ('base', 'base east', 'base west', 'mid',
   * 'mid east', 'mid west') — TikZ's typographic anchors.
   *
   * The text block is vertically centered in the node, so for a block
   * of `lines` lines with effective em `e`:
   *   - baseline (of the last line) sits at
   *     top + (lines−1)·LINE_HEIGHT·e + half-leading + ascent, i.e.
   *     ≈ center + 0.3·e for a single line
   *   - 'mid' is half the x-height above the baseline (TikZ `mid`).
   *
   * 'base east'/'base west'/'mid east'/'mid west' take the east/west
   * border x at the baseline/mid height (an approximation for non-rect
   * shapes whose border curves away between center height and baseline).
   * On rotated nodes the computed point is rotated with the node.
   */
  private textAnchorPoint(spec: TextAnchor): Point {
    const c = this.center

    if (!this.text) {
      return c
    }

    const lines = this.text.split('\n').length
    const measured = measureText(this.text)
    const textH = this.textHeight ?? measured.height
    const em = textH / (lines * LINE_HEIGHT)

    const baselineY =
      c.y -
      textH / 2 +
      (lines - 1) * LINE_HEIGHT * em +
      ((LINE_HEIGHT - 1) / 2 + Node.TEXT_ASCENT_RATIO) * em
    const midY = baselineY - (Node.TEXT_X_HEIGHT_RATIO / 2) * em

    const normalized = spec.toLowerCase().trim()
    const y = normalized.startsWith('base') ? baselineY : midY

    let x = c.x
    if (normalized.endsWith('east') || normalized.endsWith('west')) {
      // Border x in the UNROTATED frame; rotation is applied below.
      const unrotated =
        this.shape instanceof Rotated ? this.shape.base : this.shape
      const side = normalized.endsWith('east') ? 'east' : 'west'
      x = unrotated.anchor(side).x
    }

    const p = point(x, y)
    return this.rotate !== 0 ? p.rotateAround(c, this.rotate) : p
  }

  // Named anchor shortcuts
  get north(): Point { return this.anchor('north') }
  get south(): Point { return this.anchor('south') }
  get east(): Point { return this.anchor('east') }
  get west(): Point { return this.anchor('west') }
  get northEast(): Point { return this.anchor('north east') }
  get northWest(): Point { return this.anchor('north west') }
  get southEast(): Point { return this.anchor('south east') }
  get southWest(): Point { return this.anchor('south west') }

  // ─────────────────────────────────────────────────────────────────────────────
  // Labels (TikZ label=<spec>:<text>)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Resolved center point for one label, in picture coordinates.
   *
   * `anchor()` anchors on the outerSep-expanded shape (TikZ: label
   * distance is measured from the outer border), so the gap lands
   * outside `outer sep` automatically. A 'center' label sits on the
   * node's center — TikZ's `label=center:...`.
   *
   * Rotation: labels follow the node (TikZ). The border anchor and the
   * push direction are computed in the node's LOCAL (unrotated) frame
   * and then rotated by the node's angle — so `label=north:X` on a
   * node rotated 90° lands to the node's visual right. The label box
   * itself stays upright, so its extent along the push direction
   * ({@link halfAlongRay}) is measured with the ROTATED direction.
   *
   * @throws if `label.at` is a text anchor ('base', 'mid', …) — those
   * position relative to the node's own text and are meaningless for
   * placing another text outside the border.
   */
  labelPoint(label: NodeLabel): Point {
    const spec = label.at ?? 'north'
    if (isTextAnchor(spec)) {
      throw new Error(
        `Node label: '${spec}' is a text anchor and cannot position a ` +
          `label — use a cardinal name, alias, or angle.`
      )
    }
    const angle = parseAnchorSpec(spec)
    if (angle === null) return this.center

    const gap = label.distance ?? this.labelDistance
    const fontSize = label.options?.fontSize ?? DEFAULT_LABEL_FONT_SIZE
    const { width, height } = estimateLabelSize(label.text, {
      fontSize,
      fontFamily: label.options?.fontFamily,
    })

    // Screen frame: the spec is a screen-absolute DIRECTION from the
    // shape as drawn — 'north' is always the visual top, even on a
    // rotated node. Numeric anchors are already screen-absolute (see
    // Rotated), so this rides the numeric path; Node.anchor is
    // outerSep-aware.
    if (label.frame === 'screen') {
      const rad = degToRad(angle)
      const dx = Math.cos(rad)
      const dy = Math.sin(rad)
      const halfAlongRay = (Math.abs(dx) * width + Math.abs(dy) * height) / 2
      const base = this.anchor(angle)
      const d = gap + halfAlongRay
      return point(base.x + dx * d, base.y + dy * d)
    }

    // Local frame: unrotated shape (outerSep-expanded, TikZ semantics).
    const localShape =
      this.shape instanceof Rotated ? this.shape.base : this.shape
    const expanded =
      this.outerSep === 0
        ? localShape
        : localShape.resize(
            localShape.width + 2 * this.outerSep,
            localShape.height + 2 * this.outerSep
          )

    // Push along the placement ANGLE (TikZ shifts the label along the
    // specified angle), not the center→anchor ray — a wide rectangle's
    // corner anchor isn't on its named angle's ray, and a degenerate
    // zero-size shape has anchor === center (no ray at all).
    const rad = degToRad(angle)
    let dx = Math.cos(rad)
    let dy = Math.sin(rad)
    let base = expanded.anchor(spec)

    if (this.rotate !== 0) {
      base = base.rotateAround(this.center, this.rotate)
      const dir = point(dx, dy).rotate(this.rotate)
      dx = dir.x
      dy = dir.y
    }

    // Half the label's extent ALONG the (final) push direction, so
    // `distance` is a border-to-border gap (TikZ semantics), not a
    // center offset. Uses the rotated direction because the label box
    // itself stays upright.
    const halfAlongRay = (Math.abs(dx) * width + Math.abs(dy) * height) / 2

    const d = gap + halfAlongRay
    return point(base.x + dx * d, base.y + dy * d)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Geometry delegation
  // ─────────────────────────────────────────────────────────────────────────────

  get width(): number {
    return this.shape.width
  }

  get height(): number {
    return this.shape.height
  }

  get bounds(): [number, number, number, number] {
    return this.shape.bounds
  }

  contains(p: PointLike): boolean {
    return this.shape.contains(p)
  }

  boundaryPoint(angle: number): Point {
    return this.shape.boundaryPoint(angle)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Positioning (TikZ positioning library)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Create a new node placed in a direction from this one.
   *
   * `distance` is measured **from this node's anchor point to the new
   * node's center** (anchor-to-center), following `direction` as a
   * named anchor or screen-convention angle. For TikZ positioning
   * semantics — `distance` as the edge-to-edge gap — use
   * {@link rightOf}/{@link leftOf}/{@link above}/{@link below} or the
   * `nodeAt()` family from Positioning.
   */
  positioned(
    direction: AnchorSpec,
    distance: number,
    options: Omit<NodeOptions, 'at'> = {}
  ): Node {
    const fromAnchor = this.anchor(direction)

    let angle: number
    if (typeof direction === 'number') {
      angle = direction
    } else {
      // Screen convention: 0° = east, clockwise positive (90° = south,
      // 270° = north) — consistent with ANCHOR_ANGLES and atan2.
      const anchorMap: Record<string, number> = {
        east: 0, right: 0,
        south: 90, below: 90,
        west: 180, left: 180,
        north: 270, above: 270,
        'south east': 45,
        'south west': 135,
        'north west': 225,
        'north east': 315,
      }
      angle = anchorMap[direction.toLowerCase()] ?? 0
    }

    const rad = (angle * Math.PI) / 180
    const newCenter = point(
      fromAnchor.x + distance * Math.cos(rad),
      fromAnchor.y + distance * Math.sin(rad)
    )

    return new Node({ ...options, at: newCenter })
  }

  /**
   * Node to the right of this one with an edge-to-edge gap of
   * `distance` (TikZ `[right=of A]`; equivalent to `nodeRight(this, …)`).
   */
  rightOf(distance: number, options: Omit<NodeOptions, 'at'> = {}): Node {
    return nodeRight(this, distance, options)
  }

  /** See {@link rightOf} — to the left. */
  leftOf(distance: number, options: Omit<NodeOptions, 'at'> = {}): Node {
    return nodeLeft(this, distance, options)
  }

  /** See {@link rightOf} — above. */
  above(distance: number, options: Omit<NodeOptions, 'at'> = {}): Node {
    return nodeAbove(this, distance, options)
  }

  /** See {@link rightOf} — below. */
  below(distance: number, options: Omit<NodeOptions, 'at'> = {}): Node {
    return nodeBelow(this, distance, options)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Transformations
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Create a copy at a new position.
   */
  moveTo(newCenter: PointLike): Node {
    return new Node({
      name: this.name,
      text: this.text,
      at: newCenter,
      shape: this.shape.moveTo(newCenter),
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      rotate: this.rotate,
      rotateText: this.rotateText,
      textWidth: this.textWidth,
      textHeight: this.textHeight,
      labels: [...this.labels],
      labelDistance: this.labelDistance,
    })
  }

  /**
   * Create a copy with new dimensions.
   */
  resize(width: number, height: number): Node {
    return new Node({
      name: this.name,
      text: this.text,
      at: this.center,
      shape: this.shape.resize(width, height),
      innerSep: this.innerSep,
      outerSep: this.outerSep,
      rotate: this.rotate,
      rotateText: this.rotateText,
      textWidth: this.textWidth,
      textHeight: this.textHeight,
      labels: [...this.labels],
      labelDistance: this.labelDistance,
    })
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SVG
  // ─────────────────────────────────────────────────────────────────────────────

  toSVGPath(): string {
    return this.shape.toSVGPath()
  }

  toString(): string {
    return `Node(${this.name || 'unnamed'}, ${this.shape.type}, ${this.center})`
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory Functions
// ─────────────────────────────────────────────────────────────────────────────

/** Create a node from full options (shape defaults to rectangle). */
export function node(options: NodeOptions = {}): Node {
  return new Node(options)
}

/** Create a rectangle node. */
export function rectNode(options: Omit<NodeOptions, 'shape'> = {}): Node {
  return new Node({ ...options, shape: 'rectangle' })
}

/** Create a circle node. */
export function circleNode(options: Omit<NodeOptions, 'shape'> = {}): Node {
  return new Node({ ...options, shape: 'circle' })
}

/** Create an ellipse node. */
export function ellipseNode(options: Omit<NodeOptions, 'shape'> = {}): Node {
  return new Node({ ...options, shape: 'ellipse' })
}

/** Create a diamond node. */
export function diamondNode(options: Omit<NodeOptions, 'shape'> = {}): Node {
  return new Node({ ...options, shape: 'diamond' })
}
