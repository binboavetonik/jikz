/**
 * The `circle connection bar` decoration — the organic link between two
 * concept circles, and the piece of TikZ's mindmap library that has no
 * equivalent anywhere else.
 *
 * PGF declares it as a three-state decoration: a cap that flares out of
 * the start circle, a constant-height bar, and a mirrored cap flaring
 * into the end circle. It is filled with the concept colour and never
 * stroked, so it is one plain fillable {@link Path} here.
 */
import { Point, point, polar } from '../../core/Point'
import type { PointLike } from '../../core/types'
import { Path, path } from '../../path/Path'

/** PGF's `/pgf/decoration/angle`, the half-angle the cap spans on a rim. */
export const CONNECTION_ANGLE_DEFAULT = 20

/**
 * PGF's `\tikz@compute@segmentamplitude`: the bar's height is
 * `0.175 × min(startRadius, endRadius)`.
 */
export const AMPLITUDE_RATIO = 0.175

/** Options for {@link circleConnectionBar}. */
export interface ConnectionBarOptions {
  /** PGF's decoration `angle`. Default {@link CONNECTION_ANGLE_DEFAULT}. */
  angle?: number
  /**
   * Bar height. Defaults to PGF's
   * `{@link AMPLITUDE_RATIO} × min(fromRadius, toRadius)`.
   */
  amplitude?: number
}

/** Run several paths together as subpaths of one fillable path. */
function concat(...parts: readonly Path[]): Path {
  return new Path(parts.flatMap((part) => [...part.segments]))
}

/**
 * One cap, in the local frame where the circle's centre is the origin
 * and `+x` points along the bar. PGF builds both ends from this and
 * mirrors the second with `\pgftransformxscale{-1}`.
 */
function cap(r: number, amplitude: number, angle: number): Path {
  const half = amplitude / 2
  const top = polar(angle, r)
  const bottom = polar(-angle, r)

  return (
    path()
      .moveTo(top)
      // The near side of the rim, from +angle round to -angle. Screen
      // angles decrease here, so the sweep flag is 0.
      .circularArcTo(r, false, false, bottom)
      // Flare out to the bar's lower edge at 1.5r.
      .curveTo(
        bottom.add(polar(-angle + 90, 0.25 * r)),
        point(1.25 * r, -half),
        point(1.5 * r, -half)
      )
      .lineTo(point(1.5 * r, half))
      // ...and back up to where we started.
      .curveTo(
        point(1.25 * r, half),
        top.add(polar(angle - 90, 0.25 * r)),
        top
      )
      .close()
  )
}

/**
 * The bar joining two concept circles — PGF's
 * `to [circle connection bar]`.
 *
 * Fill it; never stroke it. The three subpaths abut rather than
 * overlap, so filling the whole path paints their union with no seam:
 *
 * ```ts
 * pic.fill(circleConnectionBar(a.center, a.radius, b.center, b.radius), {
 *   style: { fill: '#2563eb' },
 * })
 * ```
 *
 * Circles that actually overlap yield an empty path rather than a shape
 * turned inside out. Circles merely closer than the two flares want —
 * which TikZ's own `small mindmap` level 1 is — keep both flares and
 * drop the straight section between them, since PGF's bar rectangle
 * would have negative width there and the caps alone still read as a
 * link.
 */
export function circleConnectionBar(
  from: PointLike,
  fromRadius: number,
  to: PointLike,
  toRadius: number,
  options: ConnectionBarOptions = {}
): Path {
  const angle = options.angle ?? CONNECTION_ANGLE_DEFAULT
  const amplitude =
    options.amplitude ?? AMPLITUDE_RATIO * Math.min(fromRadius, toRadius)

  const start = point(from.x, from.y)
  const end = point(to.x, to.y)
  const distance = start.distanceTo(end)

  // Overlapping circles have no link to draw.
  if (distance <= fromRadius + toRadius) return path()

  const half = amplitude / 2
  const barStart = 1.5 * fromRadius
  const barEnd = distance - 1.5 * toRadius

  // PGF's bar rectangle runs between the flares; when they already meet
  // or overlap its width goes negative, so leave it out.
  const bar =
    barEnd > barStart
      ? [
          path()
            .moveTo(point(barStart, -half))
            .lineTo(point(barEnd, -half))
            .lineTo(point(barEnd, half))
            .lineTo(point(barStart, half))
            .close(),
        ]
      : []

  const local = concat(
    // Start cap, at the origin.
    cap(fromRadius, amplitude, angle),
    ...bar,
    // End cap, mirrored the way PGF mirrors it with xscale=-1.
    cap(toRadius, amplitude, angle).scale(-1, 1).translate(distance, 0)
  )

  return local.rotate(start.angleTo(end)).translate(start.x, start.y)
}

/** Where a concept's bar meets its rim — useful for labelling a link. */
export function connectionBarMidpoint(from: PointLike, to: PointLike): Point {
  return point((from.x + to.x) / 2, (from.y + to.y) / 2)
}
