/**
 * Shared vocabulary for the three stages.
 *
 * The AST is faithful to the TikZ source and knows nothing about jikz.
 * The IR is a jikz program — coordinates already ported, options
 * already mapped — and is what both back ends consume, so neither one
 * re-derives semantics. See the plan, §2.
 */

/** px per TikZ unit. TikZ's default `x=1cm, y=1cm` at 96dpi. */
export const DEFAULT_UNIT = 37.8

export interface ConvertOptions {
  /** px per TikZ unit. Default {@link DEFAULT_UNIT}. */
  unit?: number
}

// ─── AST ────────────────────────────────────────────────────────────

/** A coordinate as written, in TikZ space (y up). */
export interface Cartesian {
  readonly kind: 'cartesian'
  readonly x: number
  readonly y: number
}

export type Coord = Cartesian

export type Stmt =
  | { readonly kind: 'draw'; readonly path: readonly Coord[]; readonly line: number; readonly source: string }
  | { readonly kind: 'unsupported'; readonly line: number; readonly source: string; readonly reason: string }

// ─── IR ─────────────────────────────────────────────────────────────

/** One pen operation, in jikz space (y down, px). */
export interface IrSegment {
  readonly op: 'moveTo' | 'lineTo'
  readonly x: number
  readonly y: number
}

/**
 * `skipped` is decision 2 made concrete: the statement survives as a
 * comment so the emitted file still compiles and the reader can see
 * what was dropped and where.
 */
export type IrItem =
  | { readonly kind: 'pen'; readonly source: string; readonly segments: readonly IrSegment[] }
  | { readonly kind: 'skipped'; readonly source: string; readonly reason: string; readonly line: number }

export interface Diagnostic {
  readonly line: number
  readonly source: string
  readonly reason: string
}
