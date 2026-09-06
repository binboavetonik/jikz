/**
 * Named style presets as frozen objects — the typed counterpart of
 * TikZ's option list. Instead of stringly-typed preset names, import
 * the objects directly; unknown names become import errors in JS and
 * compile errors in TS.
 *
 * Use them via the array form of `style` (TikZ's `[a, b, c]` rule —
 * later entries win):
 *
 *     import { thick, dashed, red } from 'jikz'
 *
 *     pic.draw(edge, { style: [thick, dashed, red] })
 *     pic.draw(edge, { style: [thick, { stroke: '#2563eb' }] })
 *
 * Names are camelCase versions of the TikZ preset names:
 * 'ultra thin' → ultraThin, 'densely dashed' → denselyDashed,
 * 'pattern north east lines' → patternNorthEastLines, etc.
 */

import type { RenderStyle } from './StyleMapper'
import { STYLE_PRESETS } from './StyleMapper'

const frozen = <T extends object>(o: T): Readonly<T> => Object.freeze(o)

// ── Line widths ──────────────────────────────────────────────────────────────
/** TikZ preset `ultra thin` — frozen; compose via the style array form. */
export const ultraThin = frozen(STYLE_PRESETS['ultra thin'])
/** TikZ preset `very thin` — frozen; compose via the style array form. */
export const veryThin = frozen(STYLE_PRESETS['very thin'])
/** TikZ preset `thin` — frozen; compose via the style array form. */
export const thin = frozen(STYLE_PRESETS.thin)
/** TikZ preset `semithick` — frozen; compose via the style array form. */
export const semithick = frozen(STYLE_PRESETS.semithick)
/** TikZ preset `thick` — frozen; compose via the style array form. */
export const thick = frozen(STYLE_PRESETS.thick)
/** TikZ preset `very thick` — frozen; compose via the style array form. */
export const veryThick = frozen(STYLE_PRESETS['very thick'])
/** TikZ preset `ultra thick` — frozen; compose via the style array form. */
export const ultraThick = frozen(STYLE_PRESETS['ultra thick'])

// ── Dash patterns ────────────────────────────────────────────────────────────
/** TikZ preset `solid` — frozen; compose via the style array form. */
export const solid = frozen(STYLE_PRESETS.solid)
/** TikZ preset `dashed` — frozen; compose via the style array form. */
export const dashed = frozen(STYLE_PRESETS.dashed)
/** TikZ preset `dotted` — frozen; compose via the style array form. */
export const dotted = frozen(STYLE_PRESETS.dotted)
/** TikZ preset `dashdotted` — frozen; compose via the style array form. */
export const dashdotted = frozen(STYLE_PRESETS.dashdotted)
/** TikZ preset `densely dashed` — frozen; compose via the style array form. */
export const denselyDashed = frozen(STYLE_PRESETS['densely dashed'])
/** TikZ preset `loosely dashed` — frozen; compose via the style array form. */
export const looselyDashed = frozen(STYLE_PRESETS['loosely dashed'])
/** TikZ preset `densely dotted` — frozen; compose via the style array form. */
export const denselyDotted = frozen(STYLE_PRESETS['densely dotted'])
/** TikZ preset `loosely dotted` — frozen; compose via the style array form. */
export const looselyDotted = frozen(STYLE_PRESETS['loosely dotted'])

// ── Stroke colors ────────────────────────────────────────────────────────────
/** TikZ preset `red` — frozen; compose via the style array form. */
export const red = frozen(STYLE_PRESETS.red)
/** TikZ preset `blue` — frozen; compose via the style array form. */
export const blue = frozen(STYLE_PRESETS.blue)
/** TikZ preset `green` — frozen; compose via the style array form. */
export const green = frozen(STYLE_PRESETS.green)
/** TikZ preset `orange` — frozen; compose via the style array form. */
export const orange = frozen(STYLE_PRESETS.orange)
/** TikZ preset `purple` — frozen; compose via the style array form. */
export const purple = frozen(STYLE_PRESETS.purple)
/** TikZ preset `black` — frozen; compose via the style array form. */
export const black = frozen(STYLE_PRESETS.black)
/** TikZ preset `gray` — frozen; compose via the style array form. */
export const gray = frozen(STYLE_PRESETS.gray)
/** TikZ preset `white` — frozen; compose via the style array form. */
export const white = frozen(STYLE_PRESETS.white)

// ── Fill colors ──────────────────────────────────────────────────────────────
/** TikZ preset `fill red` — frozen; compose via the style array form. */
export const fillRed = frozen(STYLE_PRESETS['fill red'])
/** TikZ preset `fill blue` — frozen; compose via the style array form. */
export const fillBlue = frozen(STYLE_PRESETS['fill blue'])
/** TikZ preset `fill green` — frozen; compose via the style array form. */
export const fillGreen = frozen(STYLE_PRESETS['fill green'])
/** TikZ preset `fill orange` — frozen; compose via the style array form. */
export const fillOrange = frozen(STYLE_PRESETS['fill orange'])
/** TikZ preset `fill purple` — frozen; compose via the style array form. */
export const fillPurple = frozen(STYLE_PRESETS['fill purple'])
/** TikZ preset `fill gray` — frozen; compose via the style array form. */
export const fillGray = frozen(STYLE_PRESETS['fill gray'])
/** TikZ preset `fill white` — frozen; compose via the style array form. */
export const fillWhite = frozen(STYLE_PRESETS['fill white'])

