import { JikzError } from '../core/errors'
import type { FillPatternSpec, PatternKind } from './FillPattern'
import type { GradientSpec } from './Gradient'
import type { DropShadowSpec } from './Shadow'

/**
 * Color specification
 * Can be a CSS color string, hex, rgb, etc.
 */
export type Color = string

/**
 * A clip region: any shape, path or node — anything that can describe
 * its outline as SVG path data. TikZ `\clip (0,0) circle (1);` is
 * `clip: circle(p, r)`.
 */
export interface ClipSpec {
  toSVGPath(): string
}

/**
 * Double line specification
 */
export interface DoubleLineSpec {
  spacing?: number        // gap between lines, default 3
  innerColor?: string     // inner line color, default 'white'
}

/**
 * Line cap style
 */
export type LineCap = 'butt' | 'round' | 'square'

/**
 * Line join style
 */
export type LineJoin = 'miter' | 'round' | 'bevel'

/**
 * Style properties for rendering
 */
export interface RenderStyle {
  // Stroke
  stroke?: Color
  strokeWidth?: number
  strokeOpacity?: number
  strokeDasharray?: string | number[]
  strokeDashoffset?: number
  strokeLinecap?: LineCap
  strokeLinejoin?: LineJoin
  strokeMiterlimit?: number
  /**
   * TikZ dash name ('dashed', 'densely dotted', …). Sugar for
   * strokeDasharray — an explicit strokeDasharray wins if both are set.
   */
  dash?: DashPatternName

  // Fill
  fill?: Color
  fillOpacity?: number
  /** TikZ `even odd rule` / `nonzero rule`. */
  fillRule?: 'nonzero' | 'evenodd'
  fillPattern?: PatternKind | FillPatternSpec
  gradient?: GradientSpec

  // Effects
  dropShadow?: DropShadowSpec | boolean
  clip?: ClipSpec

  /**
   * Round every corner of the outline by this inset, px — TikZ
   * `rounded corners=<inset>`. Applies to any path: rectangles get
   * `rx`/`ry`, everything else has its straight-segment corners
   * replaced by arcs (see {@link roundCorners}).
   */
  roundedCorners?: number

  // Double line
  doubleLine?: DoubleLineSpec | boolean

  // Overall opacity
  opacity?: number
}

/**
 * SVG attribute map. The index signature keeps this assignable to
 * `Record<string, unknown>` so it flows into builder `.attr()` calls
 * without casts; the named properties document the known keys.
 */
export interface SVGAttributes {
  [key: string]: string | number | undefined
  stroke?: string
  'stroke-width'?: number
  'stroke-opacity'?: number
  'stroke-dasharray'?: string
  'stroke-dashoffset'?: number
  'stroke-linecap'?: string
  'stroke-linejoin'?: string
  'stroke-miterlimit'?: number
  fill?: string
  'fill-opacity'?: number
  'fill-rule'?: string
  opacity?: number
  filter?: string
  'clip-path'?: string
  rx?: number
  ry?: number
}

/**
 * Default style values
 */
export const DEFAULT_STYLE: RenderStyle = {
  stroke: '#000000',
  strokeWidth: 1,
  strokeOpacity: 1,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  fill: 'none',
  fillOpacity: 1,
  opacity: 1,
}

/**
 * Preset styles (TikZ-inspired)
 */
