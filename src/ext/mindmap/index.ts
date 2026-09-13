/**
 * Mind maps — jikz's analogue of TikZ's `mindmap` library.
 *
 * TikZ builds one out of `concept` nodes (circles filled and stroked in
 * a concept colour) joined by the `circle connection bar` decoration,
 * with per-level sizes, distances and sibling angles laid out radially
 * by the `trees` machinery.
 *
 * {@link mindmap} does the layout and hands back plain values — where
 * each concept sits, how big it is, and a fillable {@link Path} per
 * link — so drawing stays yours:
 *
 * ```ts
 * const m = mindmap(
 *   { text: 'Root', color: '#1d4ed8', children: [{ text: 'A' }, { text: 'B' }] },
 *   { at: point(250, 200), levels: smallConceptLevels }
 * )
 * for (const bar of m.bars) pic.fill(bar.path, { style: { fill: bar.color } })
 * for (const c of m.concepts) {
 *   pic.fill(circle(c.center, c.radius), { style: { fill: c.color } })
 *   pic.text(c.center, c.text ?? '', { fontSize: 11 })
 * }
 * ```
 *
 * Bars go down before circles: TikZ fills them with the concept colour
 * and never strokes them, so they are meant to disappear under the
 * circles they join.
 *
 * Sizes are TikZ's own, converted from cm — which makes the default
 * mind map large (a 4cm root is 114 units across). {@link
 * smallConceptLevels} is its `small mindmap`, and any level can be
 * overridden per concept.
 *
 * Not ported: `circle connection bar switch color`, which shades a bar
 * from one concept colour to the next. The bar is an ordinary path, so
 * `style: { gradient: … }` gets you there without a dedicated key.
 */
import { Point, point, polar } from '../../core/Point'
import type { PointLike } from '../../core/types'
import type { Path } from '../../path/Path'
import { circleConnectionBar, type ConnectionBarOptions } from './bar'

export {
  circleConnectionBar,
  connectionBarMidpoint,
  CONNECTION_ANGLE_DEFAULT,
  AMPLITUDE_RATIO,
} from './bar'
export type { ConnectionBarOptions } from './bar'

/** TeX points per centimetre (72.27 pt / 2.54 cm). */
const PT_PER_CM = 72.27 / 2.54

/** What one level of a mind map looks like — TikZ's `level N concept`. */
export interface ConceptLevel {
  /** TikZ's `minimum size`: the circle's diameter. */
  size: number
  /** TikZ's `level distance` from the parent. The root has none. */
  distance?: number
  /** TikZ's `text width`. */
  textWidth: number
  /** TikZ's `sibling angle`: the spread between this level's siblings. */
  siblingAngle?: number
}

const cm = (n: number) => n * PT_PER_CM

/**
 * TikZ's default `mindmap` levels — `root concept` through
 * `level 4 concept`, in points. Deeper levels reuse the last entry, as
 * TikZ's own `level 3`/`level 4` styles do in `small mindmap`.
 */
export const conceptLevels: readonly ConceptLevel[] = [
  { size: cm(4), textWidth: cm(3.5) },
  { size: cm(2.25), distance: cm(5), textWidth: cm(2), siblingAngle: 60 },
  { size: cm(1.75), distance: cm(2.9), textWidth: cm(1.5), siblingAngle: 60 },
  { size: cm(1.15), distance: cm(2.4), textWidth: cm(1), siblingAngle: 30 },
  { size: cm(0.9), distance: cm(1.85), textWidth: cm(0.7), siblingAngle: 30 },
]

/** TikZ's `small mindmap` levels. */
export const smallConceptLevels: readonly ConceptLevel[] = [
  { size: cm(2.3), textWidth: cm(2.1) },
  { size: cm(1.5), distance: cm(2.8), textWidth: cm(1.4), siblingAngle: 75 },
  { size: cm(1.1), distance: cm(2.2), textWidth: cm(1.1), siblingAngle: 60 },
  { size: cm(1.1), distance: cm(2.2), textWidth: cm(1.1), siblingAngle: 30 },
]

/** TikZ's `concept color`, which is plain black until you set one. */
export const CONCEPT_COLOR_DEFAULT = '#000000'

/** Where the root's first branch points, if you do not say. */
export const MINDMAP_START_ANGLE_DEFAULT = -90

/** One concept in the tree you hand to {@link mindmap}. */
export interface Concept {
  text?: string
  /** TikZ's `concept color`. Inherited by descendants that set none. */
  color?: string
  children?: readonly Concept[]
  /** Point this subtree in a specific direction instead of the spread. */
  angle?: number
  /** Override the level's `minimum size`. */
  size?: number
  /** Override the level's `level distance`. */
  distance?: number
  /** Override the level's `sibling angle` for *this* concept's children. */
  siblingAngle?: number
}

