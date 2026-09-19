/**
 * The AST — faithful to the TikZ source, knowing nothing about jikz.
 *
 * Statements are what §0 of the plan scopes: path statements, nodes,
 * coordinates, scopes, `\foreach`, `\tikzset`. Anything else parses
 * to `unsupported`, carrying its source and a reason, so file mode can
 * comment it out and the DSL can throw naming it.
 */

/** A number as written, with its unit if any: `2`, `2cm`, `-3.5pt`. */
export interface Length {
  readonly value: number
  readonly unit?: string
}

export type Coordinate =
  | { readonly kind: 'cartesian'; readonly x: Length; readonly y: Length; readonly relative?: RelativeKind }
  | { readonly kind: 'polar'; readonly angle: number; readonly radius: Length; readonly relative?: RelativeKind }
  | { readonly kind: 'named'; readonly name: string; readonly anchor?: string; readonly relative?: RelativeKind }
  | { readonly kind: 'perpendicular'; readonly form: '|-' | '-|'; readonly a: Coordinate; readonly b: Coordinate }
  | { readonly kind: 'calc'; readonly expr: CalcExpr }

/** `++` moves the pen; `+` measures from it without moving it. */
export type RelativeKind = 'update' | 'keep'

/** `($ … $)` — the calc library's forms that lower to Point methods. */
export type CalcExpr =
  | { readonly kind: 'coord'; readonly coord: Coordinate }
  /** `(A)!t!(B)` */
  | { readonly kind: 'toward'; readonly a: CalcExpr; readonly b: CalcExpr; readonly t: number }
  /** `(A)!d!(B)` with a length */
  | { readonly kind: 'towardBy'; readonly a: CalcExpr; readonly b: CalcExpr; readonly distance: Length }
  /** `(A)!(P)!(B)` — the projection of P onto the line AB */
  | { readonly kind: 'project'; readonly a: CalcExpr; readonly p: CalcExpr; readonly b: CalcExpr }
  /** `(A)!t!θ:(B)` — B rotated by θ about A, then `toward` */
  | { readonly kind: 'rotateAround'; readonly p: CalcExpr; readonly about: CalcExpr; readonly angle: number }
  /** `f1*(A) + f2*(B) - (C)` */
  | { readonly kind: 'sum'; readonly terms: readonly { readonly factor: number; readonly expr: CalcExpr }[] }

/** One entry of `[…]`: `key`, `key=value`, or a quoted label `"text"`. */
export interface Option {
  readonly key: string
  /** Raw value text, braces stripped one level, or undefined for a bare key. */
  readonly value?: string
  /** For `"text"` / `"text"'`: the quotes syntax, with the label's own options. */
  readonly quoted?: { readonly text: string; readonly swap: boolean; readonly options: readonly Option[] }
}

export type PathItem =
  | { readonly kind: 'coord'; readonly coord: Coordinate }
  | { readonly kind: 'op'; readonly op: '--' | '-|' | '|-' }
  /** `.. controls (c1) [and (c2)] ..` */
  | { readonly kind: 'controls'; readonly c1: Coordinate; readonly c2?: Coordinate }
  /** `to[opts]` — the target is the coordinate item that follows */
  | { readonly kind: 'to'; readonly options: readonly Option[] }
  | { readonly kind: 'arc'; readonly options: readonly Option[]; readonly legacy?: { readonly start: number; readonly end: number; readonly radius: Length; readonly yRadius?: Length } }
  | { readonly kind: 'circle'; readonly options: readonly Option[]; readonly legacy?: { readonly radius: Length; readonly yRadius?: Length } }
  | { readonly kind: 'ellipse'; readonly options: readonly Option[]; readonly legacy?: { readonly radius: Length; readonly yRadius?: Length } }
  | { readonly kind: 'rectangle' }
  | { readonly kind: 'grid'; readonly options: readonly Option[] }
  | { readonly kind: 'parabola'; readonly options: readonly Option[]; readonly bend?: Coordinate }
  | { readonly kind: 'sin' }
  | { readonly kind: 'cos' }
  | { readonly kind: 'cycle' }
  /** `node[opts] (name) at (c) {text}` — on a path, or the whole of `\node …;` */
  | { readonly kind: 'node'; readonly options: readonly Option[]; readonly name?: string; readonly at?: Coordinate; readonly text: string }
  /** `coordinate[opts] (name) at (c)` — on a path, or the whole of `\coordinate …;` */
  | { readonly kind: 'coordinate'; readonly name: string; readonly options: readonly Option[]; readonly at?: Coordinate }
  /** `[opts]` mid-path */
  | { readonly kind: 'options'; readonly options: readonly Option[] }
  /** `edge[opts] node{…} (target)` */
  | { readonly kind: 'edge'; readonly options: readonly Option[]; readonly nodes: readonly PathItem[]; readonly target: Coordinate }
  /** `plot[opts] …` — recorded whole; not lowered in M2 */
  | { readonly kind: 'plot'; readonly options: readonly Option[]; readonly source: string }

export type PathVerb = 'draw' | 'fill' | 'filldraw' | 'path' | 'shade' | 'shadedraw' | 'clip' | 'pattern' | 'useasboundingbox'

export interface Position {
  readonly line: number
  readonly column: number
}

/**
 * `\node` and `\coordinate` are `\path node …` and `\path coordinate …`
 * in TikZ (tikz.code.tex: `\def\tikz@node{\path node}`), and parse
 * to exactly that: a `path` statement whose first item is the node.
 */
export type Statement =
  | { readonly kind: 'path'; readonly verb: PathVerb; readonly options: readonly Option[]; readonly items: readonly PathItem[]; readonly source: string; readonly at: Position }
  | { readonly kind: 'scope'; readonly options: readonly Option[]; readonly body: readonly Statement[]; readonly source: string; readonly at: Position }
  /** `\foreach \x/\y [opts] in {list} body` — the body stays text until expansion */
  | { readonly kind: 'foreach'; readonly variables: readonly string[]; readonly list: string; readonly options: readonly Option[]; readonly body: string; readonly source: string; readonly at: Position }
  | { readonly kind: 'tikzset'; readonly options: readonly Option[]; readonly source: string; readonly at: Position }
  | { readonly kind: 'unsupported'; readonly reason: string; readonly source: string; readonly at: Position }

/** `\begin{tikzpicture}[opts] … \end{tikzpicture}` or a bare body. */
export interface PictureAst {
  readonly options: readonly Option[]
  readonly body: readonly Statement[]
}
