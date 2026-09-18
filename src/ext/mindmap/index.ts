/**
 * Mind maps — jikz's analogue of TikZ's `mindmap` library.
 *
 * TikZ's mindmap is a style pack over trees: `concept` nodes are
 * filled circles whose size, text width, font and distance from the
 * parent come from the level (`root concept` 4cm, `level 1 concept`
 * 2.25cm at 5cm, …), children fan out at a `sibling angle`, and the
 * connection between two concepts is the `circle connection bar` — a
 * bar as wide as the circles allow, filled with a gradient from the
 * parent's `concept color` to the child's.
 *
 * ```ts
 * import { mindmap } from '@ozan.e/jikz/mindmap'
 *
 * mindmap(pic, {
 *   text: 'Computational\nComplexity', color: '#dc2626',
 *   children: [
 *     { text: 'Computational\nProblems', color: '#2563eb', children: [{ text: 'Problem\nMeasures' }, { text: 'Problem\nAspects' }] },
 *     { text: 'Computational\nModels', color: '#16a34a' },
 *   ],
 * }, { at: point(300, 260), scale: 0.5 })
 * ```
 */
import { Point, point, polar } from '../../core/Point'
import type { PointLike } from '../../core/types'
import { cm } from '../../core/units'
import { Circle } from '../../geometry/Circle'
import type { ShapeOptions } from '../../geometry/Shape'
import { defineShape, type ShapeSet } from '../../geometry/ShapeKind'
import type { ItemContainer, PictureItem } from '../../picture/Container'
import { Path, path } from '../../path/Path'
import type { LinearGradientSpec } from '../../render/Gradient'
import { mix } from '../../core/color'

const ORIGIN = { x: 0, y: 0 }

/** TikZ's per-level concept styles: `minimum size`, `level distance`, `sibling angle`, `text width`, font. */
export const CONCEPT_LEVELS = [
  { size: cm(4), distance: 0, siblingAngle: 360, textWidth: cm(3.5), fontSize: 16 },
  { size: cm(2.25), distance: cm(5), siblingAngle: 60, textWidth: cm(2), fontSize: 12 },
  { size: cm(1.75), distance: cm(2.9), siblingAngle: 60, textWidth: cm(1.5), fontSize: 11 },
  { size: cm(1.15), distance: cm(2.4), siblingAngle: 30, textWidth: cm(1), fontSize: 7 },
] as const

/** The `concept` shape: a circle (fill and draw take the concept colour). */
export const conceptShapes = {
  concept: defineShape('concept', (o: ShapeOptions) => new Circle(o.center ?? ORIGIN, Math.max(o.width ?? 0, o.height ?? 0) / 2)),
} as const satisfies ShapeSet

export interface ConceptSpec {
  text: string
  /** TikZ `concept color`; children inherit it unless they set their own. */
  color?: string
  children?: readonly ConceptSpec[]
  /** Explicit name for the node (default: derived from the text). */
  name?: string
}

export interface MindmapOptions {
  /** Where the root sits, in the picture's frame. */
  at: PointLike
  /** Direction of the first child of the root, degrees (screen convention). Default 90 (down on screen). */
  grow?: number
  /** Scale every TikZ length (sizes, distances) by this. Default 1. */
  scale?: number
  /** Override the per-level table. */
  levels?: readonly { size: number; distance: number; siblingAngle: number; textWidth: number; fontSize: number }[]
  /** Default concept colour (TikZ `concept color`). Default black. */
  color?: string
  /** Text colour on the concepts. Default white. */
  textColor?: string
}

/**
 * The `circle connection bar` between two concept circles: a bar whose
 * ends are chords of the circles and whose sides curve inward, as a
 * Path plus the gradient that paints it from `from` to `to`.
 */