/** A concept with a place on the canvas. */
export interface PlacedConcept {
  readonly text?: string
  readonly color: string
  readonly center: Point
  readonly radius: number
  readonly textWidth: number
  /** 0 for the root. */
  readonly level: number
  /** The direction this concept grew from its parent; the root's start angle. */
  readonly heading: number
  readonly children: readonly PlacedConcept[]
}

/** One parent→child link, ready to fill. */
export interface MindmapBar {
  readonly from: PlacedConcept
  readonly to: PlacedConcept
  readonly path: Path
  /** The child's concept colour, which is what TikZ fills a bar with. */
  readonly color: string
}

/** Options for {@link mindmap}. */
export interface MindmapOptions {
  /** Where the root goes. Default: the origin. */
  at?: PointLike
  /** Level table. Default {@link conceptLevels}. */
  levels?: readonly ConceptLevel[]
  /**
   * Direction of the root's first branch; siblings spread around it.
   * Default {@link MINDMAP_START_ANGLE_DEFAULT} (up).
   */
  startAngle?: number
  /** Concept colour for anything that names none. */
  color?: string
  /** Passed through to {@link circleConnectionBar}. */
  bar?: ConnectionBarOptions
}

/** A laid-out mind map. */
export interface Mindmap {
  readonly root: PlacedConcept
  /** Every concept, parents before their children. */
  readonly concepts: readonly PlacedConcept[]
  /** One bar per link, in the same order — so paint order is top-down. */
  readonly bars: readonly MindmapBar[]
}

/** The level's settings, with deeper levels reusing the last row. */
function levelAt(levels: readonly ConceptLevel[], level: number): ConceptLevel {
  return levels[Math.min(level, levels.length - 1)]!
}

/**
 * Angles for `count` siblings spread `spread` degrees apart, centred on
 * `around` — TikZ's `sibling angle`. A lone child carries straight on.
 */
function siblingAngles(count: number, spread: number, around: number): number[] {
  return Array.from({ length: count }, (_, i) => around + (i - (count - 1) / 2) * spread)
}

/**
 * Lay out a mind map: place every concept radially and build a bar for
 * every link. See the module docs for the drawing idiom.
 */
export function mindmap(root: Concept, options: MindmapOptions = {}): Mindmap {
  const levels = options.levels ?? conceptLevels
  const at = options.at ?? { x: 0, y: 0 }
  const startAngle = options.startAngle ?? MINDMAP_START_ANGLE_DEFAULT
  const fallbackColor = options.color ?? CONCEPT_COLOR_DEFAULT

  const concepts: PlacedConcept[] = []

  function place(
    concept: Concept,
    center: Point,
    level: number,
    heading: number,
    inheritedColor: string
  ): PlacedConcept {
    const spec = levelAt(levels, level)
    const color = concept.color ?? inheritedColor
    const radius = (concept.size ?? spec.size) / 2

    const children: PlacedConcept[] = []
    const placed: PlacedConcept = {
      text: concept.text,
      color,
      center,
      radius,
      textWidth: spec.textWidth,
      level,
      heading,
      children,
    }
    concepts.push(placed)

    const kids = concept.children ?? []
    if (kids.length > 0) {
      const childLevel = levelAt(levels, level + 1)
      const spread = concept.siblingAngle ?? childLevel.siblingAngle ?? 60
      const spans = siblingAngles(kids.length, spread, heading)

      kids.forEach((kid, i) => {
        const angle = kid.angle ?? spans[i]!
        const distance = kid.distance ?? childLevel.distance ?? childLevel.size
        children.push(
          place(kid, center.add(polar(angle, distance)), level + 1, angle, color)
        )
      })
    }

    return placed
  }

  const placedRoot = place(root, point(at.x, at.y), 0, startAngle, fallbackColor)

  // Bars in a second pass over the placed tree, so they come out in the
  // same top-down order as `concepts` and paint that way.
  const bars: MindmapBar[] = []
  function link(parent: PlacedConcept): void {
    for (const child of parent.children) {
      bars.push({
        from: parent,
        to: child,
        color: child.color,
        path: circleConnectionBar(
          parent.center,
          parent.radius,
          child.center,
          child.radius,
          options.bar
        ),
      })
      link(child)
    }
  }
  link(placedRoot)

  return { root: placedRoot, concepts, bars }
}
