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
export const ultraThin = frozen(STYLE_PRESETS['ultra thin'])
export const veryThin = frozen(STYLE_PRESETS['very thin'])
export const thin = frozen(STYLE_PRESETS.thin)
export const semithick = frozen(STYLE_PRESETS.semithick)
export const thick = frozen(STYLE_PRESETS.thick)
export const veryThick = frozen(STYLE_PRESETS['very thick'])
export const ultraThick = frozen(STYLE_PRESETS['ultra thick'])

// ── Dash patterns ────────────────────────────────────────────────────────────
export const solid = frozen(STYLE_PRESETS.solid)
export const dashed = frozen(STYLE_PRESETS.dashed)
export const dotted = frozen(STYLE_PRESETS.dotted)
export const dashdotted = frozen(STYLE_PRESETS.dashdotted)
export const denselyDashed = frozen(STYLE_PRESETS['densely dashed'])
export const looselyDashed = frozen(STYLE_PRESETS['loosely dashed'])
export const denselyDotted = frozen(STYLE_PRESETS['densely dotted'])
export const looselyDotted = frozen(STYLE_PRESETS['loosely dotted'])

// ── Stroke colors ────────────────────────────────────────────────────────────
export const red = frozen(STYLE_PRESETS.red)
export const blue = frozen(STYLE_PRESETS.blue)
export const green = frozen(STYLE_PRESETS.green)
export const orange = frozen(STYLE_PRESETS.orange)
export const purple = frozen(STYLE_PRESETS.purple)
export const black = frozen(STYLE_PRESETS.black)
export const gray = frozen(STYLE_PRESETS.gray)
export const white = frozen(STYLE_PRESETS.white)

// ── Fill colors ──────────────────────────────────────────────────────────────
export const fillRed = frozen(STYLE_PRESETS['fill red'])
export const fillBlue = frozen(STYLE_PRESETS['fill blue'])
export const fillGreen = frozen(STYLE_PRESETS['fill green'])
export const fillOrange = frozen(STYLE_PRESETS['fill orange'])
export const fillPurple = frozen(STYLE_PRESETS['fill purple'])
export const fillGray = frozen(STYLE_PRESETS['fill gray'])
export const fillWhite = frozen(STYLE_PRESETS['fill white'])

// ── Combined ─────────────────────────────────────────────────────────────────
export const draw = frozen(STYLE_PRESETS.draw)
export const fillOnly = frozen(STYLE_PRESETS['fill only'])

// ── Fill patterns ────────────────────────────────────────────────────────────
export const patternHorizontalLines = frozen(STYLE_PRESETS['pattern horizontal lines'])
export const patternVerticalLines = frozen(STYLE_PRESETS['pattern vertical lines'])
export const patternNorthEastLines = frozen(STYLE_PRESETS['pattern north east lines'])
export const patternNorthWestLines = frozen(STYLE_PRESETS['pattern north west lines'])
export const patternGrid = frozen(STYLE_PRESETS['pattern grid'])
export const patternCrosshatch = frozen(STYLE_PRESETS['pattern crosshatch'])
export const patternDots = frozen(STYLE_PRESETS['pattern dots'])
export const patternCrosshatchDots = frozen(STYLE_PRESETS['pattern crosshatch dots'])
export const patternFivepointedStars = frozen(STYLE_PRESETS['pattern fivepointed stars'])
export const patternSixpointedStars = frozen(STYLE_PRESETS['pattern sixpointed stars'])
export const patternBricks = frozen(STYLE_PRESETS['pattern bricks'])
export const patternCheckerboard = frozen(STYLE_PRESETS['pattern checkerboard'])

// ── Shadows ──────────────────────────────────────────────────────────────────
export const shadow = frozen(STYLE_PRESETS.shadow)
export const shadowSm = frozen(STYLE_PRESETS['shadow-sm'])
export const shadowLg = frozen(STYLE_PRESETS['shadow-lg'])

// ── Rounded corners ──────────────────────────────────────────────────────────
export const rounded = frozen(STYLE_PRESETS.rounded)
export const roundedSm = frozen(STYLE_PRESETS['rounded-sm'])
export const roundedLg = frozen(STYLE_PRESETS['rounded-lg'])
export const roundedXl = frozen(STYLE_PRESETS['rounded-xl'])
export const roundedFull = frozen(STYLE_PRESETS['rounded-full'])

// ── Double line ──────────────────────────────────────────────────────────────
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
