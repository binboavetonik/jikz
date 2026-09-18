import { JikzError } from '../core/errors'
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
import type { Label, Pin, TextStyle } from '../text/Label'
import { wrapText } from '../text/wrapText'
import type { Shape, ShapeOptions } from '../geometry/Shape'
import { Rotated } from '../geometry/Rotated'

/**
 * Shape spec accepted by `node({ shape: … })`:
 *
 *   - a {@link ShapeKind} — a factory value, from a shape set
 *     (`basicShapes.circle`) or your own {@link defineShape}; the node
 *     sizes it and calls it with `shapeOptions`, or
 *   - a pre-constructed {@link Shape} instance, when you built it
 *     yourself (`star({ points: 8 })`) and want it used as-is.
 *
 * Shape NAMES are resolved one level up, by the container that holds a
 * shape set: `picture({ shapes }).node('A', { shape: 'circle' })`.
 */
export type ShapeSpec = ShapeKind<ShapeOptions> | Shape

/**
 * The `shapeOptions` type for a shape spec: the parameter type of the
 * kind itself, so `{ points: 8 }` checks against the factory that will
 * receive it. Pre-constructed {@link Shape} instances ignore the bag.
 */
export type ShapeOptionsFor<S> = S extends ShapeKind<infer O>
  ? O
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

import { isShapeKind, type ShapeKind } from '../geometry/ShapeKind'
import { basicShapes, defaultShape } from '../geometry/shapes/basic'

export type { Label, TextStyle } from '../text/Label'

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
 * `shape` accepts either a {@link ShapeKind} — a factory value such as
 * `basicShapes.circle`, sized by the node and called with
 * `shapeOptions` — or a pre-constructed {@link Shape} instance, used
 * as-is. String NAMES are resolved by the container that holds a shape
 * set: `picture({ shapes }).node('A', { shape: 'circle' })`.
 */
export interface NodeOptions<S extends ShapeSpec = ShapeSpec> {
  name?: string
  text?: string
  at?: PointLike
  shape?: S
  /**
   * Shape-specific options forwarded to the kind — typed by that
   * kind's own parameter ({ points: 8 } for the star kind, { sides: 3 }
   * for regular polygon, { variant: 'iec' } for a resistor). Ignored
   * when `shape` is a pre-constructed {@link Shape} instance.
   */
  shapeOptions?: ShapeOptionsFor<S>
  width?: number
  height?: number
  minWidth?: number
  minHeight?: number
  innerSep?: number
  outerSep?: number
  /**
   * Wrap the text to this width, px — TikZ `text width`. Lines break
   * at spaces; `\n` still forces a break. The node then sizes to the
   * wrapped block (unless `width`/`height` are given).
   */
  textWidth?: number
  /**
   * Horizontal alignment of a multi-line text block — TikZ `align=`.
   * Default `'center'`.
   */
  align?: 'left' | 'center' | 'right'
  /**
   * Font and colour of the node's text — TikZ `font=`, `text=`. Used
   * for measuring (auto-size, text anchors) as well as painting, so a
   * `fontSize: 20` node is sized for 20 px text.
   */
  textStyle?: TextStyle
  /**
   * Pins — TikZ `pin=<angle>:<text>`: labels with a connecting line
   * from the node's border. See {@link Pin}.
   */
  pins?: readonly Pin[]
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
   * placed outward from the node's boundary. See {@link Label}.
   */
  labels?: readonly Label[]
  /**
   * Node-wide default gap between boundary and labels, px.
   * TikZ: `label distance=<d>`. Default: {@link DEFAULT_LABEL_DISTANCE}.
   */
  labelDistance?: number
}

