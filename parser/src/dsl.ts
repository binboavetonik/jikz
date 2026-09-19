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
import { JikzError, type Point } from 'jikz'
import { interpret, type TikzHost } from './interpret'
import { createState, lower, type TikzState } from './lower'
import { parseStatements } from './parse'
import { ScanError } from './scan'

export type TikzValue = number | string | Point | { readonly x: number; readonly y: number }

export interface TikzTemplate {
  (strings: TemplateStringsArray, ...values: readonly TikzValue[]): void
  /** The same, from a plain string. */
  source(text: string): void
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
  const run = (text: string) => {
    let statements
    try {
      statements = parseStatements(text)
    } catch (e) {
      if (e instanceof ScanError) throw new JikzError('unsupported', `tikz: line ${e.at.line}:${e.at.column}: ${e.message}`)
      throw e
    }
    const ir = lower(statements, { mode: 'dsl', unit: host.frame.unit, names, state: own.state })
    interpret(ir, host)
  }
  const template = ((strings: TemplateStringsArray, ...values: readonly TikzValue[]) => {
    let text = strings.raw[0] ?? ''
    values.forEach((v, i) => {
      text += splice(v) + (strings.raw[i + 1] ?? '')
    })
    run(text)
  }) as TikzTemplate
  template.source = run
  return template
}

function splice(v: TikzValue): string {
  if (typeof v === 'number') return String(v)
  if (typeof v === 'string') return v
  return `(${v.x},${v.y})`
}
