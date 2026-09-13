/**
 * The built-in fill patterns, as values.
 *
 * Each entry is a {@link PatternKind}: the tile geometry plus the name
 * it reports in generated `<defs>` ids. Hand one to a style —
 * `style: { fillPattern: fillPatterns.dots }` — or customize it with a
 * spec: `{ pattern: fillPatterns.dots, color: '#2563eb', scale: 1.5 }`.
 *
 * Kept apart from the pattern types and helpers so that a picture which
 * never fills with a pattern does not carry these twelve tiles.
 */
import { definePattern } from './FillPattern'

/** TikZ's twelve `\usetikzlibrary{patterns}` tiles. */
export const fillPatterns = {
  'horizontal lines': definePattern('horizontal lines', {
    width: 10,
    height: 10,
    defaultLineWidth: 0.8,
    createContent(color: string, lw: number): string {
      return `<line x1="0" y1="5" x2="10" y2="5" stroke="${color}" stroke-width="${lw}"/>`
    },
  }),

  'vertical lines': definePattern('vertical lines', {
    width: 10,
    height: 10,
    defaultLineWidth: 0.8,
    createContent(color: string, lw: number): string {
      return `<line x1="5" y1="0" x2="5" y2="10" stroke="${color}" stroke-width="${lw}"/>`
    },
  }),

  'north east lines': definePattern('north east lines', {
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
  }),

  'north west lines': definePattern('north west lines', {
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
  }),

  grid: definePattern('grid', {
    width: 10,
    height: 10,
    defaultLineWidth: 0.6,
    createContent(color: string, lw: number): string {
      return (
        `<line x1="0" y1="5" x2="10" y2="5" stroke="${color}" stroke-width="${lw}"/>` +
        `<line x1="5" y1="0" x2="5" y2="10" stroke="${color}" stroke-width="${lw}"/>`
      )
    },
  }),

  crosshatch: definePattern('crosshatch', {
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
  }),

  dots: definePattern('dots', {
    width: 10,
    height: 10,
    defaultLineWidth: 0,
    createContent(color: string): string {
      return `<circle cx="5" cy="5" r="1.5" fill="${color}"/>`
    },
  }),

  'crosshatch dots': definePattern('crosshatch dots', {
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
  }),

  'fivepointed stars': definePattern('fivepointed stars', {
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
  }),

  'sixpointed stars': definePattern('sixpointed stars', {
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
  }),

  bricks: definePattern('bricks', {
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
  }),

  checkerboard: definePattern('checkerboard', {
    width: 10,
    height: 10,
    defaultLineWidth: 0,
    createContent(color: string): string {
      return (
        `<rect x="0" y="0" width="5" height="5" fill="${color}"/>` +
        `<rect x="5" y="5" width="5" height="5" fill="${color}"/>`
      )
    },
  })
} as const

/** Name of a built-in fill pattern. */
export type FillPatternName = keyof typeof fillPatterns