export const STYLE_PRESETS = {
  // Line widths
  'ultra thin': { strokeWidth: 0.1 },
  'very thin': { strokeWidth: 0.2 },
  thin: { strokeWidth: 0.4 },
  semithick: { strokeWidth: 0.6 },
  thick: { strokeWidth: 0.8 },
  'very thick': { strokeWidth: 1.2 },
  'ultra thick': { strokeWidth: 1.6 },

  // Dash patterns — TikZ-exact (tikz.code.tex:1583–1591). Dots use
  // the stroke width as the "on" segment (TikZ: on \pgflinewidth);
  // the static values here assume lw=1 (jikz default), and named-dash
  // resolution in styleToAttributes substitutes the real width.
  solid: { strokeDasharray: '' },
  dashed: { strokeDasharray: '3 3' },
  dotted: { strokeDasharray: '1 2' },
  dashdotted: { strokeDasharray: '3 2 1 2' },
  'densely dashed': { strokeDasharray: '3 2' },
  'loosely dashed': { strokeDasharray: '3 6' },
  'densely dotted': { strokeDasharray: '1 1' },
  'loosely dotted': { strokeDasharray: '1 4' },

  // Colors (common)
  red: { stroke: '#e74c3c' },
  blue: { stroke: '#3498db' },
  green: { stroke: '#2ecc71' },
  orange: { stroke: '#e67e22' },
  purple: { stroke: '#9b59b6' },
  black: { stroke: '#000000' },
  gray: { stroke: '#7f8c8d' },
  white: { stroke: '#ffffff' },

  // Fill presets
  'fill red': { fill: '#e74c3c' },
  'fill blue': { fill: '#3498db' },
  'fill green': { fill: '#2ecc71' },
  'fill orange': { fill: '#e67e22' },
  'fill purple': { fill: '#9b59b6' },
  'fill gray': { fill: '#7f8c8d' },
  'fill white': { fill: '#ffffff' },

  // Combined presets
  draw: { stroke: '#000000', fill: 'none' },
  'fill only': { stroke: 'none' },

  // Shadow presets
  shadow: { dropShadow: { offsetX: 2, offsetY: 2, blur: 3, color: 'rgba(0,0,0,0.3)' } },
  'shadow-sm': { dropShadow: { offsetX: 1, offsetY: 1, blur: 2, color: 'rgba(0,0,0,0.2)' } },
  'shadow-lg': { dropShadow: { offsetX: 4, offsetY: 4, blur: 6, color: 'rgba(0,0,0,0.4)' } },

  // Rounded corner presets (TikZ `rounded corners=<inset>`)
  rounded: { roundedCorners: 4 },
  'rounded-sm': { roundedCorners: 2 },
  'rounded-lg': { roundedCorners: 8 },
  'rounded-xl': { roundedCorners: 12 },
  'rounded-full': { roundedCorners: 9999 },

  // Double line preset
  double: { doubleLine: { spacing: 3, innerColor: 'white' } },
} as const

export type StylePreset = keyof typeof STYLE_PRESETS

/**
 * The TikZ dash vocabulary, as a const array — the single source of
 * truth for {@link DashPatternName} and the `dash` style field.
 * Values resolve through {@link STYLE_PRESETS}.
 */
export const DASH_PATTERN_NAMES = [
  'solid',
  'dashed',
  'dashdotted',
  'dotted',
  'densely dashed',
  'loosely dashed',
  'densely dotted',
  'loosely dotted',
] as const

/** Dash name accepted by the `dash` style field. */
export type DashPatternName = (typeof DASH_PATTERN_NAMES)[number]

const DASH_VALUES: Record<DashPatternName, string> = Object.fromEntries(
  DASH_PATTERN_NAMES.map((n) => [n, STYLE_PRESETS[n].strokeDasharray])
) as Record<DashPatternName, string>

/**
 * Dash names whose "on" segments are the line width in TikZ (`on
 * \pgflinewidth`): the dots of dotted patterns and the dot inside
 * dashdotted. Width substitution targets the FIRST segment (and the
 * third for dashdotted).
 */
const WIDTH_AWARE_SEGMENTS: Partial<Record<DashPatternName, number[]>> = {
  dotted: [0],
  'densely dotted': [0],
  'loosely dotted': [0],
  dashdotted: [2],
}

