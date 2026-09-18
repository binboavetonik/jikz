/**
 * The one label vocabulary.
 *
 * TikZ has a single `node[...]{text}` that hangs off a node
 * (`label=`), rides a path (`node[midway]`), or sits at a point. jikz
 * uses one {@link Label} type in every one of those places — node
 * `labels`, edge `labels`, the draw verbs' `label`/`labels`, the pen's
 * `.label()` — and one {@link TextStyle} wherever text is styled:
 * a label's `style`, a node's `textStyle`, `pic.text()`'s `style`, and
 * `every.text`.
 */
import type { AnchorSpec } from '../core/Anchor'
import type { RenderStyle, StyleSpec } from '../render/StyleMapper'

/** How a piece of text is set. TikZ: `text=`, `font=`. */
export interface TextStyle {
  /** Text colour. Absent, text follows the pen (the enclosing stroke). */
  fill?: string
  /** Font size, px. */
  fontSize?: number
  fontFamily?: string
  fontWeight?: 'normal' | 'bold' | number
}

/**
 * A label: text placed relative to something — a node's border, a
 * point on a path, or a reference point.
 *
 * Two placement modes, which are mutually exclusive:
 *
 * - **Anchored** (`at`, `distance`, `frame`): `at` is the direction
 *   from the reference — a compass name, alias or angle — and
 *   `distance` the border-to-border gap along it (TikZ
 *   `label=<angle>:<text>`, `label distance`). Nodes, shapes and the
 *   pen position use this.
 * - **Riding** (`pos`, `offset`): the label sits on the path at
 *   parameter `pos` ∈ [0, 1], pushed `offset` px to the LEFT of the
 *   travel direction (TikZ `node[pos=…, auto]`; negative flips sides).
 *   Edges, the draw verbs on path-like shapes and the pen's last
 *   operation use this; on an edge `pos` defaults to 0.5.
 */
export interface Label {
  /** Label text. `$...$` routes through the math renderer. */
  text: string
  /** Anchored placement: direction from the reference. Default: 'north'. */
  at?: AnchorSpec
  /** Anchored placement: border-to-border gap, px. */
  distance?: number
  /**
   * Which frame `at` is read in on a rotated node: `'local'` (default)
   * follows the node's rotation, `'screen'` is screen-absolute.
   */
  frame?: 'local' | 'screen'
  /** Riding placement: path parameter t ∈ [0, 1] — TikZ `pos=`. */
  pos?: number
  /** Riding placement: px left of travel (TikZ `auto=left`). Default: 5. */
  offset?: number
  /** This label's text style. */
  style?: TextStyle
  /**
   * Riding placement: rotate the text along the path's tangent (TikZ
   * `sloped`), flipped where needed so it never reads upside down.
   */
  sloped?: boolean
}

/**
 * A pin — TikZ `pin=<angle>:<text>`: a {@link Label} placed like a
 * label (default gap 12 px, TikZ `pin distance`) plus a thin line from
 * the node's border to the text (TikZ `pin edge`, default `help lines`).
 */
export interface Pin extends Label {
  /** Style of the connecting line; merged over the default thin grey. */
  edge?: StyleSpec
}

/** Default gap between a node's border and a pin's text, px. */
export const DEFAULT_PIN_DISTANCE = 12

/** TikZ `every pin edge` — `help lines`. */
export const DEFAULT_PIN_EDGE_STYLE: Readonly<Partial<RenderStyle>> = Object.freeze({
  stroke: '#9ca3af',
  strokeWidth: 0.6,
})

/** The angle text should be rotated by to lie along `tangent`, kept readable. */
export function readableAngle(tangent: number): number {
  let a = ((tangent % 360) + 360) % 360
  if (a > 90 && a < 270) a -= 180
  if (a >= 270) a -= 360
  return a
}

/** A label, or just its text. */
export type LabelSpec = string | Label

/** Normalise a {@link LabelSpec}. */
export function toLabel(spec: LabelSpec): Label {
  return typeof spec === 'string' ? { text: spec } : spec
}

/** Collect the `label` shorthand and the `labels` list into one array. */
export function labelList(
  label: LabelSpec | undefined,
  labels: readonly Label[] | undefined
): Label[] {
  const out: Label[] = []
  if (label !== undefined && label !== '') out.push(toLabel(label))
  if (labels) out.push(...labels)
  return out
}
