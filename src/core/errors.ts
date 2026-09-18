/**
 * Errors and warnings.
 *
 * Every error jikz throws is a {@link JikzError} carrying a stable
 * {@link JikzErrorCode}, so callers — and tools that drive jikz, such
 * as the TikZ converter — can branch on `err.code` instead of matching
 * message text. Messages stay descriptive; codes stay coarse: a code
 * names the *kind* of mistake, not the site.
 *
 * Warnings go through {@link warn}, which a host can redirect with
 * {@link setWarningHandler} — into a test spy, a logger, or nowhere.
 * The default is `console.warn`.
 */

/** Stable, coarse error codes. See the interface docs for when each is thrown. */
export type JikzErrorCode =
  /** A name (node, coordinate, layer, style, tip, decoration, shape) that nothing is registered under. */
  | 'unknown-name'
  /** A name registered twice where names must be unique. */
  | 'duplicate-name'
  /** An anchor spec that no shape can answer — see {@link AnchorError}. */
  | 'unknown-anchor'
  /** An argument that is out of range, inconsistent, or the wrong kind for the call. */
  | 'invalid-argument'
  /** Something a backend or environment cannot do (no DOM, cannot group, cannot fit). */
  | 'unsupported'
  /** A pen verb used before the pen has a position. */
  | 'no-pen-position'
  /** A layout algorithm could not proceed (cycle, infeasible constraints, bad graph). */
  | 'layout'
  /** Renderer state misuse (closing a group that is not open). */
  | 'render'

/** Base class of every error jikz throws. */
export class JikzError extends Error {
  readonly code: JikzErrorCode

  constructor(code: JikzErrorCode, message: string) {
    super(message)
    this.name = 'JikzError'
    this.code = code
  }
}

/** Receives every warning jikz emits. */
export type WarningHandler = (message: string, detail?: unknown) => void

let handler: WarningHandler | null = (message, detail) => {
  if (detail === undefined) console.warn(message)
  else console.warn(message, detail)
}

/**
 * Redirect jikz's warnings. Pass `null` to silence them; pass nothing
 * to restore the default (`console.warn`).
 */
export function setWarningHandler(next?: WarningHandler | null): void {
  handler = next === undefined ? defaultHandler : next
}

const defaultHandler: WarningHandler = handler

/** Emit a warning through the current {@link WarningHandler}. */
export function warn(message: string, detail?: unknown): void {
  handler?.(message, detail)
}