const DEFAULT_NODE_OPTIONS = {
  at: { x: 0, y: 0 } as PointLike,
  shape: defaultShape as ShapeSpec,
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
  readonly labels: readonly Label[]
  readonly labelDistance: number
  /** Rotation in degrees (clockwise on screen); 0 when unrotated. */
  readonly rotate: number
  /**
   * Whether the node's own text rotates with the shape (default true).
   * `false` keeps text upright on a rotated node — TikZ's plain
   * `rotate` (coordinate transform) vs `rotate` + `transform shape`.
   */
  readonly rotateText: boolean
  /** Wrap width, when given (see {@link NodeOptions.textWidth}). */
  readonly textWidth?: number
  /** Text lines as laid out: `\n` breaks plus wrapping to `textWidth`. */
  readonly lines: readonly string[]
  /** Horizontal alignment of the text block. */
  readonly align: 'left' | 'center' | 'right'
  /** The node's own text style, if given. */
  readonly textStyle?: TextStyle
  /** Pins (labels with a connecting line). */
  readonly pins: readonly Pin[]
  /** Measured size of the text block, px (0×0 when there is no text). */
  readonly textBlock: { readonly width: number; readonly height: number }

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
    this.align = options.align ?? 'center'
    this.textStyle = options.textStyle
    this.pins = options.pins ?? []
    const font = {
      fontSize: options.textStyle?.fontSize,
      fontFamily: options.textStyle?.fontFamily,
      fontWeight:
        options.textStyle?.fontWeight === undefined ? undefined : String(options.textStyle.fontWeight),
    }
    this.lines = this.text
      ? options.textWidth !== undefined
        ? wrapText(this.text, options.textWidth, font)
        : this.text.split('\n')
      : []
    this.textBlock = this.text ? measureText(this.lines.join('\n'), font) : { width: 0, height: 0 }

    let shape: Shape

    if (opts.shape && !isShapeKind(opts.shape)) {
      // Pre-constructed Shape instance: honor it as-is. We don't resize
      // pre-constructed shapes: the caller is in charge of dimensions.
      shape = opts.shape
    } else {
      // Shape-kind path: derive width/height, auto-size from text if no
      // explicit dimensions (and the kind opts into text auto-sizing —
      // domain shapes with intrinsic sizes, like circuit symbols, set
      // textAutoSize false), apply minimums, then call the kind.
      // `?? defaultShape`: spreading options with an explicit
      // `shape: undefined` must not lose the default.
      const kind = (opts.shape ?? defaultShape) as ShapeKind<ShapeOptions>
      let width = opts.width
      let height = opts.height

      const textAutoSize = kind.textAutoSize
      if ((width === 0 || height === 0) && this.text && textAutoSize) {
        const measured = this.textBlock
        if (width === 0) {
          width = (options.textWidth ?? measured.width) + 2 * opts.innerSep
        }
        if (height === 0) {
          height = measured.height + 2 * opts.innerSep
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

      shape = kind(shapeOpts)
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
  // from the effective em (block height / (lines × LINE_HEIGHT)).
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

    const lines = this.lines.length
    const textH = this.textBlock.height
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
  labelPoint(label: Label): Point {
    const spec = label.at ?? 'north'
    if (isTextAnchor(spec)) {
      throw new JikzError('invalid-argument', 
        `Node label: '${spec}' is a text anchor and cannot position a ` +
          `label — use a cardinal name, alias, or angle.`
      )
    }
    const angle = parseAnchorSpec(spec)
    if (angle === null) return this.center

    const gap = label.distance ?? this.labelDistance
    const fontSize = label.style?.fontSize ?? DEFAULT_LABEL_FONT_SIZE
    const { width, height } = estimateLabelSize(label.text, {
      fontSize,
      fontFamily: label.style?.fontFamily,
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
      align: this.align,
      textStyle: this.textStyle,
      pins: [...this.pins],
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
      align: this.align,
      textStyle: this.textStyle,
      pins: [...this.pins],
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
  return new Node({ ...options, shape: basicShapes.rectangle })
}

/** Create a circle node. */
export function circleNode(options: Omit<NodeOptions, 'shape'> = {}): Node {
  return new Node({ ...options, shape: basicShapes.circle })
}

/** Create an ellipse node. */
export function ellipseNode(options: Omit<NodeOptions, 'shape'> = {}): Node {
  return new Node({ ...options, shape: basicShapes.ellipse })
}

/** Create a diamond node. */
export function diamondNode(options: Omit<NodeOptions, 'shape'> = {}): Node {
  return new Node({ ...options, shape: basicShapes.diamond })
}
