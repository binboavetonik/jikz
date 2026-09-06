/**
 * TikZ-style fill pattern names
 */
export type FillPatternName =
  | 'horizontal lines'
  | 'vertical lines'
  | 'north east lines'
  | 'north west lines'
  | 'grid'
  | 'crosshatch'
  | 'dots'
  | 'crosshatch dots'
  | 'fivepointed stars'
  | 'sixpointed stars'
  | 'bricks'
  | 'checkerboard'

/**
 * Full pattern specification with optional customization
 */
export interface FillPatternSpec {
  name: FillPatternName | (string & {})
  color?: string
  backgroundColor?: string
  scale?: number
  lineWidth?: number
  rotation?: number
}

/**
 * Internal definition for how to render a pattern tile
 */
export interface PatternDefinition {
  width: number
  height: number
  defaultLineWidth: number
  createContent(color: string, lineWidth: number): string
}

/**
 * All 12 TikZ pattern definitions
 */
export const PATTERN_DEFINITIONS: Record<FillPatternName, PatternDefinition> = {
  'horizontal lines': {
    width: 10,
    height: 10,
    defaultLineWidth: 0.8,
    createContent(color: string, lw: number): string {
      return `<line x1="0" y1="5" x2="10" y2="5" stroke="${color}" stroke-width="${lw}"/>`
    },
  },

  'vertical lines': {
    width: 10,
    height: 10,
    defaultLineWidth: 0.8,
    createContent(color: string, lw: number): string {
      return `<line x1="5" y1="0" x2="5" y2="10" stroke="${color}" stroke-width="${lw}"/>`
    },
  },

  'north east lines': {
    width: 10,
    height: 10,
    defaultLineWidth: 0.8,
    createContent(color: string, lw: number): string {
      return (
        `<line x1="0" y1="10" x2="10" y2="0" stroke="${color}" stroke-width="${lw}"/>` +
        `<line x1="-2" y1="2" x2="2" y2="-2" stroke="${color}" stroke-width="${lw}"/>` +
        `<line x1="8" y1="12" x2="12" y2="8" stroke="${color}" stroke-width="${lw}"/>`
      )
    },
  },

  'north west lines': {
    width: 10,
    height: 10,
    defaultLineWidth: 0.8,
    createContent(color: string, lw: number): string {
      return (
        `<line x1="0" y1="0" x2="10" y2="10" stroke="${color}" stroke-width="${lw}"/>` +
        `<line x1="-2" y1="8" x2="2" y2="12" stroke="${color}" stroke-width="${lw}"/>` +
        `<line x1="8" y1="-2" x2="12" y2="2" stroke="${color}" stroke-width="${lw}"/>`
      )
    },
  },

  grid: {
    width: 10,
    height: 10,
    defaultLineWidth: 0.6,
    createContent(color: string, lw: number): string {
      return (
        `<line x1="0" y1="5" x2="10" y2="5" stroke="${color}" stroke-width="${lw}"/>` +
        `<line x1="5" y1="0" x2="5" y2="10" stroke="${color}" stroke-width="${lw}"/>`
      )
    },
  },

  crosshatch: {
    width: 10,
    height: 10,
    defaultLineWidth: 0.6,
    createContent(color: string, lw: number): string {
      return (
        `<line x1="0" y1="10" x2="10" y2="0" stroke="${color}" stroke-width="${lw}"/>` +
        `<line x1="0" y1="0" x2="10" y2="10" stroke="${color}" stroke-width="${lw}"/>` +
        `<line x1="-2" y1="2" x2="2" y2="-2" stroke="${color}" stroke-width="${lw}"/>` +
        `<line x1="8" y1="12" x2="12" y2="8" stroke="${color}" stroke-width="${lw}"/>` +
        `<line x1="-2" y1="8" x2="2" y2="12" stroke="${color}" stroke-width="${lw}"/>` +
        `<line x1="8" y1="-2" x2="12" y2="2" stroke="${color}" stroke-width="${lw}"/>`
      )
    },
  },

  dots: {
    width: 10,
    height: 10,
    defaultLineWidth: 0,
    createContent(color: string): string {
      return `<circle cx="5" cy="5" r="1.5" fill="${color}"/>`
    },
  },

  'crosshatch dots': {
    width: 10,
    height: 10,
    defaultLineWidth: 0,
    createContent(color: string): string {
      return (
        `<circle cx="2.5" cy="2.5" r="1.2" fill="${color}"/>` +
        `<circle cx="7.5" cy="7.5" r="1.2" fill="${color}"/>` +
        `<circle cx="7.5" cy="2.5" r="1.2" fill="${color}"/>` +
        `<circle cx="2.5" cy="7.5" r="1.2" fill="${color}"/>`
      )
    },
  },

  'fivepointed stars': {
    width: 14,
    height: 14,
    defaultLineWidth: 0,
    createContent(color: string): string {
      // 5-pointed star centered at (7,7) with outer radius 5
      const points: string[] = []
      for (let i = 0; i < 5; i++) {
        const outerAngle = (i * 72 - 90) * (Math.PI / 180)
        const innerAngle = ((i * 72 + 36) - 90) * (Math.PI / 180)
        points.push(`${7 + 5 * Math.cos(outerAngle)},${7 + 5 * Math.sin(outerAngle)}`)
        points.push(`${7 + 2.2 * Math.cos(innerAngle)},${7 + 2.2 * Math.sin(innerAngle)}`)
      }
      return `<polygon points="${points.join(' ')}" fill="${color}"/>`
    },
  },

  'sixpointed stars': {
    width: 14,
    height: 14,
    defaultLineWidth: 0,
    createContent(color: string): string {
      // 6-pointed star (Star of David) as two overlapping triangles
      const tri1: string[] = []
      const tri2: string[] = []
      for (let i = 0; i < 3; i++) {
        const a1 = (i * 120 - 90) * (Math.PI / 180)
        const a2 = (i * 120 + 30) * (Math.PI / 180)
        tri1.push(`${7 + 5 * Math.cos(a1)},${7 + 5 * Math.sin(a1)}`)
        tri2.push(`${7 + 5 * Math.cos(a2)},${7 + 5 * Math.sin(a2)}`)
      }
      return (
        `<polygon points="${tri1.join(' ')}" fill="${color}"/>` +
        `<polygon points="${tri2.join(' ')}" fill="${color}"/>`
      )
    },
  },

  bricks: {
    width: 20,
    height: 16,
    defaultLineWidth: 0.8,
    createContent(color: string, lw: number): string {
      return (
        // Horizontal mortar lines
        `<line x1="0" y1="0" x2="20" y2="0" stroke="${color}" stroke-width="${lw}"/>` +
        `<line x1="0" y1="8" x2="20" y2="8" stroke="${color}" stroke-width="${lw}"/>` +
        `<line x1="0" y1="16" x2="20" y2="16" stroke="${color}" stroke-width="${lw}"/>` +
        // Vertical mortar lines (staggered)
        `<line x1="10" y1="0" x2="10" y2="8" stroke="${color}" stroke-width="${lw}"/>` +
        `<line x1="0" y1="8" x2="0" y2="16" stroke="${color}" stroke-width="${lw}"/>` +
        `<line x1="20" y1="8" x2="20" y2="16" stroke="${color}" stroke-width="${lw}"/>`
      )
    },
  },

  checkerboard: {
    width: 10,
    height: 10,
    defaultLineWidth: 0,
    createContent(color: string): string {
      return (
        `<rect x="0" y="0" width="5" height="5" fill="${color}"/>` +
        `<rect x="5" y="5" width="5" height="5" fill="${color}"/>`
      )
    },
  },
}

