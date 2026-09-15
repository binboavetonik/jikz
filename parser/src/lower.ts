/**
 * AST → IR: the coordinate port, done once.
 *
 * Plan §3. TikZ is y-up in cm; jikz is y-down in px. The port happens
 * here, at convert time, because the alternative — keeping TikZ's
 * numbers and wrapping the picture in a flipping transform — emits
 * `matrix(1 0 0 -1 0 0)` around the whole scene and renders every
 * glyph upside-down. Measured 2026-09-15, not assumed.
 *
 * Doing it here rather than in either back end is what keeps the
 * interpreter and the printer honest about being the same program.
 */
import { DEFAULT_UNIT, type ConvertOptions, type Coord, type IrItem, type IrSegment, type Stmt } from './types'

export function lower(statements: readonly Stmt[], options: ConvertOptions = {}): IrItem[] {
  const unit = options.unit ?? DEFAULT_UNIT
  return statements.map((s) =>
    s.kind === 'draw'
      ? {
          kind: 'pen' as const,
          source: s.source,
          segments: s.path.map((c, i): IrSegment => ({ op: i === 0 ? 'moveTo' : 'lineTo', ...port(c, unit) })),
        }
      : { kind: 'skipped' as const, source: s.source, reason: s.reason, line: s.line }
  )
}

/** `(x,y)` → `(x*S, -y*S)`, with -0 normalised so output is stable. */
export function port(c: Coord, unit: number): { x: number; y: number } {
  return { x: round(c.x * unit), y: round(-c.y * unit) }
}

function round(n: number): number {
  // Six places matches the renderer's own serialization boundary, so a
  // ported coordinate never differs from a hand-written one by float
  // noise alone.
  const r = Math.round(n * 1e6) / 1e6
  return Object.is(r, -0) ? 0 : r
}
