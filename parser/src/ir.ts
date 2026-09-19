/**
 * The IR: a jikz program, one step from being either interpreted onto
 * a container or printed as TypeScript.
 *
 * Coordinates stay in the picture's frame — TikZ numbers, y up — and
 * the picture (`frame: 'math'`) does the port at render time. Every
 * option here is already a jikz option; neither back end re-derives
 * semantics from TikZ keys (plan §0, "Architecture").
 */

/** A point in frame coordinates, or a recipe for one. */
export type IrPoint =
  | { readonly kind: 'xy'; readonly x: number; readonly y: number }
  /** A registered name with an optional anchor: `'A'`, `'A.north'`, `'A.30'`. */
  | { readonly kind: 'name'; readonly ref: string }
  /** `++(dx,dy)` — only as a pen target. */
  | { readonly kind: 'rel'; readonly dx: number; readonly dy: number }
  /** `(A)!t!(B)` → `a.toward(b, t)` */
  | { readonly kind: 'toward'; readonly a: IrPoint; readonly b: IrPoint; readonly t: number }
  /** `(A)!d!(B)` → `a.towardByDistance(b, d)`, d in frame units */
  | { readonly kind: 'towardBy'; readonly a: IrPoint; readonly b: IrPoint; readonly distance: number }
  /** `(A)!(P)!(B)` → `p.project(a, b)` */
  | { readonly kind: 'project'; readonly a: IrPoint; readonly p: IrPoint; readonly b: IrPoint }
  /** `θ:(B)` about A → `p.rotateAround(about, θ)` */
  | { readonly kind: 'rotateAround'; readonly p: IrPoint; readonly about: IrPoint; readonly angle: number }
  /** `f1*(A) + f2*(B)` */
  | { readonly kind: 'sum'; readonly terms: readonly { readonly factor: number; readonly p: IrPoint }[] }
  /** `(A |- B)`: x of `a`, y of `b`. */
  | { readonly kind: 'perp'; readonly a: IrPoint; readonly b: IrPoint }

/**
 * Plain data — what an options object literal can hold. Never a point.
 * `{ $pattern }` names a `fillPatterns` entry, the one option value
 * that is an object from the library rather than data.
 */
export type IrValue = string | number | boolean | readonly IrValue[] | IrRecord | { readonly $pattern: string }
export interface IrRecord {
  readonly [key: string]: IrValue | undefined
}

export type IrOp =
  | { readonly op: 'moveTo' | 'lineTo' | 'hvTo' | 'vhTo' | 'rectangle' | 'sin' | 'cos'; readonly to: IrPoint }
  | { readonly op: 'curveTo'; readonly c1: IrPoint; readonly c2: IrPoint; readonly to: IrPoint }
  | { readonly op: 'to'; readonly to: IrPoint; readonly options: IrRecord }
  | { readonly op: 'arc'; readonly options: IrRecord }
  | { readonly op: 'circle'; readonly options: IrRecord }
  | { readonly op: 'ellipse'; readonly xRadius: number; readonly yRadius: number }
  | { readonly op: 'grid'; readonly to: IrPoint; readonly options: IrRecord }
  | { readonly op: 'parabola'; readonly to: IrPoint; readonly bend?: IrPoint }
  | { readonly op: 'close' }
  | { readonly op: 'node'; readonly name: string; readonly options: IrRecord }
  | { readonly op: 'coordinate'; readonly name: string }
  | { readonly op: 'push'; readonly options: IrRecord }

/** A scope's transform, in frame terms; composed in this order. */
export interface IrTransform {
  readonly shift?: { readonly dx: number; readonly dy: number }
  readonly rotate?: number
  readonly scale?: number
}

export type IrItem =
  | { readonly kind: 'pen'; readonly source: string; readonly options: IrRecord; readonly ops: readonly IrOp[] }
  | { readonly kind: 'node'; readonly source: string; readonly name: string; readonly at?: IrPoint; readonly options: IrRecord }
  | { readonly kind: 'coordinate'; readonly source: string; readonly name: string; readonly at: IrPoint }
  | { readonly kind: 'edge'; readonly source: string; readonly from: IrPoint; readonly to: IrPoint; readonly options: IrRecord }
  | { readonly kind: 'scope'; readonly source: string; readonly options: IrRecord; readonly transform?: IrTransform; readonly body: readonly IrItem[] }
  /** Decision 2: the statement survives as a comment, and the gap is named. */
  | { readonly kind: 'skipped'; readonly source: string; readonly reason: string; readonly line: number }

export interface Diagnostic {
  readonly line: number
  readonly source: string
  readonly reason: string
}
