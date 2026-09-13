/**
 * Magnified insets — jikz's analogue of TikZ's `spy` library.
 *
 * TikZ collects a `spy scope`'s content into a box, then emits two
 * nodes per `\spy`: a **spy-on node** outlining the region being
 * magnified, carrying the *inverse* of the lens transform, and a
 * **spy-in node** whose `path picture` replays the whole box under the
 * lens, shifted so the spied point lands at its centre. `connect
 * spies` joins the two.
 *
 * jikz does the same thing without the box: a scope carries the lens
 * transform and clips to the inset, and {@link ItemContainer.adopt}
 * replays the container's already-built items into it.
 *
 * ```ts
 * // …draw the picture first…
 * spy(pic, { on: point(120, 80), at: point(320, 80), magnification: 4, size: 90 })
 * ```
 *
 * **Call it after drawing what you want magnified.** TikZ hides this
 * by deferring every `\spy` to the end of its scope; here the content
 * is whatever the container holds when `spy()` runs, unless you pass
 * `content` yourself.
 *
 * The relationship TikZ encodes with the inverse lens transform comes
 * out as plain arithmetic: an inset of `size` at magnification `m`
 * shows a region of `size / m`, so the outline on the original is that
 * much across.
 */
import { Point, point } from '../../core/Point'
import { Transform } from '../../core/Transform'
import type { PointLike } from '../../core/types'
import { Circle, circle } from '../../geometry/Circle'
import { line } from '../../geometry/Line'
import { Rectangle, rectFromCenter } from '../../geometry/Rectangle'
import type { ItemContainer, PictureItem } from '../../picture/Container'
import type { ClipSpec, StyleSpec } from '../../render/StyleMapper'

/**
 * PGF's named line widths, the two `spy using outlines` reaches for.
 * `very thin` is genuinely hair-fine; scale them up with `onStyle` if
 * your picture is drawn heavier.
 */
export const SPY_VERY_THIN = 0.2
/** PGF's `thick`. */
export const SPY_THICK = 0.8
/** PGF's `thin`, which `connect spies` draws with. */
export const SPY_THIN = 0.4

/** Default magnification. TikZ has none — its `lens` starts empty. */
export const SPY_MAGNIFICATION_DEFAULT = 3

/** Default inset extent. TikZ has none — `size` is `minimum size`. */
export const SPY_SIZE_DEFAULT = 60

/** Options for {@link spy}. */
export interface SpyOptions {
  /** The point to magnify — TikZ's `\spy on (coord)`. */
  on: PointLike
  /** Where the inset goes — the `at` of TikZ's `in node`. */
  at: PointLike
  /**
   * TikZ's `magnification`, its shorthand for `lens={scale=n}`.
   * Default {@link SPY_MAGNIFICATION_DEFAULT}.
   */
  magnification?: number
  /** TikZ's `size`. Default {@link SPY_SIZE_DEFAULT}. */
  size?: number
  /** TikZ's `width`, overriding `size`. */
  width?: number
  /** TikZ's `height`, overriding `size`. */
  height?: number
  /** Lens shape. A circle clips to a disc. Default `'rectangle'`. */
  lens?: 'rectangle' | 'circle'
  /** TikZ's `connect spies` — join the two with a line. Default `false`. */
  connect?: boolean
  /** TikZ's `every spy on node`; default `very thin, draw`. */
  onStyle?: StyleSpec
  /** TikZ's `every spy in node`; default `thick, draw`. */
  inStyle?: StyleSpec
  /** Style of the `connect spies` line; default `thin`. */
  connectStyle?: StyleSpec
  /**
   * What to magnify. Defaults to everything the container holds when
   * `spy()` is called.
   */
  content?: readonly PictureItem[]
}

/** The two regions a {@link spy} drew. */
export interface Spy {
  /** The region magnified, on the original — TikZ's `tikzspyonnode`. */
  readonly on: Rectangle | Circle
  /** The inset showing it — TikZ's `tikzspyinnode`. */
  readonly in: Rectangle | Circle
  /** The magnification actually used. */
  readonly magnification: number
  /** The lens transform: it carries `on` onto `in`. */
  readonly transform: Transform
}

/** A centred region of the requested shape. */
function region(
  center: Point,
  width: number,
  height: number,
  lens: 'rectangle' | 'circle'
): Rectangle | Circle {
  return lens === 'circle'
    ? circle(center, Math.min(width, height) / 2)
    : rectFromCenter(center, width, height)
}

/**
 * The clip that keeps the replay inside the lens, in the coordinates
 * the scope's own transform will scale.
 */
function clipOf(shape: Rectangle | Circle): ClipSpec {
  if (shape instanceof Circle) {
    return { shape: 'circle', cx: shape.center.x, cy: shape.center.y, r: shape.radius }
  }
  const [minX, minY, maxX, maxY] = shape.bounds
  return { shape: 'rect', x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

/**
 * Draw a magnified inset of `on` at `at` — TikZ's
 * `\spy [options] on (coord) in node [...];`
 *
 * Paints, in order: the outline on the original, the magnified replay,
 * the inset's frame, and the connecting line if asked for. Returns the
 * two regions so you can annotate either.
 */
export function spy(pic: ItemContainer, options: SpyOptions): Spy {
  const magnification = options.magnification ?? SPY_MAGNIFICATION_DEFAULT
  const inWidth = options.width ?? options.size ?? SPY_SIZE_DEFAULT
  const inHeight = options.height ?? options.size ?? SPY_SIZE_DEFAULT
  const lens = options.lens ?? 'rectangle'

  const on = point(options.on.x, options.on.y)
  const at = point(options.at.x, options.at.y)

  // An inset `size` across at magnification m shows `size / m` of the
  // original — the relationship TikZ gets by inverting the lens.
  const onRegion = region(on, inWidth / magnification, inHeight / magnification, lens)
  const inRegion = region(at, inWidth, inHeight, lens)

  // x ↦ m·(x − on) + at, so the spied point lands at the inset centre.
  const transform = Transform.identity()
    .translate(at.x, at.y)
    .scale(magnification)
    .translate(-on.x, -on.y)

  const content = options.content ?? [...pic.items]

  // The outline goes down first, so it sits under anything the inset
  // may overlap it with.
  pic.draw(onRegion, {
    style: { stroke: '#000000', strokeWidth: SPY_VERY_THIN, ...options.onStyle },
  })

  // The clip rides inside the group, so SVG resolves it in the scope's
  // own coordinates — the transform scales the clip along with the
  // content. Clipping to `onRegion` is therefore what lands the inset
  // exactly on `inRegion`: T(onRegion) === inRegion by construction.
  pic.scope({ transform, clip: clipOf(onRegion) }, (s) => {
    s.adopt(content)
  })

  pic.draw(inRegion, {
    style: { stroke: '#000000', strokeWidth: SPY_THICK, fill: 'none', ...options.inStyle },
  })

  // TikZ's `connect spies` draws (tikzspyonnode) -- (tikzspyinnode),
  // which it clips to both node borders; boundaryPoint does that here.
  if (options.connect) {
    const heading = onRegion.center.angleTo(inRegion.center)
    pic.draw(line(onRegion.boundaryPoint(heading), inRegion.boundaryPoint(heading + 180)), {
      style: { stroke: '#000000', strokeWidth: SPY_THIN, ...options.connectStyle },
    })
  }

  return { on: onRegion, in: inRegion, magnification, transform }
}