/**
 * All valid pattern names
 */
const PATTERN_NAMES = new Set<string>(Object.keys(PATTERN_DEFINITIONS))

/**
 * Type guard to check if a value is a valid pattern name
 */
export function isPatternName(value: unknown): value is FillPatternName {
  return typeof value === 'string' && PATTERN_NAMES.has(value)
}

// ─────────────────────────────────────────────────────────────────────────────
// Pattern registry
//
// Built-ins are pre-registered from PATTERN_DEFINITIONS. Register your
// own with registerPattern() — usable anywhere a pattern name is accepted:
//
//   registerPattern('wavy', {
//     width: 12, height: 6, defaultLineWidth: 1,
//     createContent: (color, lw) =>
//       `<path d="M0 3 Q3 0 6 3 T12 3" fill="none" stroke="${color}" stroke-width="${lw}"/>`,
//   })
//   ... style: { fillPattern: 'wavy' }
// ─────────────────────────────────────────────────────────────────────────────

const patternRegistry = new Map<string, PatternDefinition>(Object.entries(PATTERN_DEFINITIONS))

/**
 * Register a fill pattern under a name. Later registrations replace
 * earlier ones under the same name.
 */
export function registerPattern(name: string, def: PatternDefinition): void {
  patternRegistry.set(name, def)
  PATTERN_NAMES.add(name)
}

/**
 * Look up a registered pattern definition (undefined when absent).
 */
export function getPatternDefinition(name: string): PatternDefinition | undefined {
  return patternRegistry.get(name)
}

/**
 * All registered pattern names (built-ins plus user registrations).
 */
export function registeredPatternNames(): readonly string[] {
  return Array.from(patternRegistry.keys())
}

/**
 * Normalize a pattern input (string or spec) to a full FillPatternSpec
 */
export function normalizePatternSpec(
  input: FillPatternName | (string & {}) | FillPatternSpec
): FillPatternSpec {
  if (typeof input === 'string') {
    return { name: input }
  }
  return input
}

/**
 * Generate a deterministic pattern ID from a spec.
 * Same spec always produces the same ID, enabling dedup in <defs>.
 */
export function generatePatternId(spec: FillPatternSpec): string {
  const parts = ['jikz-pattern', spec.name.replace(/\s+/g, '-')]

  if (spec.color) {
    parts.push(`c${spec.color.replace('#', '')}`)
  }
  if (spec.backgroundColor) {
    parts.push(`bg${spec.backgroundColor.replace('#', '')}`)
  }
  if (spec.scale !== undefined && spec.scale !== 1) {
    parts.push(`s${spec.scale}`)
  }
  if (spec.lineWidth !== undefined) {
    parts.push(`lw${spec.lineWidth}`)
  }
  if (spec.rotation !== undefined && spec.rotation !== 0) {
    parts.push(`r${spec.rotation}`)
  }

  return parts.join('-')
}
