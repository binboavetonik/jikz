/**
 * Circuit annotations — circuitikz's `v=`, `i=` and `f=`.
 *
 * These are the marks that say what a schematic *means* rather than
 * what it contains: the voltage across a component, the current
 * through a wire. circuitikz attaches them to a bipole with key-value
 * suffixes (`v^`, `v_`, `v<`, `v>`); here they are functions over two
 * points, so they work between ports, between bare coordinates, or
 * across a gap where there is no component at all.
 *
 * That last case is the whole reason circuitikz has an `open` bipole:
 * it draws nothing and exists to hang a voltage on. jikz needs no such
 * placeholder — `voltage(pic, a, b)` spans whatever you point it at.
 *
 * Like {@link wire}, these take the picture first and add items to it,
 * because an annotation is an arrow *and* a label: two paints, which
 * one shape cannot carry.
 */
import type { Picture, PictureEndpoint } from '../../picture/Picture'
import type { ShapeSet } from '../../geometry/ShapeKind'
import type { ArrowTip } from '../../node/Edge'
import type { StyleSpec } from '../../render/StyleMapper'
import type { PointLike } from '../../core/types'
import { Point, point } from '../../core/Point'
import { bracePath } from '../../path/PathOperations'

/** Where the mark sits, relative to the direction of travel. */
export type AnnotationSide = 'left' | 'right'

/** Which way the arrow points along that direction. */
export type AnnotationSense = 'forward' | 'reverse'

/** What an annotation can span: a `"name.port"` spec or a point. */
export type AnnotationEndpoint = string | PointLike

/** Shared by {@link voltage} and {@link current}. */
export interface AnnotationOptions {
  /** Text beside the mark. KaTeX math works: `'$u_1$'`. */
  label?: string
  /** Side of travel — circuitikz's `^` (left) and `_` (right). */
  side?: AnnotationSide
  /** Arrow sense — circuitikz's `>` (forward) and `<` (reverse). */
  sense?: AnnotationSense
  /** Perpendicular offset from the segment. */
  distance?: number
  /** Extra offset for the label, beyond the mark itself. */
  labelDistance?: number
  /** Label size. */
  fontSize?: number
  /** Applied to both the mark and the label (text takes `stroke`). */
  style?: StyleSpec
  /** Arrow tip. */
  arrow?: ArrowTip
}

/** Options for {@link voltage}. */
export interface VoltageOptions extends AnnotationOptions {
  /** Shorten the mark at both ends, so it clears the terminals. */
  inset?: number
  /** Draw a brace instead of an arrow — circuitikz's curly voltages. */
  curly?: boolean
  /** Brace depth when `curly`. */
  amplitude?: number
}

/** Options for {@link current}. */
export interface CurrentOptions extends AnnotationOptions {
  /** Where along the segment the arrow sits, 0–1. Default 0.5. */
  pos?: number
  /** Arrow length. Default 18. */
  length?: number
}

const VOLTAGE_DISTANCE = 14
const CURRENT_DISTANCE = 0
const LABEL_DISTANCE = 11
const FONT_SIZE = 11

/**
 * The voltage across two terminals — circuitikz's `v=`.
 *
 * ```ts
 * voltage(pic, 'R1.in', 'R1.out', { label: '$u_R$' })
 * voltage(pic, a, b, { label: '$u$', curly: true })   // across an open pair
 * ```
 *
 * The arrow runs beside the segment, offset to `side` and inset at
 * both ends so it clears the terminals. `curly` swaps it for a brace,
 * which is what circuitikz reaches for when the span is a gap rather
 * than a component.
 */
