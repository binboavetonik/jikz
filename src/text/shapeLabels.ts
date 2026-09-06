/**
 * Shape- and path-relative label placement — the machinery behind
 * draw-verb labels (`pic.draw(shape, { label })`) and Pen labels.
 * Point-based placement lives in `./placeText`; this module adds
 * anchors (shapes) and path parameters (lines/arcs/paths).
 */
import { Point, point } from '../core/Point'
import {
  isTextAnchor,
  parseAnchorSpec,
  anchorOnRect,
  type Anchorable,
} from '../core/Anchor'
import { degToRad } from '../utils/math'
import { Rotated } from '../geometry/Rotated'
import { Circle } from '../geometry/Circle'
import type { Renderable } from '../render/Renderer'
import type { NodeLabel } from '../node/Node'
import {
  DEFAULT_LABEL_DISTANCE,
  DEFAULT_LABEL_FONT_SIZE,
  estimateLabelSize,
} from './placeText'

/**
 * Label spec for the draw verbs and the pen: the shared
 * {@link NodeLabel} vocabulary (anchor placement via
 * `at`/`distance`/`frame`) plus PATH-RELATIVE placement —
 * `{ pos: 0.5, offset: 8 }` is TikZ's `node[midway, above]`: the label
 * sits on the shape at parameter `pos` ∈ [0,1], pushed `offset` px to
 * the LEFT of the travel direction (matching Edge's
 * labelPos/labelOffset; negative flips sides, and arcs travel in their
 * sweep direction). Requires a t-parameterized renderable (Line, Arc,
 * Path); Circle's pointAt is angle-based — use `{ at: <angle> }`
 * there instead.
 */
export type DrawLabel = NodeLabel & {
  /** Path parameter t ∈ [0,1] — TikZ `pos=`. When set, `at`/`distance`/`frame` are ignored. */
  pos?: number
  /** Perpendicular offset, px left of travel (TikZ `auto=left`). Default: 5 (Edge's labelOffset default). */
  offset?: number
}

/**
 * Anchorable view of a renderable: native anchors when the object has
 * them (every Shape does), a Point anchors to itself, anything else
 * (Path, …) anchors against its bounding box.
 */
export function asAnchorable(obj: Renderable): Anchorable {
  if (typeof (obj as Anchorable).anchor === 'function') return obj as Anchorable
  if (obj instanceof Point) return { center: obj, anchor: () => obj }
  const b = (obj as { bounds: [number, number, number, number] }).bounds
  const center = point((b[0] + b[2]) / 2, (b[1] + b[3]) / 2)
  return {
    center,
    anchor: (spec) => anchorOnRect(center, b[2] - b[0], b[3] - b[1], spec),
  }
}

/**
 * Path-relative label placement (TikZ `node[pos=t]`): the point on the
 * shape at parameter t, pushed `offset` px to the left of travel —
 * mirrors Edge.labelPoint's math (left = tangent − 90°, screen
 * convention). Tangent comes from `tangentAt` when the shape provides
 * it (Line), else a numeric derivative over `pointAt` (Arc, Path).
 */
export function pathLabelPoint(obj: Renderable, label: DrawLabel): Point {
  if (obj instanceof Circle) {
    throw new Error(
      `draw label: 'pos' needs a t-parameterized path, but Circle.pointAt ` +
        `is angle-based — place with { at: <angle> } instead.`
    )
  }
  const pointAt = (obj as { pointAt?: (t: number) => Point }).pointAt
  if (typeof pointAt !== 'function') {
    throw new Error(
      `draw label: 'pos' requires a path-like renderable with pointAt ` +
        `(Line, Arc, Path) — got ${(obj as { kind?: string }).kind ?? 'unknown'}.`
    )
  }
  const t = label.pos ?? 0.5
  const offset = label.offset ?? 5
  const p = pointAt.call(obj, t)
  const tangentAt = (obj as { tangentAt?: (t: number) => number }).tangentAt
  const tangent =
    typeof tangentAt === 'function'
      ? tangentAt.call(obj, t)
      : pointAt
          .call(obj, Math.max(0, t - 1e-3))
          .angleTo(pointAt.call(obj, Math.min(1, t + 1e-3)))
  const rad = degToRad(tangent - 90)
  return point(p.x + offset * Math.cos(rad), p.y + offset * Math.sin(rad))
}

/**
 * Resolved center for a draw-verb label: `at` selects the shape's
 * anchor as the reference point, and the text box is pushed outward
 * along the same direction by `distance` (border-to-border gap) —
 * placeText() from a shape anchor instead of a bare point.
 *
 * Frame semantics (see {@link NodeLabel.frame}):
 *   - 'screen' (default): screen-absolute direction from the shape as
 *     drawn — TikZ's page-frame nodes on `\draw` paths. Named specs
 *     resolve to their screen angle; the reference is the border point
 *     along that ray.
 *   - 'local': meaningful only for Rotated wrapper shapes — anchor and
 *     push ray follow the shape's unrotated frame, like node labels on
 *     a rotated node. Plain geometry carries no rotation state, so
 *     'local' coincides with 'screen' there.
 */
export function shapeLabelPoint(obj: Renderable, label: DrawLabel): Point {
  if (label.pos !== undefined) return pathLabelPoint(obj, label)
  const spec = label.at ?? 'north'
  if (isTextAnchor(spec)) {
    throw new Error(
      `draw label: '${spec}' is a text anchor and cannot position a ` +
        `label — use a cardinal name, alias, angle, or 'center'.`
    )
  }
  const angle = parseAnchorSpec(spec)
  const anchorable = asAnchorable(obj)
  if (angle === null) return anchorable.anchor('center')

  const fontSize = label.options?.fontSize ?? DEFAULT_LABEL_FONT_SIZE
  const { width, height } = estimateLabelSize(label.text, {
    fontSize,
    fontFamily: label.options?.fontFamily,
  })
  const gap = label.distance ?? DEFAULT_LABEL_DISTANCE

  const rad = degToRad(angle)
  let dx = Math.cos(rad)
  let dy = Math.sin(rad)
  let base: Point
  if (label.frame === 'local' && obj instanceof Rotated) {
    // Mirror Node.labelPoint's local frame: anchor on the unrotated
    // base shape, then rotate base and push direction by the angle.
    base = obj.base.anchor(spec).rotateAround(obj.center, obj.angle)
    const dir = point(dx, dy).rotate(obj.angle)
    dx = dir.x
    dy = dir.y
  } else {
    // Numeric anchors are screen-absolute border points by convention
    // (Rotated routes them through boundaryPoint; plain shapes too).
    base = anchorable.anchor(angle)
  }

  const halfAlongRay = (Math.abs(dx) * width + Math.abs(dy) * height) / 2
  const d = gap + halfAlongRay
  return point(base.x + dx * d, base.y + dy * d)
}
