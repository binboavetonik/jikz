/**
 * M1's grammar: `\draw (x,y) -- (x,y) [-- (x,y)]* ;`
 *
 * Everything else becomes an `unsupported` statement carrying its own
 * source line — decision 2, so the emitter can comment it out and the
 * report can name it. That keeps the slice narrow without the parser
 * ever throwing away a statement silently.
 *
 * Statement splitting is on `;` and is a **stopgap**: TikZ allows `;`
 * inside braces, so M2 replaces this with a real path grammar that
 * consumes a statement rather than pre-splitting one.
 */
import { tokenize, type Token } from './tokenize'
import type { Coord, Stmt } from './types'

/** The body of the first tikzpicture, or the whole source if there is none. */
export function pictureBody(source: string): string {
  const begin = source.indexOf('\\begin{tikzpicture}')
  if (begin === -1) return source
  const after = source.indexOf('}', begin + '\\begin{tikzpicture'.length) + 1
  const end = source.indexOf('\\end{tikzpicture}', after)
  return source.slice(after, end === -1 ? undefined : end)
}

export function parse(source: string): Stmt[] {
  const tokens = tokenize(pictureBody(source))
  const out: Stmt[] = []

  let start = 0
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i]!.kind !== ';') continue
    const slice = tokens.slice(start, i)
    if (slice.length > 0) out.push(parseStatement(slice))
    start = i + 1
  }
  // A trailing statement with no `;` is still a statement.
  const tail = tokens.slice(start)
  if (tail.length > 0) out.push(parseStatement(tail))

  return out
}

function parseStatement(tokens: readonly Token[]): Stmt {
  const line = tokens[0]!.line
  const source = render(tokens)
  const head = tokens[0]!

  if (head.kind !== 'command' || head.value !== 'draw') {
    return { kind: 'unsupported', line, source, reason: `only \\draw is supported in M1, found ${describe(head)}` }
  }

  const path: Coord[] = []
  let i = 1

  while (i < tokens.length) {
    if (path.length > 0) {
      if (tokens[i]!.kind !== '--') {
        return { kind: 'unsupported', line, source, reason: `expected -- between coordinates, found ${describe(tokens[i]!)}` }
      }
      i++
    }
    const coord = parseCoord(tokens, i)
    if (!coord) {
      return { kind: 'unsupported', line, source, reason: `expected a cartesian coordinate at ${describe(tokens[i])}` }
    }
    path.push(coord.value)
    i = coord.next
  }

  if (path.length < 2) {
    return { kind: 'unsupported', line, source, reason: 'a path needs at least two coordinates' }
  }
  return { kind: 'draw', path, line, source }
}

function parseCoord(tokens: readonly Token[], i: number): { value: Coord; next: number } | undefined {
  if (tokens[i]?.kind !== '(') return undefined
  const x = tokens[i + 1]
  const comma = tokens[i + 2]
  const y = tokens[i + 3]
  const close = tokens[i + 4]
  if (x?.kind !== 'number' || comma?.kind !== ',' || y?.kind !== 'number' || close?.kind !== ')') return undefined
  return { value: { kind: 'cartesian', x: Number(x.value), y: Number(y.value) }, next: i + 5 }
}

function describe(token: Token | undefined): string {
  if (!token) return 'end of statement'
  return token.kind === 'command' ? `\\${token.value}` : `"${token.value}"`
}

/** Reconstruct a readable one-line source for comments and reports. */
function render(tokens: readonly Token[]): string {
  return tokens.map((t) => (t.kind === 'command' ? `\\${t.value}` : t.value)).join(' ') + ' ;'
}