/** Resolve a dash name to an SVG stroke-dasharray, TikZ-exact at the given line width. */
export function dashArrayFor(name: DashPatternName, strokeWidth: number): string {
  const staticValue = DASH_VALUES[name]
  const segments = WIDTH_AWARE_SEGMENTS[name]
  if (!segments) return staticValue
  const parts = staticValue.split(' ')
  for (const i of segments) parts[i] = String(strokeWidth)
  return parts.join(' ')
}

/**
 * One entry of a style list: a partial style object, or the NAME of a
 * style — a picture-local one (`picture({ styles })`), one registered
 * with {@link registerStyle}, or a built-in preset (`'thick'`,
 * `'dashed'`, `'red'`). Unknown names throw.
 */
export type StyleEntry = Partial<RenderStyle> | string

/**
 * A style argument: one {@link StyleEntry}, or an array merged
 * left-to-right (later wins — TikZ's `[a, b, c]` rule). Array items are
 * typically the preset objects (`thick`, `dashed` from
 * `@ozan.e/jikz/styles`), names, and inline overrides, mixed freely:
 *
 * ```ts
 * pic.draw(c, { style: ['thick', dashed, { stroke: '#2563eb' }] })
 * ```
 */
export type StyleSpec = StyleEntry | ReadonlyArray<StyleEntry>

/**
 * A style definition for {@link registerStyle} — the same shape as
 * {@link StyleSpec}; names inside it resolve eagerly at registration.
 */
export type StyleRecipe = StyleSpec

/** Resolves a style name to its style, or `undefined` when unknown. */
export type StyleLookup = (name: string) => Partial<RenderStyle> | undefined

/**
 * Normalize a {@link StyleSpec} to a flat list of style objects, for
 * chained merging. Names resolve through `lookup` first (a picture's
 * own styles), then the registry and the built-in presets.
 *
 * Unlike {@link mergeStyles} this adds no {@link DEFAULT_STYLE} floor,
 * so an absent key stays `undefined` — which is what lets a caller ask
 * "did the caller set this?" rather than "what is it now?".
 *
 * @throws JikzError `unknown-name` for a name nothing answers to.
 */
export function styleList(
  style: StyleSpec | undefined,
  lookup?: StyleLookup
): Partial<RenderStyle>[] {
  if (style === undefined) return []
  const entries = Array.isArray(style) ? style : [style as StyleEntry]
  const out: Partial<RenderStyle>[] = []
  for (const entry of entries) {
    if (typeof entry === 'string') {
      const resolved = lookup?.(entry) ?? resolveStyleName(entry)
      if (!resolved) {
        throw new JikzError(
          'unknown-name',
          `jikz: unknown style "${entry}" (known: ${knownStyleNames().join(', ')}). ` +
            `Register it with registerStyle() or pass it to picture({ styles }).`
        )
      }
      out.push(resolved)
    } else {
      out.push(entry)
    }
  }
  return out
}

/**
 * Merge styles over {@link DEFAULT_STYLE} — later wins. Names resolve
 * through the registry and the built-in presets.
 */
