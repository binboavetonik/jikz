/**
 * Fadings — TikZ's `path fading` / `scope fading` (`fadings` library):
 * an opacity ramp over the painted area, as an SVG `<mask>` holding a
 * white-to-transparent gradient in object-bounding-box units, so one
 * def serves every shape it is applied to.
 *
 * The named fadings are pgf's own: `west` is transparent at the west
 * edge and opaque from a quarter of the way in, `east`/`north`/`south`
 * likewise; `fade out` is a disc opaque at the centre and transparent
 * at the rim, `fade in` the reverse; `circle with fuzzy edge` is opaque
 * to 90% of the radius, then fades.
 */
import { angleToGradientCoords } from './Gradient'

export type FadingName =
  | 'west'
  | 'east'
  | 'north'
  | 'south'
  | 'fade out'
  | 'fade in'
  | 'circle with fuzzy edge'

/** An opacity stop: `offset` 0–1 across the ramp, `opacity` 0–1. */
export interface FadingStop {
  offset: number
  opacity: number
}

export type FadingSpec =
  | FadingName
  | {
      type: 'linear'
      /** Direction of the ramp, degrees, 0 = right, 90 = up (as gradients). Default 0. */
      angle?: number
      stops: readonly FadingStop[]
    }
  | { type: 'radial'; stops: readonly FadingStop[] }

export interface NormalizedFading {
  type: 'linear' | 'radial'
  angle: number
  stops: readonly FadingStop[]
}

const NAMED: Record<FadingName, NormalizedFading> = {
  west: { type: 'linear', angle: 0, stops: [{ offset: 0, opacity: 0 }, { offset: 0.25, opacity: 0 }, { offset: 0.75, opacity: 1 }, { offset: 1, opacity: 1 }] },
  east: { type: 'linear', angle: 0, stops: [{ offset: 0, opacity: 1 }, { offset: 0.25, opacity: 1 }, { offset: 0.75, opacity: 0 }, { offset: 1, opacity: 0 }] },
  south: { type: 'linear', angle: 90, stops: [{ offset: 0, opacity: 0 }, { offset: 0.25, opacity: 0 }, { offset: 0.75, opacity: 1 }, { offset: 1, opacity: 1 }] },
  north: { type: 'linear', angle: 90, stops: [{ offset: 0, opacity: 1 }, { offset: 0.25, opacity: 1 }, { offset: 0.75, opacity: 0 }, { offset: 1, opacity: 0 }] },
  'fade out': { type: 'radial', angle: 0, stops: [{ offset: 0, opacity: 1 }, { offset: 1, opacity: 0 }] },
  'fade in': { type: 'radial', angle: 0, stops: [{ offset: 0, opacity: 0 }, { offset: 1, opacity: 1 }] },
  'circle with fuzzy edge': { type: 'radial', angle: 0, stops: [{ offset: 0, opacity: 1 }, { offset: 0.9, opacity: 1 }, { offset: 1, opacity: 0 }] },
}

export const FADING_NAMES = Object.keys(NAMED) as FadingName[]

export function normalizeFading(spec: FadingSpec): NormalizedFading {
  if (typeof spec === 'string') {
    const named = NAMED[spec]
    if (!named) throw new Error(`Unknown fading "${spec}" (known: ${FADING_NAMES.join(', ')}).`)
    return named
  }
  return { type: spec.type, angle: spec.type === 'linear' ? (spec.angle ?? 0) : 0, stops: spec.stops }
}

/** A stable id for a fading, so equal specs share one def. */
export function generateFadingId(f: NormalizedFading): string {
  const stops = f.stops.map((s) => `${s.offset}_${s.opacity}`).join('-')
  return `jikz-fading-${f.type}-${f.angle}-${stops}`.replace(/[^a-zA-Z0-9_-]/g, '')
}

/**
 * The `<mask>` markup for a fading: a unit rect filled with a white
 * gradient whose stop opacities are the ramp, in object-bounding-box
 * units. Luminance masking makes white-opaque visible.
 */
export function fadingMaskMarkup(id: string, f: NormalizedFading): string {
  const gradId = `${id}-g`
  const stops = f.stops
    .map((s) => `<stop offset="${(s.offset * 100).toFixed(1)}%" stop-color="#ffffff" stop-opacity="${s.opacity}"/>`)
    .join('')
  const gradient =
    f.type === 'linear'
      ? (() => {
          const c = angleToGradientCoords(f.angle)
          return `<linearGradient id="${gradId}" x1="${c.x1}" y1="${c.y1}" x2="${c.x2}" y2="${c.y2}">${stops}</linearGradient>`
        })()
      : `<radialGradient id="${gradId}" cx="50%" cy="50%" r="50%">${stops}</radialGradient>`
  return (
    gradient +
    `<mask id="${id}" maskUnits="objectBoundingBox" maskContentUnits="objectBoundingBox" x="0" y="0" width="1" height="1">` +
    `<rect x="0" y="0" width="1" height="1" fill="url(#${gradId})"/></mask>`
  )
}