export function connectionBar(
  a: { center: PointLike; radius: number },
  b: { center: PointLike; radius: number },
  colors: { from: string; to: string }
): { path: Path; gradient: LinearGradientSpec } {
  const A = point(a.center.x, a.center.y)
  const B = point(b.center.x, b.center.y)
  const theta = A.angleTo(B)
  const spread = 22 // half-angle of the chord at each end
  const a1 = A.add(polar(theta - spread, a.radius))
  const a2 = A.add(polar(theta + spread, a.radius))
  const b1 = B.add(polar(theta + 180 - spread, b.radius))
  const b2 = B.add(polar(theta + 180 + spread, b.radius))
  // Sides bow towards the centreline: control points a third of the way
  // along each side, pulled halfway to the A–B axis.
  const axis = (p: Point) => p.toward(p.project(A, B), 0.5)
  const c1 = axis(a2.toward(b1, 1 / 3))
  const c2 = axis(a2.toward(b1, 2 / 3))
  const c3 = axis(b2.toward(a1, 1 / 3))
  const c4 = axis(b2.toward(a1, 2 / 3))
  const bar = path().moveTo(a1).lineTo(a2).curveTo(c1, c2, b1).lineTo(b2).curveTo(c3, c4, a1).close()
  // Gradient along the bar: angle in gradient terms (0 = right, 90 = up).
  const angle = -theta
  return {
    path: bar,
    gradient: { type: 'linear', angle, stops: [{ offset: 0, color: colors.from }, { offset: 1, color: colors.to }] },
  }
}

const slug = (text: string) => text.replace(/\s+/g, ' ').trim()

/**
 * Lay out and draw a mind map: concepts as circles sized by level,
 * children fanned out at the level's sibling angle, and a connection
 * bar from each parent to each child. Returns the node names, level
 * by level, so you can address them afterwards.
 */
export function mindmap<S extends ShapeSet>(
  pic: ItemContainer<S>,
  root: ConceptSpec,
  options: MindmapOptions
): string[] {
  const levels = options.levels ?? CONCEPT_LEVELS
  const scale = options.scale ?? 1
  const textColor = options.textColor ?? '#ffffff'
  const names: string[] = []
  const bars: PictureItem[] = []
  const rootAt = pic.point(options.at)

  const place = (spec: ConceptSpec, level: number, at: Point, color: string, fromDir: number, parent?: { center: Point; radius: number; color: string }) => {
    const L = levels[Math.min(level, levels.length - 1)]!
    const size = L.size * scale
    const name = spec.name ?? slug(spec.text)
    names.push(name)
    pic.node(name, {
      at: pic.frame.unmap(at),
      shape: conceptShapes.concept,
      width: size,
      height: size,
      minWidth: 0,
      minHeight: 0,
      text: spec.text,
      textWidth: L.textWidth * scale,
      textStyle: { fontSize: Math.max(6, L.fontSize * scale), fill: textColor },
      style: { fill: color, stroke: color },
    })
    if (parent) {
      const { path: bar, gradient } = connectionBar(parent, { center: at, radius: size / 2 }, { from: parent.color, to: color })
      bars.push({ kind: 'bare', obj: bar, mode: 'fill', options: { style: { gradient } } })
    }
    const children = spec.children ?? []
    if (children.length === 0) return
    const next = levels[Math.min(level + 1, levels.length - 1)]!
    const distance = next.distance * scale
    const n = children.length
    // Root: all around (evenly when there are several); deeper: fanned
    // about the outward direction at the level's sibling angle.
    const total = level === 0 ? 360 : next.siblingAngle * (n - 1)
    const startAngle = level === 0 ? (options.grow ?? 90) : fromDir - total / 2
    const stepAngle = level === 0 ? 360 / n : next.siblingAngle
    children.forEach((child, i) => {
      const dir = startAngle + i * stepAngle
      const childAt = at.add(polar(dir, distance))
      const childColor = child.color ?? (level === 0 ? color : mix(color, '#ffffff', 0.7))
      place(child, level + 1, childAt, childColor, dir, { center: at, radius: size / 2, color })
    })
  }

  place(root, 0, rootAt, root.color ?? options.color ?? '#000000', options.grow ?? 90)
  // Bars paint under the concepts: insert them ahead of the nodes.
  pic.include(bars)
  return names
}