export function mergeStyles(...styles: (StyleSpec | undefined)[]): RenderStyle {
  const result = { ...DEFAULT_STYLE }
  for (const style of styles) {
    for (const item of styleList(style)) Object.assign(result, item)
  }
  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// Named style registry (TikZ \tikzset)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * User-registered named styles. Built-in presets live in
 * {@link STYLE_PRESETS}; this Map is the extensible namespace — TikZ's
 * `\tikzset`. Keys are case-sensitive; `parseStyleString` lowercases its
 * input, so use lowercase names to reach them from the string path.
 */
const styleRegistry = new Map<string, Readonly<Partial<RenderStyle>>>()

/**
 * Resolve one name to a style: registered styles first (so they can
 * shadow built-ins), then built-in presets. Undefined when unknown.
 */
function resolveStyleName(name: string): Partial<RenderStyle> | undefined {
  const registered = styleRegistry.get(name)
  if (registered) return registered
  return name in STYLE_PRESETS ? STYLE_PRESETS[name as StylePreset] : undefined
}

/** Every name a bare string style can resolve to: registered first, then built-in. */
function knownStyleNames(): string[] {
  return [...styleRegistry.keys(), ...Object.keys(STYLE_PRESETS)]
}

/**
 * Resolve a {@link StyleRecipe} to a flat {@link RenderStyle}, names
 * included. Same as {@link mergeStyles}; kept for the name.
 */
export function resolveStyle(recipe: StyleRecipe): RenderStyle {
  return mergeStyles(recipe)
}

/**
 * Register a named style — TikZ `\tikzset{name/.style=…}`.
 *
 * Returns a frozen preset object usable in the array form, so one
 * registration serves both the typed path and the string path:
 *
 * ```ts
 * const brand = registerStyle('brand', { stroke: '#2563eb', strokeWidth: 2 })
 * pic.draw(c, { style: [brand, dashed] })                // typed
 * pic.draw(c, { style: parseStyleString('brand, dashed') })
 * ```
 *
 * The body may reference other names (`['other', { … }]`), resolved
 * eagerly at registration time. Re-registering a name replaces it.
 */
export function registerStyle(
  name: string,
  recipe: StyleRecipe
): Readonly<Partial<RenderStyle>> {
  const resolved = Object.freeze(resolveStyle(recipe))
  styleRegistry.set(name, resolved)
  return resolved
}

/** Whether a name is known — registered or built-in. */
export function hasStyle(name: string): boolean {
  return styleRegistry.has(name) || name in STYLE_PRESETS
}

/** All registered style names (built-ins excluded). */
export function registeredStyleNames(): readonly string[] {
  return Array.from(styleRegistry.keys())
}

/**
 * Apply a preset style by name
 */
export function applyPreset(name: StylePreset): Partial<RenderStyle> {
  const preset = STYLE_PRESETS[name]
  if (!preset) {
    throw new JikzError(
      'unknown-name',
      `jikz: unknown style preset "${String(name)}" (known: ${Object.keys(STYLE_PRESETS).join(', ')}).`
    )
  }
  return preset
}

/**
 * Apply multiple presets
 */
export function applyPresets(...names: StylePreset[]): RenderStyle {
  return mergeStyles(DEFAULT_STYLE, ...names.map(applyPreset))
}

/**
 * Parse a style string (TikZ-like syntax)
 * Example: "thick, dashed, red"
 */
export function parseStyleString(styleStr: string): RenderStyle {
  const names = styleStr
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0)
  return mergeStyles(names)
}

/**
 * Convert RenderStyle to SVG attributes
 */
export function styleToSVGAttributes(style: Partial<RenderStyle>): SVGAttributes {
  const attrs: SVGAttributes = {}

  if (style.stroke !== undefined) {
    attrs.stroke = style.stroke
  }

  if (style.strokeWidth !== undefined) {
    attrs['stroke-width'] = style.strokeWidth
  }

  if (style.strokeOpacity !== undefined) {
    attrs['stroke-opacity'] = style.strokeOpacity
  }

  // Named dash resolves first so an explicit strokeDasharray overrides it.
  // Dotted patterns are width-aware (TikZ: on \pgflinewidth) — the dot
  // tracks the resolved stroke width rather than a hardcoded 1.
  if (style.dash !== undefined) {
    attrs['stroke-dasharray'] = dashArrayFor(style.dash, style.strokeWidth ?? 1)
  }

  if (style.strokeDasharray !== undefined) {
    if (Array.isArray(style.strokeDasharray)) {
      attrs['stroke-dasharray'] = style.strokeDasharray.join(' ')
    } else {
      attrs['stroke-dasharray'] = style.strokeDasharray
    }
  }

  if (style.strokeDashoffset !== undefined) {
    attrs['stroke-dashoffset'] = style.strokeDashoffset
  }

  if (style.strokeLinecap !== undefined) {
    attrs['stroke-linecap'] = style.strokeLinecap
  }

  if (style.strokeLinejoin !== undefined) {
    attrs['stroke-linejoin'] = style.strokeLinejoin
  }

  if (style.strokeMiterlimit !== undefined) {
    attrs['stroke-miterlimit'] = style.strokeMiterlimit
  }

  if (style.fill !== undefined) {
    attrs.fill = style.fill
  }

  if (style.fillOpacity !== undefined) {
    attrs['fill-opacity'] = style.fillOpacity
  }

  if (style.fillRule !== undefined) {
    attrs['fill-rule'] = style.fillRule
  }

  if (style.opacity !== undefined) {
    attrs.opacity = style.opacity
  }

  return attrs
}

