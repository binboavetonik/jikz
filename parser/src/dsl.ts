/**
 * The product: TikZ notation inside a jikz picture.
 *
 * ```ts
 * const pic = picture({ shapes: allShapes, frame: 'math', unit: cm(1) })
 * const t = tikz(pic)
 * t`\draw[thick] (0,0) -- (2,1) node[right] {A};`
 * t`\node[draw, circle] (q) at ${p} {q};`
 * ```
 *
 * Statements go into the container they were written for, in order
 * with the container's other calls; names they declare are the
 * container's names. A construct the pipeline cannot lower throws
 * `JikzError('unsupported')` naming the line and column — the DSL
 * never silently drops a statement.
 *
 * `${}` is the escape hatch that replaces pgfmath: a number prints as
 * a number, a point as `(x,y)` in the frame, a string as raw source.
 */
import { JikzError, allShapes, cm, picture, type Picture, type Point } from 'jikz'
import { interpret, namesOf, type TikzHost } from './interpret'
import { createState, lower, type TikzState } from './lower'
import { parse, parseStatements } from './parse'
import { precheck } from './precheck'
import { ScanError } from './scan'

export type TikzValue = number | string | Point | { readonly x: number; readonly y: number }

/** What a template call hands back: the names it registered, in order. */
export interface TikzResult {
  readonly names: readonly string[]
}

export interface TikzTemplate {
  (strings: TemplateStringsArray, ...values: readonly TikzValue[]): TikzResult
  /** The same, from a plain string. */
  source(text: string): TikzResult
}

/** Per-host state: anonymous-node numbering and TikZ styles, across template calls. */
const hosts = new WeakMap<object, { counter: number; state: TikzState }>()

function stateOf(host: TikzHost): { counter: number; state: TikzState } {
  let s = hosts.get(host)
  if (!s) {
    s = { counter: 0, state: createState() }
    hosts.set(host, s)
  }
  return s
}

/** Bind the template to a picture or scope. */
export function tikz(host: TikzHost): TikzTemplate {
  const own = stateOf(host)
  const names = () => `tikz-${++own.counter}`
  const run = (text: string): TikzResult => {
    const statements = guarded(() => parseStatements(text))
    const ir = lower(statements, { mode: 'dsl', unit: host.frame.unit, names, state: own.state })
    interpret(ir, host)
    return { names: namesOf(ir) }
  }
  const template = ((strings: TemplateStringsArray, ...values: readonly TikzValue[]) => run(join(strings, values))) as TikzTemplate
  template.source = run
  return template
}

export interface TikzPictureOptions {
  /** Px per TikZ unit. Default `cm(1)`, TikZ's `x=1cm, y=1cm`. */
  unit?: number
}

/**
 * A whole picture from TikZ: a `tikzpicture` environment (its options
 * apply) or a bare body. Same rules as {@link tikz}, on a fresh
 * `picture({ shapes: allShapes, frame: 'math' })`. A file the
 * pre-check refuses (3D, pgfplots) throws before parsing.
 *
 * ```ts
 * const pic = tikzPicture`\draw (0,0) -- (1,1);`
 * tikzPicture.source(texFile, { unit: cm(2) })
 * ```
 */
export function tikzPicture(strings: TemplateStringsArray, ...values: readonly TikzValue[]): Picture<typeof allShapes> {
  return tikzPicture.source(join(strings, values))
}

tikzPicture.source = (text: string, options: TikzPictureOptions = {}): Picture<typeof allShapes> => {
  const refusal = precheck(text)
  if (refusal) throw new JikzError('unsupported', `tikz: line ${refusal.line}: ${refusal.reason}`)
  const pic = picture({ shapes: allShapes, frame: 'math', unit: options.unit ?? cm(1) })
  const ast = guarded(() => parse(text))
  const own = stateOf(pic)
  const ir = lower(ast, { mode: 'dsl', unit: pic.frame.unit, names: () => `tikz-${++own.counter}`, state: own.state })
  interpret(ir, pic)
  return pic
}

function guarded<T>(parse: () => T): T {
  try {
    return parse()
  } catch (e) {
    if (e instanceof ScanError) throw new JikzError('unsupported', `tikz: line ${e.at.line}:${e.at.column}: ${e.message}`)
    throw e
  }
}

function join(strings: TemplateStringsArray, values: readonly TikzValue[]): string {
  let text = strings.raw[0] ?? ''
  values.forEach((v, i) => {
    text += splice(v) + (strings.raw[i + 1] ?? '')
  })
  return text
}

function splice(v: TikzValue): string {
  if (typeof v === 'number') return String(v)
  if (typeof v === 'string') return v
  return `(${v.x},${v.y})`
}
