/**
 * A single color stop in a gradient
 */
export interface GradientStop {
  offset: number      // 0 to 1
  color: string
  opacity?: number    // 0 to 1
}

/**
 * Linear gradient specification
 */
export interface LinearGradientSpec {
  type: 'linear'
  angle?: number      // degrees, 0=right, 90=up (default: 90)
  stops: GradientStop[]
}

/**
 * Radial gradient specification
 */
export interface RadialGradientSpec {
  type: 'radial'
  cx?: number         // center x (0-1), default 0.5
  cy?: number         // center y (0-1), default 0.5
  r?: number          // radius (0-1), default 0.5
  fx?: number         // focal point x (0-1), default same as cx
  fy?: number         // focal point y (0-1), default same as cy
  stops: GradientStop[]
}

/**
 * Union type for any gradient specification
 */
export type GradientSpec = LinearGradientSpec | RadialGradientSpec

/**
 * Default gradient stops (black to white)
 */
export const DEFAULT_GRADIENT_STOPS: GradientStop[] = [
  { offset: 0, color: '#000000' },
  { offset: 1, color: '#ffffff' },
]

/**
 * Type guard to check if value is a gradient spec
 */
export function isGradientSpec(value: unknown): value is GradientSpec {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return (obj.type === 'linear' || obj.type === 'radial') && Array.isArray(obj.stops)
}

/**
 * Type guard for linear gradient
 */
export function isLinearGradient(spec: GradientSpec): spec is LinearGradientSpec {
  return spec.type === 'linear'
}

/**
 * Type guard for radial gradient
 */
export function isRadialGradient(spec: GradientSpec): spec is RadialGradientSpec {
  return spec.type === 'radial'
}

/**
 * Normalize a gradient spec, ensuring all defaults are applied
 */
export function normalizeGradientSpec(spec: GradientSpec): GradientSpec {
  if (spec.type === 'linear') {
    return {
      type: 'linear',
      angle: spec.angle ?? 90,
      stops: spec.stops.length > 0 ? spec.stops : DEFAULT_GRADIENT_STOPS,
    }
  } else {
    return {
      type: 'radial',
      cx: spec.cx ?? 0.5,
      cy: spec.cy ?? 0.5,
      r: spec.r ?? 0.5,
      fx: spec.fx,
      fy: spec.fy,
      stops: spec.stops.length > 0 ? spec.stops : DEFAULT_GRADIENT_STOPS,
    }
  }
}

/**
 * Convert angle (degrees) to SVG gradient coordinates
 * Angle 0 = right (east), 90 = up (north), etc.
 * CSS/SVG gradient angles: 0deg = up, 90deg = right (but we use TikZ convention)
 */
export function angleToGradientCoords(angle: number): { x1: string; y1: string; x2: string; y2: string } {
  // Convert from TikZ angle (0=right, 90=up) to radians
  // In SVG, y increases downward, so we need to negate the y component
  const rad = (angle * Math.PI) / 180

  // Direction vector: (cos, -sin) because SVG y is inverted
  const dx = Math.cos(rad)
  const dy = -Math.sin(rad)

  // Gradient goes from (x1,y1) to (x2,y2)
  // Center at (50%, 50%), extend in the direction of the angle
  return {
    x1: `${(50 - dx * 50).toFixed(2)}%`,
    y1: `${(50 - dy * 50).toFixed(2)}%`,
    x2: `${(50 + dx * 50).toFixed(2)}%`,
    y2: `${(50 + dy * 50).toFixed(2)}%`,
  }
}

/**
 * Generate a deterministic ID for a gradient spec
 * Same spec = same ID for deduplication
 */
export function generateGradientId(spec: GradientSpec): string {
  const parts = ['jikz-gradient', spec.type]

  if (spec.type === 'linear') {
    parts.push(`a${spec.angle ?? 90}`)
  } else {
    parts.push(`cx${spec.cx ?? 0.5}`)
    parts.push(`cy${spec.cy ?? 0.5}`)
    parts.push(`r${spec.r ?? 0.5}`)
    if (spec.fx !== undefined) parts.push(`fx${spec.fx}`)
    if (spec.fy !== undefined) parts.push(`fy${spec.fy}`)
  }

  // Add stops to ID
  for (const stop of spec.stops) {
    const colorPart = stop.color.replace('#', '').replace(/[^a-zA-Z0-9]/g, '')
    parts.push(`${stop.offset}-${colorPart}${stop.opacity !== undefined ? `-${stop.opacity}` : ''}`)
  }

  return parts.join('-')
}

/**
 * Create SVG stop elements as HTML string
 */
export function createStopElements(stops: GradientStop[]): string {
  return stops
    .map((stop) => {
      const offsetPercent = `${(stop.offset * 100).toFixed(1)}%`
      const opacityAttr = stop.opacity !== undefined ? ` stop-opacity="${stop.opacity}"` : ''
      return `<stop offset="${offsetPercent}" stop-color="${stop.color}"${opacityAttr}/>`
    })
    .join('')
}
