/**
 * Shapes and footprints along a path — TikZ's `decorations.shapes`
 * and `decorations.footprints`, on top of {@link markPath}: the guide
 * path is kept and the decoration is a set of marks riding it, which
 * is also how TikZ builds them (a repeated shape at a fixed step; two
 * feet alternating sides). Both return a {@link MarkedPath} for any
 * draw verb.
 */
import { Path } from './Path'
import { toPath, type PathLike } from './PathLike'
import { markPath, type MarkSpec, type MarkedPath } from './MarkedPath'
import { pt } from '../core/units'

export interface ShapesAlongPathOptions {
  /** The shape: an arrow-tip name, a plot mark, or custom artwork (`markPath`'s vocabulary). */
  shape: MarkSpec
  /** Distance between shapes along the path, px (TikZ `shape sep`, default 4pt + shape width). */
  sep?: number
  /** Scale of the artwork (TikZ `shape size` relative to the mark's own size). */
  scale?: number
  /** Skip the shapes at the very start and end (TikZ places them; default false). */
  trim?: boolean
}

/**
 * TikZ `decoration={shapes}`: one shape every `sep` px along the
 * guide, from its start to its end.
 */
export function shapesAlongPath(guide: PathLike, options: ShapesAlongPathOptions): MarkedPath {
  const path = toPath(guide)
  const length = path.length
  const sep = options.sep ?? pt(4) + 5
  if (length <= 0) return markPath(path, { mark: options.shape, at: [0], scale: options.scale })
  const step = sep / length
  const from = options.trim ? step : 0
  const to = options.trim ? 1 - step : 1
  return markPath(path, { mark: options.shape, between: [from, to], step, scale: options.scale })
}

export type FootKind = 'human' | 'bird' | 'gnome'

/** Foot outlines pointing +x, 10 units long, centred on the origin — TikZ's `foot of`. */
export const FOOT_ARTWORK: Record<FootKind, string> = {
  // A sole with a rounded heel and a broader ball, plus a big toe.
  human: 'M -5 -1.6 C -5 -3.2 -3 -3 -1.5 -2.6 C 0.5 -2 2.5 -2.4 3.6 -1.4 C 4.6 -0.4 5 1.2 3.6 2 C 2.4 2.7 0.6 2.4 -1 2.5 C -3 2.6 -5 2 -5 -1.6 Z M 3.7 -2.6 A 1.1 1.1 0 1 1 3.7 -2.61 Z',
  // Three toes and a heel spur.
  bird: 'M -3 0 L 5 0 M -3 0 L 4 -3.5 M -3 0 L 4 3.5 M -3 0 L -5 0',
  // A stubby boot.
  gnome: 'M -5 -2 L 2 -2 C 4.5 -2 5 0 5 1 C 5 2 4 2.4 2 2.4 L -5 2.4 Z',
}

export interface FootprintsOptions {
  /** Foot outline: `'human'` (default), `'bird'`, `'gnome'`, or your own path data pointing +x. */
  foot?: FootKind | string
  /** Foot length, px (TikZ `foot length`, default 10pt). */
  footLength?: number
  /** Distance between two prints on the same side, px (TikZ `stride length`, default 30pt). */
  stride?: number
  /** Double the distance between a print and the path, px (TikZ `foot sep`, default 4pt). */
  sep?: number
  /** Toe-out angle of each print, degrees (TikZ `foot angle`, default 10). */
  angle?: number
}

/**
 * TikZ `decoration={footprints}`: prints every half stride, alternating
 * left and right of the path, each toed out by `angle`.
 */
export function footprints(guide: PathLike, options: FootprintsOptions = {}): MarkedPath {
  const path = toPath(guide)
  const length = path.length
  const footLength = options.footLength ?? pt(10)
  const stride = options.stride ?? pt(30)
  const sep = options.sep ?? pt(4)
  const angle = options.angle ?? 10
  const d = options.foot === undefined ? FOOT_ARTWORK.human : (FOOT_ARTWORK[options.foot as FootKind] ?? options.foot)
  const filled = !(options.foot === 'bird')
  const scale = footLength / 10
  // Left prints sit at +sep/2 across the path (left of travel is −y in
  // artwork space, since marks rotate with the tangent), right at −sep/2;
  // each is rotated ±angle. The artwork is pre-rotated so one MarkSpec
  // per side suffices.
  const rotated = (deg: number) => new Path(parseSegments(d)).rotate(deg).toSVGPath()
  const half = stride / 2 / Math.max(length, 1e-9)
  const positions = (offset: number) => {
    const out: number[] = []
    for (let t = offset; t <= 1 + 1e-9; t += 2 * half) out.push(Math.min(1, t))
    return out
  }
  return markPath(
    path,
    { mark: { d: rotated(-angle), filled, strokeWidth: 1, refX: 0, refY: sep / 2 / scale }, at: positions(0), scale },
    { mark: { d: rotated(angle), filled, strokeWidth: 1, refX: 0, refY: -sep / 2 / scale }, at: positions(half), scale }
  )
}

// Local import to avoid a cycle through the path barrel.
import { parsePathData } from './svgPath'
function parseSegments(d: string) {
  return parsePathData(d)
}