export function voltage<S extends ShapeSet>(
  pic: Picture<S>,
  from: AnnotationEndpoint,
  to: AnnotationEndpoint,
  options: VoltageOptions = {}
): Picture<S> {
  const a = at(pic, from)
  const b = at(pic, to)
  const side = options.side ?? 'left'
  const distance = options.distance ?? VOLTAGE_DISTANCE
  const inset = options.inset ?? 4

  const { unit, normal } = frame(a, b, side)
  if (!unit) return pic

  const start = a.add(unit.scale(inset)).add(normal.scale(distance))
  const end = b.add(unit.scale(-inset)).add(normal.scale(distance))

  if (options.curly) {
    // bracePath's own 'left'/'right' is relative to the same travel
    // direction, so the side name passes straight through.
    pic.draw(bracePath(start, end, options.amplitude ?? 8, side), {
      style: options.style,
    })
  } else {
    const [tail, head] = options.sense === 'reverse' ? [end, start] : [start, end]
    pic.edge(tail, head, {
      arrowStart: 'none',
      arrowEnd: options.arrow ?? 'stealth',
    }, { style: options.style })
  }

  label(pic, a.midpoint(b).add(normal.scale(distance + (options.labelDistance ?? LABEL_DISTANCE))), options)
  return pic
}

/**
 * The current through a wire — circuitikz's `i=`, and its `f=` when
 * you give it a `distance` to sit off the wire.
 *
 * ```ts
 * current(pic, 'V1.out', 'R1.in', { label: '$i_1$' })
 * current(pic, a, b, { label: '$i$', distance: 10 })   // circuitikz f=
 * ```
 *
 * A short arrow along the segment rather than spanning it, because it
 * marks a direction rather than measuring an interval.
 */
export function current<S extends ShapeSet>(
  pic: Picture<S>,
  from: AnnotationEndpoint,
  to: AnnotationEndpoint,
  options: CurrentOptions = {}
): Picture<S> {
  const a = at(pic, from)
  const b = at(pic, to)
  const side = options.side ?? 'left'
  const distance = options.distance ?? CURRENT_DISTANCE
  const length = options.length ?? 18

  const { unit, normal } = frame(a, b, side)
  if (!unit) return pic

  const middle = a.add(b.sub(a).scale(options.pos ?? 0.5)).add(normal.scale(distance))
  const start = middle.add(unit.scale(-length / 2))
  const end = middle.add(unit.scale(length / 2))

  const [tail, head] = options.sense === 'reverse' ? [end, start] : [start, end]
  pic.edge(tail, head, {
    arrowStart: 'none',
    arrowEnd: options.arrow ?? 'stealth',
  }, { style: options.style })

  label(pic, middle.add(normal.scale(options.labelDistance ?? LABEL_DISTANCE)), options)
  return pic
}

/**
 * The travel direction and the normal pointing to `side` of it.
 * Screen space, so "left of travel" is visually above an eastward
 * segment. Returns a null `unit` for a zero-length span, which the
 * callers treat as nothing to annotate.
 */
function frame(a: Point, b: Point, side: AnnotationSide): { unit: Point | null; normal: Point } {
  const span = b.sub(a)
  const len = Math.hypot(span.x, span.y)
  if (len === 0) return { unit: null, normal: point(0, 0) }
  const unit = point(span.x / len, span.y / len)
  const left = point(unit.y, -unit.x)
  return { unit, normal: side === 'left' ? left : left.scale(-1) }
}

/** Place the annotation's text, if it has any. */
function label<S extends ShapeSet>(pic: Picture<S>, at: Point, options: AnnotationOptions): void {
  if (options.label === undefined) return
  pic.text(at, options.label, {
    fontSize: options.fontSize ?? FONT_SIZE,
    textAnchor: 'middle',
    dominantBaseline: 'middle',
    style: options.style,
  })
}

/** Resolve an endpoint to a point in the picture's coordinates. */
function at<S extends ShapeSet>(pic: Picture<S>, spec: AnnotationEndpoint): Point {
  return typeof spec === 'string' ? pic.resolve(spec) : point(spec.x, spec.y)
}

/** Accepts the same specs {@link wire} does, narrowed to what resolves to a point. */
export type { PictureEndpoint }
