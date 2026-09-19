/**
 * `@ozan.e/jikz-tikz` — TikZ notation as a jikz feature.
 *
 * The product is {@link tikz}: a tagged template that puts TikZ
 * statements into a jikz picture. {@link convert} is the eject path —
 * the same pipeline, printed as TypeScript against the typed API.
 *
 * Zero runtime dependencies. The parser is hand-written from the TikZ
 * manual; `@tikz-editor/lezer-tikz` is a dev-only conformance oracle.
 */
import { precheck } from './precheck'
import { parse } from './parse'
import { lower, createState, type LowerOptions } from './lower'
import { emit, type EmitOptions } from './emit'
import { interpret } from './interpret'
import type { PrecheckRefusal } from './precheck'
import type { Diagnostic, IrItem } from './ir'

export { tikz, tikzPicture, toTypeScript } from './dsl'
export type { TikzTemplate, TikzValue, TikzResult, TikzPictureOptions, ToTypeScriptOptions } from './dsl'
export { namesOf } from './interpret'
export { precheck, parse, lower, emit, interpret }
export { parseStatements, parseOptionList } from './parse'
export { mapOptions, knownKeys } from './keys'
export { createState }
export type { LowerOptions, TikzState } from './lower'
export type { EmitOptions } from './emit'
export type { TikzHost } from './interpret'
export type * from './ast'
export type * from './ir'
export type { PrecheckRefusal, RefusalCategory } from './precheck'

export interface ConvertOptions extends Omit<LowerOptions, 'unit'>, Omit<EmitOptions, 'unit'> {
  /**
   * Px per frame unit, with how the emitted code should spell it.
   * Default `{ px: cm(1), source: 'cm(1)' }`.
   */
  unit?: { px: number; source: string }
}

export interface ConvertResult {
  /** Generated TypeScript, or `undefined` when the file was refused. */
  readonly code?: string
  /** The IR, for callers that want to render rather than print. */
  readonly ir?: readonly IrItem[]
  /** Per-statement gaps — decision 2. */
  readonly diagnostics: readonly Diagnostic[]
  /** Set when the whole file was refused — decision 4. */
  readonly refused?: PrecheckRefusal
}

/** A `.tex` file (or a bare body) → TypeScript. */
export function convert(source: string, options: ConvertOptions = {}): ConvertResult {
  const refusal = precheck(source)
  if (refusal) return { diagnostics: [], refused: refusal }

  const { unit, from, ...lowerOptions } = options
  const ir = lower(parse(source), { mode: 'file', ...lowerOptions, ...(unit ? { unit: unit.px } : {}) })
  const diagnostics: Diagnostic[] = ir
    .filter((i): i is Extract<IrItem, { kind: 'skipped' }> => i.kind === 'skipped')
    .map((i) => ({ line: i.line, source: i.source, reason: i.reason }))

  return { code: emit(ir, { ...(from ? { from } : {}), ...(unit ? { unit: unit.source } : {}) }), ir, diagnostics }
}
