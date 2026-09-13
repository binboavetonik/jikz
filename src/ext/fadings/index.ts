/**
 * Fadings — jikz's analogue of PGF's `fadings` library, which supplies
 * the opacity masks TikZ's `path fading` and `scope fading` apply.
 *
 * PGF builds a fading from a picture and reads its *luminance* as
 * alpha: `pgftransparent!0` is white and stays opaque, `!100` is black
 * and vanishes. SVG masks follow the same rule, so each fading below
 * is the gradient that paints one.
 *
 * ```ts
 * pic.fill(rect(0, 0, 200, 120), {
 *   style: { fill: '#2563eb', fading: fadings.east },
 * })
 *
 * // TikZ's scope fading — everything inside fades together.
 * pic.scope({ fading: circleFading(20) }, (s) => { … })
 * ```
 *
 * **The names say where the picture disappears**, matching PGF:
 * `east` is opaque at the west edge and gone by the east one.
 *
 * Two limits worth knowing. TikZ's `fit fading=false`, which centres a
 * fading without resizing it, has no equivalent here — the mask is
 * fitted to each element's bounding box (its `fit fading=true`
 * default), because an unfitted mask would have to be rebuilt per
 * element rather than shared as a def. And `\tikzfadingfrompicture`,
 * which turns an arbitrary drawing into a mask, is not supported;
 * every fading is a gradient, which is what all of PGF's own are.
 */
import type { GradientSpec } from '../../render/Gradient'
import type { FadingSpec } from '../../render/StyleMapper'

/** PGF's `pgftransparent!0` — fully opaque. */
export const FADE_OPAQUE = '#ffffff'

/** PGF's `pgftransparent!100` — fully transparent. */
export const FADE_TRANSPARENT = '#000000'

/**
 * Where PGF's axial fadings hold full opacity and full transparency:
 * flat for the first and last quarter, ramping across the middle half.
 */
const AXIAL_STOPS = [
  { offset: 0, color: FADE_OPAQUE },
  { offset: 0.25, color: FADE_OPAQUE },
  { offset: 0.75, color: FADE_TRANSPARENT },
  { offset: 1, color: FADE_TRANSPARENT },
]

/**
 * A fading that ramps along `angle` — PGF's four axial fadings, and
 * the general form of TikZ's `fading angle`.
 *
 * Angles are jikz's usual screen degrees for gradients (0 = east,
 * 90 = up), and name the direction the picture fades *towards*.
 */
export function axialFading(angle: number): FadingSpec {
  return { gradient: { type: 'linear', angle, stops: AXIAL_STOPS } }
}

/**
 * PGF's radial fadings sit on a 100bp canvas: the shading runs out to
 * 50bp, and the circle's edge is at 25bp — half way. So the edge is at
 * offset `0.5`, and the fuzzy band is the last `percent` of the way
 * out to it.
 */
function circleEdgeOffset(percent: number): number {
  return 0.5 * (1 - Math.min(Math.max(percent, 0), 100) / 100)
}

/**
 * A disc that dissolves at its rim — PGF's `circle with fuzzy edge
 * <percent> percent`, which ships at 10, 15 and 20.
 *
 * The disc covers the middle half of the bounding box; `percent` is
 * how much of its radius the fade eats into.
 */
export function circleFading(fuzzyPercent: number): FadingSpec {
  const inner = circleEdgeOffset(fuzzyPercent)
  return {
    gradient: {
      type: 'radial',
      stops: [
        { offset: 0, color: FADE_OPAQUE },
        { offset: inner, color: FADE_OPAQUE },
        { offset: 0.5, color: FADE_TRANSPARENT },
        { offset: 1, color: FADE_TRANSPARENT },
      ],
    },
  }
}

/**
 * An annulus that dissolves on both sides — PGF's `fuzzy ring
 * <percent> percent`, which ships at 15. The ring peaks halfway across
 * the band that {@link circleFading} would have faded.
 */
export function ringFading(fuzzyPercent: number): FadingSpec {
  const inner = circleEdgeOffset(fuzzyPercent)
  const peak = (inner + 0.5) / 2
  return {
    gradient: {
      type: 'radial',
      stops: [
        { offset: 0, color: FADE_TRANSPARENT },
        { offset: inner, color: FADE_TRANSPARENT },
        { offset: peak, color: FADE_OPAQUE },
        { offset: 0.5, color: FADE_TRANSPARENT },
        { offset: 1, color: FADE_TRANSPARENT },
      ],
    },
  }
}

/**
 * The fadings PGF predeclares, under the names it declares them with.
 * Each one names the direction the picture fades *towards*.
 */
export const fadings = {
  east: axialFading(0),
  west: axialFading(180),
  north: axialFading(90),
  south: axialFading(270),
  'circle with fuzzy edge 10 percent': circleFading(10),
  'circle with fuzzy edge 15 percent': circleFading(15),
  'circle with fuzzy edge 20 percent': circleFading(20),
  'fuzzy ring 15 percent': ringFading(15),
} as const

/** The names in {@link fadings}. */
export type FadingName = keyof typeof fadings

/** Re-exported so a fading can be typed without reaching into the renderer. */
export type { FadingSpec, GradientSpec }
