/**
 * Drop shadow specification
 */
export interface DropShadowSpec {
  offsetX?: number      // default 2
  offsetY?: number      // default 2
  blur?: number         // default 3 (stdDeviation)
  color?: string        // default 'rgba(0,0,0,0.3)'
}

/**
 * Default shadow values
 */
export const DEFAULT_SHADOW: Required<DropShadowSpec> = {
  offsetX: 2,
  offsetY: 2,
  blur: 3,
  color: 'rgba(0,0,0,0.3)',
}

/**
 * Type guard to check if value is a drop shadow spec
 */
export function isDropShadowSpec(value: unknown): value is DropShadowSpec {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  // At least one shadow property should be present, or it's an empty object (valid)
  const validKeys = ['offsetX', 'offsetY', 'blur', 'color']
  const keys = Object.keys(obj)
  return keys.length === 0 || keys.some((k) => validKeys.includes(k))
}

/**
 * Normalize a shadow spec, applying defaults
 */
export function normalizeShadowSpec(spec: DropShadowSpec | boolean): DropShadowSpec {
  if (spec === true) {
    return { ...DEFAULT_SHADOW }
  }
  if (spec === false) {
    return {}
  }
  return {
    offsetX: spec.offsetX ?? DEFAULT_SHADOW.offsetX,
    offsetY: spec.offsetY ?? DEFAULT_SHADOW.offsetY,
    blur: spec.blur ?? DEFAULT_SHADOW.blur,
    color: spec.color ?? DEFAULT_SHADOW.color,
  }
}

/**
 * Generate a deterministic ID for a shadow spec
 */
export function generateShadowId(spec: DropShadowSpec): string {
  const parts = ['jikz-shadow']

  const ox = spec.offsetX ?? DEFAULT_SHADOW.offsetX
  const oy = spec.offsetY ?? DEFAULT_SHADOW.offsetY
  const blur = spec.blur ?? DEFAULT_SHADOW.blur
  const color = (spec.color ?? DEFAULT_SHADOW.color)
    .replace(/[^a-zA-Z0-9]/g, '')

  parts.push(`${ox}-${oy}-${blur}-${color}`)

  return parts.join('-')
}

/**
 * Parse color to get flood-color and flood-opacity for SVG filter
 * Handles rgba(), rgb(), hex colors
 */
export function parseColorForFilter(color: string): { floodColor: string; floodOpacity: number } {
  // Handle rgba
  const rgbaMatch = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/)
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1]!, 10)
    const g = parseInt(rgbaMatch[2]!, 10)
    const b = parseInt(rgbaMatch[3]!, 10)
    const a = rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1
    return {
      floodColor: `rgb(${r},${g},${b})`,
      floodOpacity: a,
    }
  }

  // Handle hex or named colors
  return {
    floodColor: color,
    floodOpacity: 1,
  }
}
