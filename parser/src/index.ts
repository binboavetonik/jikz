/**
 * `@ozan.e/jikz-tikz` — a TikZ subset → jikz converter.
 *
 * **Not "paste any TikZ."** Port a 2D diagram, keep what maps, get
 * told about the rest. The M0 spike measured roughly 10-15% of wild
 * TikZ converting cleanly, another 20-25% usefully with gaps flagged,
 * and ~40% out for reasons that have nothing to do with the parser —
 * 3D, pgfplots, LaTeX content inside nodes, animation.
 *
 * Status: M1. The grammar is `\draw (x,y) -- (x,y);` and the
 * hopeless-file pre-check. Everything else reports itself.
 */
import { precheck } from './precheck'
import { parse } from './parse'
import { lower } from './lower'
import { emit, type EmitOptions } from './emit'
import { interpret } from './interpret'
import type { ConvertOptions, Diagnostic, IrItem } from './types'

export { precheck, parse, lower, emit, interpret }
export * from './types'
export type { PrecheckRefusal } from './precheck'
export { tokenize } from './tokenize'

export interface ConvertResult {
  /** Generated TypeScript, or `undefined` when the file was refused. */
  readonly code?: string
  /** The IR, for callers that want to render rather than print. */
  readonly ir?: readonly IrItem[]
  /** Per-statement gaps — decision 2. */
  readonly diagnostics: readonly Diagnostic[]
  /** Set when the whole file was refused — decision 4. */
  readonly refused?: { readonly marker: string; readonly reason: string; readonly line: number }
}

export function convert(source: string, options: ConvertOptions & EmitOptions = {}): ConvertResult {
  const refusal = precheck(source)
  if (refusal) return { diagnostics: [], refused: refusal }

  const ir = lower(parse(source), options)
  const diagnostics: Diagnostic[] = ir
    .filter((i): i is Extract<IrItem, { kind: 'skipped' }> => i.kind === 'skipped')
    .map((i) => ({ line: i.line, source: i.source, reason: i.reason }))

  return { code: emit(ir, options), ir, diagnostics }
}

/** Convert and render in one step — the playground path. */
export function render(source: string, options: ConvertOptions = {}) {
  const result = convert(source, options)
  return result.ir ? interpret(result.ir) : undefined
}
