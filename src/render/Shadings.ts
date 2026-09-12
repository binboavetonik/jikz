/**
 * Named shadings — TikZ's `\shade` vocabulary as plain gradient specs.
 *
 * TikZ shadings span the bounding box of the filled path; jikz's
 * gradients are already `objectBoundingBox`-relative, so these builders
 * are just ergonomic spec factories. The `shade()` picture verb and
 * `resolveShading` map the color keys (`left color`, `ball color`, …)
 * onto them.
 */

import {
  type GradientSpec,
  type GradientStop,
  type LinearGradientSpec,
  type RadialGradientSpec,
} from './Gradient'
import { hexToRgb, rgbToHex } from './StyleMapper'

/** Named shading kinds — TikZ `shading=axis|radial|ball`. */
export type ShadingName = 'axis' | 'radial' | 'ball'

/**
 * The shading keys accepted by `shade()` — either an explicit gradient
 * spec, or TikZ's color shorthands. The resolver precedence is:
 * `gradient` → `ballColor` → `inner`/`outerColor` → `left`/`rightColor`
 * → `top`/`bottomColor` → `shading` name → a default axis shading.
 */
export interface ShadingOptions {
  /** Explicit gradient spec — wins over every shorthand below. */
  gradient?: GradientSpec
  /** Named shading: `'axis'`, `'radial'`, or `'ball'`. */
  shading?: ShadingName
  /** `left color` — start of a left→right linear shading. */
  leftColor?: string
  /** `right color` — end of a left→right linear shading. */
  rightColor?: string
  /** `top color` — start of a top→bottom linear shading. */
  topColor?: string
  /** `bottom color` — end of a top→bottom linear shading. */
  bottomColor?: string
  /** `middle color` — optional middle stop for the linear shadings. */
  middleColor?: string
  /** `inner color` — center of a radial shading. */
  innerColor?: string
  /** `outer color` — edge of a radial shading. */
  outerColor?: string
  /** `ball color` — a 3D-ball radial shading (offset highlight). */
  ballColor?: string
}

/**
 * Lighten (`lighten: true`) or darken a color by `amount` (0–1). Only
 * hex colors are adjusted; anything else is returned unchanged so SVG
 * still renders it (as a flat stop).
 */
function tint(color: string, amount: number, lighten: boolean): string {
  const rgb = hexToRgb(color)
  if (!rgb) return color
  const f = (v: number) =>
    lighten
      ? Math.min(255, Math.round(v + (255 - v) * amount))
      : Math.max(0, Math.round(v * (1 - amount)))
  return rgbToHex(f(rgb.r), f(rgb.g), f(rgb.b))
}

function stops(from: string, to: string, middle?: string): GradientStop[] {
  const list: GradientStop[] = [{ offset: 0, color: from }]
  if (middle !== undefined) list.push({ offset: 0.5, color: middle })
  list.push({ offset: 1, color: to })
  return list
}

/**
 * Linear `axis` shading. `angle` is the gradient direction in the
 * library's screen convention: 0° = left→right (east), 90° = bottom→top
 * (north), 270° = top→bottom (south).
 */
export function axisShading(
  from: string,
  to: string,
  angle = 0,
  middle?: string
): LinearGradientSpec {
  return { type: 'linear', angle, stops: stops(from, to, middle) }
}

/** Radial shading from `inner` (center) to `outer` (edge). */
export function radialShading(inner: string, outer: string): RadialGradientSpec {
  return { type: 'radial', cx: 0.5, cy: 0.5, r: 0.5, stops: stops(inner, outer) }
}

/**
 * Ball shading — a radial gradient whose highlight is offset toward the
 * top-left (TikZ `ball color`), reading as a shaded sphere.
 */
export function ballShading(color: string): RadialGradientSpec {
  return {
    type: 'radial',
    cx: 0.5,
    cy: 0.5,
    r: 0.5,
    fx: 0.35,
    fy: 0.35,
    stops: [
      { offset: 0, color: tint(color, 0.6, true) },
      { offset: 0.4, color },
      { offset: 1, color: tint(color, 0.55, false) },
    ],
  }
}

/**
 * Turn {@link ShadingOptions} into a concrete {@link GradientSpec},
 * resolving the color-key shorthands in TikZ order.
 */
export function resolveShading(options: ShadingOptions = {}): GradientSpec {
  if (options.gradient) return options.gradient
  if (options.ballColor !== undefined) return ballShading(options.ballColor)
  if (options.innerColor !== undefined || options.outerColor !== undefined) {
    return radialShading(options.innerColor ?? '#ffffff', options.outerColor ?? '#000000')
  }
  if (options.leftColor !== undefined || options.rightColor !== undefined) {
    return axisShading(
      options.leftColor ?? '#ffffff',
      options.rightColor ?? '#000000',
      0,
      options.middleColor
    )
  }
  if (options.topColor !== undefined || options.bottomColor !== undefined) {
    return axisShading(
      options.topColor ?? '#ffffff',
      options.bottomColor ?? '#000000',
      270,
      options.middleColor
    )
  }
  if (options.shading === 'radial') return radialShading('#ffffff', '#000000')
  if (options.shading === 'ball') return ballShading('#000000')
  // Default: TikZ's axis shading (black at the bottom → white at the top).
  return axisShading('#000000', '#ffffff', 90)
}