/**
 * Convert style to CSS string
 */
export function styleToCSSString(style: Partial<RenderStyle>): string {
  const parts: string[] = []

  if (style.stroke !== undefined) {
    parts.push(`stroke: ${style.stroke}`)
  }

  if (style.strokeWidth !== undefined) {
    parts.push(`stroke-width: ${style.strokeWidth}`)
  }

  if (style.strokeOpacity !== undefined) {
    parts.push(`stroke-opacity: ${style.strokeOpacity}`)
  }

  if (style.strokeDasharray !== undefined) {
    const dasharray = Array.isArray(style.strokeDasharray)
      ? style.strokeDasharray.join(' ')
      : style.strokeDasharray
    parts.push(`stroke-dasharray: ${dasharray}`)
  }

  if (style.strokeLinecap !== undefined) {
    parts.push(`stroke-linecap: ${style.strokeLinecap}`)
  }

  if (style.strokeLinejoin !== undefined) {
    parts.push(`stroke-linejoin: ${style.strokeLinejoin}`)
  }

  if (style.fill !== undefined) {
    parts.push(`fill: ${style.fill}`)
  }

  if (style.fillOpacity !== undefined) {
    parts.push(`fill-opacity: ${style.fillOpacity}`)
  }

  if (style.opacity !== undefined) {
    parts.push(`opacity: ${style.opacity}`)
  }

  return parts.join('; ')
}

/**
 * Create a gradient ID for reuse
 */
export function createGradientId(type: 'linear' | 'radial', index: number): string {
  return `jikz-gradient-${type}-${index}`
}

/**
 * Check if a color is transparent
 */
export function isTransparent(color: Color | undefined): boolean {
  if (!color) return false
  const lower = color.toLowerCase()
  return lower === 'none' || lower === 'transparent' || lower === 'rgba(0,0,0,0)'
}

/**
 * Lighten a hex color
 */
export function lightenColor(hex: string, percent: number): string {
  // Remove # if present
  hex = hex.replace('#', '')

  // Parse RGB
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)

  // Lighten
  const newR = Math.min(255, Math.floor(r + (255 - r) * percent))
  const newG = Math.min(255, Math.floor(g + (255 - g) * percent))
  const newB = Math.min(255, Math.floor(b + (255 - b) * percent))

  // Convert back to hex
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`
}

/**
 * Darken a hex color
 */
export function darkenColor(hex: string, percent: number): string {
  // Remove # if present
  hex = hex.replace('#', '')

  // Parse RGB
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)

  // Darken
  const newR = Math.max(0, Math.floor(r * (1 - percent)))
  const newG = Math.max(0, Math.floor(g * (1 - percent)))
  const newB = Math.max(0, Math.floor(b * (1 - percent)))

  // Convert back to hex
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`
}

/**
 * Convert RGB to hex
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/**
 * Convert hex to RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  hex = hex.replace('#', '')

  if (hex.length === 3) {
    hex = hex[0]! + hex[0]! + hex[1]! + hex[1]! + hex[2]! + hex[2]!
  }

  if (hex.length !== 6) {
    return null
  }

  // Validate hex characters
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    return null
  }

  return {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16),
  }
}