// ── Combined ─────────────────────────────────────────────────────────────────
/** TikZ preset `draw` — frozen; compose via the style array form. */
export const draw = frozen(STYLE_PRESETS.draw)
/** TikZ preset `fill only` — frozen; compose via the style array form. */
export const fillOnly = frozen(STYLE_PRESETS['fill only'])

// ── Fill patterns ────────────────────────────────────────────────────────────
/** TikZ preset `pattern horizontal lines` — frozen; compose via the style array form. */
export const patternHorizontalLines = frozen(STYLE_PRESETS['pattern horizontal lines'])
/** TikZ preset `pattern vertical lines` — frozen; compose via the style array form. */
export const patternVerticalLines = frozen(STYLE_PRESETS['pattern vertical lines'])
/** TikZ preset `pattern north east lines` — frozen; compose via the style array form. */
export const patternNorthEastLines = frozen(STYLE_PRESETS['pattern north east lines'])
/** TikZ preset `pattern north west lines` — frozen; compose via the style array form. */
export const patternNorthWestLines = frozen(STYLE_PRESETS['pattern north west lines'])
/** TikZ preset `pattern grid` — frozen; compose via the style array form. */
export const patternGrid = frozen(STYLE_PRESETS['pattern grid'])
/** TikZ preset `pattern crosshatch` — frozen; compose via the style array form. */
export const patternCrosshatch = frozen(STYLE_PRESETS['pattern crosshatch'])
/** TikZ preset `pattern dots` — frozen; compose via the style array form. */
export const patternDots = frozen(STYLE_PRESETS['pattern dots'])
/** TikZ preset `pattern crosshatch dots` — frozen; compose via the style array form. */
export const patternCrosshatchDots = frozen(STYLE_PRESETS['pattern crosshatch dots'])
/** TikZ preset `pattern fivepointed stars` — frozen; compose via the style array form. */
export const patternFivepointedStars = frozen(STYLE_PRESETS['pattern fivepointed stars'])
/** TikZ preset `pattern sixpointed stars` — frozen; compose via the style array form. */
export const patternSixpointedStars = frozen(STYLE_PRESETS['pattern sixpointed stars'])
/** TikZ preset `pattern bricks` — frozen; compose via the style array form. */
export const patternBricks = frozen(STYLE_PRESETS['pattern bricks'])
/** TikZ preset `pattern checkerboard` — frozen; compose via the style array form. */
export const patternCheckerboard = frozen(STYLE_PRESETS['pattern checkerboard'])

// ── Shadows ──────────────────────────────────────────────────────────────────
/** TikZ preset `shadow` — frozen; compose via the style array form. */
export const shadow = frozen(STYLE_PRESETS.shadow)
/** TikZ preset `shadow-sm` — frozen; compose via the style array form. */
export const shadowSm = frozen(STYLE_PRESETS['shadow-sm'])
/** TikZ preset `shadow-lg` — frozen; compose via the style array form. */
export const shadowLg = frozen(STYLE_PRESETS['shadow-lg'])

// ── Rounded corners ──────────────────────────────────────────────────────────
/** TikZ preset `rounded` — frozen; compose via the style array form. */
export const rounded = frozen(STYLE_PRESETS.rounded)
/** TikZ preset `rounded-sm` — frozen; compose via the style array form. */
export const roundedSm = frozen(STYLE_PRESETS['rounded-sm'])
/** TikZ preset `rounded-lg` — frozen; compose via the style array form. */
export const roundedLg = frozen(STYLE_PRESETS['rounded-lg'])
/** TikZ preset `rounded-xl` — frozen; compose via the style array form. */
export const roundedXl = frozen(STYLE_PRESETS['rounded-xl'])
/** TikZ preset `rounded-full` — frozen; compose via the style array form. */
export const roundedFull = frozen(STYLE_PRESETS['rounded-full'])

// ── Double line ──────────────────────────────────────────────────────────────
/** TikZ preset `double` — frozen; compose via the style array form. */
export const double = frozen(STYLE_PRESETS.double)

/** All preset objects, for introspection (e.g. building galleries). */
export const PRESET_OBJECTS = {
  ultraThin, veryThin, thin, semithick, thick, veryThick, ultraThick,
  solid, dashed, dotted, dashdotted,
  denselyDashed, looselyDashed, denselyDotted, looselyDotted,
  red, blue, green, orange, purple, black, gray, white,
  fillRed, fillBlue, fillGreen, fillOrange, fillPurple, fillGray, fillWhite,
  draw, fillOnly,
  patternHorizontalLines, patternVerticalLines,
  patternNorthEastLines, patternNorthWestLines,
  patternGrid, patternCrosshatch, patternDots, patternCrosshatchDots,
  patternFivepointedStars, patternSixpointedStars,
  patternBricks, patternCheckerboard,
  shadow, shadowSm, shadowLg,
  rounded, roundedSm, roundedLg, roundedXl, roundedFull,
  double,
} as const

export type { RenderStyle }
