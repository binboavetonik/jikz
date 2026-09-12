import type { FillPatternName, FillPatternSpec } from './FillPattern'
import type { GradientSpec } from './Gradient'
import type { DropShadowSpec } from './Shadow'

/**
 * Color specification
 * Can be a CSS color string, hex, rgb, etc.
 */
export type Color = string

/**
 * Clip path specification
 */
export interface ClipSpec {
  shape: 'rect' | 'circle' | 'ellipse' | 'path'
  // For rect
  x?: number
  y?: number
  width?: number
  height?: number
  // For circle
  cx?: number
  cy?: number
  r?: number
  // For ellipse (uses cx, cy)
  rx?: number
  ry?: number
  // For path
  d?: string
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
  /** CSS-alias of {@link strokeOpacity}; camelCase wins when both are set. */
  'stroke-opacity'?: number
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
  /** CSS-alias of {@link fillOpacity}; camelCase wins when both are set. */
  'fill-opacity'?: number
  fillPattern?: FillPatternName | (string & {}) | FillPatternSpec
  gradient?: GradientSpec

  // Effects
  dropShadow?: DropShadowSpec | boolean
  clip?: ClipSpec

  // Border radius (for rectangles)
  borderRadius?: number
  borderRadiusX?: number
  borderRadiusY?: number

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

  // Fill pattern presets
  'pattern horizontal lines': { fillPattern: 'horizontal lines' as FillPatternName },
  'pattern vertical lines': { fillPattern: 'vertical lines' as FillPatternName },
  'pattern north east lines': { fillPattern: 'north east lines' as FillPatternName },
  'pattern north west lines': { fillPattern: 'north west lines' as FillPatternName },
  'pattern grid': { fillPattern: 'grid' as FillPatternName },
  'pattern crosshatch': { fillPattern: 'crosshatch' as FillPatternName },
  'pattern dots': { fillPattern: 'dots' as FillPatternName },
  'pattern crosshatch dots': { fillPattern: 'crosshatch dots' as FillPatternName },
  'pattern fivepointed stars': { fillPattern: 'fivepointed stars' as FillPatternName },
  'pattern sixpointed stars': { fillPattern: 'sixpointed stars' as FillPatternName },
  'pattern bricks': { fillPattern: 'bricks' as FillPatternName },
  'pattern checkerboard': { fillPattern: 'checkerboard' as FillPatternName },

  // Shadow presets
  shadow: { dropShadow: { offsetX: 2, offsetY: 2, blur: 3, color: 'rgba(0,0,0,0.3)' } },
  'shadow-sm': { dropShadow: { offsetX: 1, offsetY: 1, blur: 2, color: 'rgba(0,0,0,0.2)' } },
  'shadow-lg': { dropShadow: { offsetX: 4, offsetY: 4, blur: 6, color: 'rgba(0,0,0,0.4)' } },

  // Rounded corner presets
  rounded: { borderRadius: 4 },
  'rounded-sm': { borderRadius: 2 },
  'rounded-lg': { borderRadius: 8 },
  'rounded-xl': { borderRadius: 12 },
  'rounded-full': { borderRadius: 9999 },

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
 * A style argument: either a partial style object, or an array of
 * partials merged left-to-right (later wins — TikZ's `[a, b, c]` rule).
 * Array items are typically the named preset objects (`thick`, `dashed`
 * from jikz's preset exports) optionally mixed with inline overrides.
 */
export type StyleSpec =
  | Partial<RenderStyle>
  | ReadonlyArray<Partial<RenderStyle>>

/**
 * A style definition for {@link registerStyle} — like {@link StyleSpec},
 * but array items may also be string names (registered or built-in),
 * resolved eagerly at registration. This is TikZ's `.style={a, b, …}`
 * composition: a recipe may reference other named styles.
 */
export type StyleRecipe =
  | Partial<RenderStyle>
  | ReadonlyArray<Partial<RenderStyle> | string>

/**
 * Merge multiple styles together
 */
export function mergeStyles(
  ...styles: (StyleSpec | undefined)[]
): RenderStyle {
  const result = { ...DEFAULT_STYLE }

  for (const style of styles) {
    if (!style) continue
    if (Array.isArray(style)) {
      for (const item of style) Object.assign(result, normalizeOpacityAliases(item))
    } else {
      // StyleSpec's ReadonlyArray member defeats else-branch narrowing
      Object.assign(result, normalizeOpacityAliases(style as Partial<RenderStyle>))
    }
  }

  return result
}

/**
 * Fold the CSS-alias keys ('stroke-opacity' / 'fill-opacity') into
 * their camelCase forms BEFORE Object.assign — otherwise the
 * DEFAULT_STYLE camelCase defaults baked into the merge result would
 * shadow the alias, and it would silently never apply. Within one
 * style object, an explicit camelCase key wins over its alias.
 */
function normalizeOpacityAliases(
  style: Partial<RenderStyle>
): Partial<RenderStyle> {
  const so = style['stroke-opacity']
  const fo = style['fill-opacity']
  if (so === undefined && fo === undefined) return style
  const out = { ...style }
  delete out['stroke-opacity']
  delete out['fill-opacity']
  if (so !== undefined && style.strokeOpacity === undefined) out.strokeOpacity = so
  if (fo !== undefined && style.fillOpacity === undefined) out.fillOpacity = fo
  return out
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

/**
 * Flatten a {@link StyleSpec}, resolving any string names (registered or
 * built-in) into their styles. Unknown names are dropped with a warning.
 * The name-aware counterpart of {@link mergeStyles}, which only folds
 * object partials.
 */
export function resolveStyle(recipe: StyleRecipe): RenderStyle {
  const parts = Array.isArray(recipe) ? recipe : [recipe]
  const resolved: Partial<RenderStyle>[] = []
  for (const part of parts) {
    if (typeof part === 'string') {
      const style = resolveStyleName(part)
      if (!style) {
        console.warn(`jikz: unknown style "${part}" — ignored`)
        continue
      }
      resolved.push(style)
    } else {
      resolved.push(part)
    }
  }
  return mergeStyles(...resolved)
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
    console.warn(`jikz: unknown style preset "${String(name)}" — ignored`)
    return {}
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
  const parts = styleStr.split(',').map((s) => s.trim().toLowerCase())
  const styles: Partial<RenderStyle>[] = []

  for (const part of parts) {
    const style = resolveStyleName(part)
    if (!style) {
      console.warn(`jikz: unknown style preset "${part}" in "${styleStr}" — ignored`)
      continue
    }
    styles.push(style)
  }

  return mergeStyles(...styles)
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

  // camelCase wins; 'stroke-opacity' is the accepted CSS-alias form
  const strokeOpacity = style.strokeOpacity ?? style['stroke-opacity']
  if (strokeOpacity !== undefined) {
    attrs['stroke-opacity'] = strokeOpacity
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

  const fillOpacity = style.fillOpacity ?? style['fill-opacity']
  if (fillOpacity !== undefined) {
    attrs['fill-opacity'] = fillOpacity
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

  if (style.strokeOpacity !== undefined || style['stroke-opacity'] !== undefined) {
    parts.push(`stroke-opacity: ${style.strokeOpacity ?? style['stroke-opacity']}`)
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

  if (style.fillOpacity !== undefined || style['fill-opacity'] !== undefined) {
    parts.push(`fill-opacity: ${style.fillOpacity ?? style['fill-opacity']}`)
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
