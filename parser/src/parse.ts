/**
 * The statement parser: TikZ source → {@link Statement} AST.
 *
 * Hand-written recursive descent over a {@link Scanner}, written from
 * the TikZ manual (§14 "Specifying Coordinates", §14.2 "Path
 * Operations", §17 "Nodes and Edges") and `tikz.code.tex`. It
 * consumes a statement at a time rather than pre-splitting on `;`, so
 * a `;` inside a node's braces is text, as it is in TikZ.
 *
 * Anything it cannot parse becomes an `unsupported` statement that
 * names the construct and keeps its source, so the DSL can throw on it
 * and the eject path can comment it out. It never drops a statement
 * silently.
 */
import type {
  CalcExpr,
  Coordinate,
  Length,
  Option,
  PathItem,
  PathVerb,
  PictureAst,
  Position,
  RelativeKind,
  Statement,
} from './ast'
import { ScanError, Scanner, splitTopLevel } from './scan'

const PATH_VERBS: Record<string, PathVerb> = {
  draw: 'draw',
  fill: 'fill',
  filldraw: 'filldraw',
  path: 'path',
  shade: 'shade',
  shadedraw: 'shadedraw',
  clip: 'clip',
  pattern: 'pattern',
  useasboundingbox: 'useasboundingbox',
}

/**
 * Parse a whole file or a bare body. With a `\begin{tikzpicture}`, the
 * first picture's options and body; without one, the source is the
 * body.
 */
export function parse(source: string): PictureAst {
  const s = new Scanner(source)
  // `circuitikz` is a tikzpicture with the circuits keys loaded.
  const env = /\\begin\{(tikzpicture|circuitikz)\}/.exec(source)
  if (!env) return { options: [], body: parseStatements(s) }
  s.pos = env.index + env[0].length
  const options = optionsOpt(s)
  const body = parseStatements(s, `\\end{${env[1]}}`)
  return { options, body }
}

/** Parse a sequence of statements — the DSL's entry point. */
export function parseStatements(source: string | Scanner, until?: string): Statement[] {
  const s = typeof source === 'string' ? new Scanner(source) : source
  const out: Statement[] = []
  while (!s.done) {
    if (until && s.eat(until)) return out
    out.push(parseStatement(s))
  }
  if (until) throw s.error(`missing ${until}`)
  return out
}

function parseStatement(s: Scanner): Statement {
  s.skip()
  const start = s.pos
  const at = s.position()
  try {
    return parseStatementInner(s, start, at)
  } catch (e) {
    if (!(e instanceof ScanError)) throw e
    recover(s, start)
    return { kind: 'unsupported', reason: e.message, source: s.slice(start), at }
  }
}

function parseStatementInner(s: Scanner, start: number, at: Position): Statement {
  if (s.eat('\\begin{scope}')) {
    const options = optionsOpt(s)
    const body = parseStatements(s, '\\end{scope}')
    return { kind: 'scope', options, body, source: s.slice(start), at }
  }
  const env = s.match(/^\\begin\{([a-zA-Z*]+)\}/)
  if (env) {
    // A nested environment we do not model (pgfonlayer, tikzpicture
    // inside a picture, …): skip it whole.
    const name = env[1]!
    const end = s.src.indexOf(`\\end{${name}}`, s.pos)
    s.pos = end === -1 ? s.src.length : end + `\\end{${name}}`.length
    return { kind: 'unsupported', reason: `environment "${name}" is not supported`, source: s.slice(start), at }
  }
  if (s.match(/^\\end\{/)) {
    throw s.error(`stray ${s.match(/^\\end\{[a-zA-Z*]+\}/)?.[0] ?? '\\end'}`)
  }

  const cmd = s.command()
  if (cmd === undefined) throw s.error(`expected a statement, found "${s.peek()}"`)

  const verb = PATH_VERBS[cmd]
  if (verb) {
    const options = optionsOpt(s)
    const items = parsePathItems(s)
    return { kind: 'path', verb, options, items, source: s.slice(start), at }
  }
  if (cmd === 'node') {
    const head = parseNodeItem(s)
    const items = [head, ...parsePathItems(s)]
    return { kind: 'path', verb: 'path', options: [], items, source: s.slice(start), at }
  }
  if (cmd === 'coordinate') {
    const head = parseCoordinateItem(s)
    const items = [head, ...parsePathItems(s)]
    return { kind: 'path', verb: 'path', options: [], items, source: s.slice(start), at }
  }
  if (cmd === 'pic') {
    const head = parsePicItem(s)
    const items = [head, ...parsePathItems(s)]
    return { kind: 'path', verb: 'path', options: [], items, source: s.slice(start), at }
  }
  if (cmd === 'usetikzlibrary') {
    const names = s.balanced('{', '}').split(',').map((n) => n.trim()).filter(Boolean)
    return { kind: 'library', names, source: s.slice(start), at }
  }
  if (cmd === 'foreach') return parseForeach(s, start, at)
  if (cmd === 'tikzset') {
    const options = parseOptionList(s.balanced('{', '}'))
    return { kind: 'tikzset', options, source: s.slice(start), at }
  }
  if (cmd === 'tikzstyle') {
    // Deprecated `\tikzstyle{name}=[opts]` ≡ `\tikzset{name/.style={opts}}`.
    const name = s.balanced('{', '}').trim()
    s.expect('=')
    const value = s.balanced('[', ']')
    return { kind: 'tikzset', options: [{ key: `${name}/.style`, value }], source: s.slice(start), at }
  }
  throw s.error(`\\${cmd} is not supported`)
}

/**
 * After a failed statement, move to where the next one plausibly
 * starts: past the next top-level `;`, or to a line that begins a
 * new control sequence, whichever comes first.
 */
function recover(s: Scanner, start: number): void {
  s.pos = start
  let depth = 0
  // Always consume at least the control sequence that failed.
  s.command()
  while (s.pos < s.src.length) {
    const c = s.src[s.pos]!
    if (c === '\\') {
      s.pos += 2
      continue
    }
    if (c === '%') {
      while (s.pos < s.src.length && s.src[s.pos] !== '\n') s.pos++
      continue
    }
    if (c === '{' || c === '[' || c === '(') depth++
    else if (c === '}' || c === ']' || c === ')') depth = Math.max(0, depth - 1)
    else if (depth === 0 && c === ';') {
      s.pos++
      return
    } else if (depth === 0 && c === '\n') {
      const rest = s.src.slice(s.pos + 1)
      if (/^\s*\\(begin|end|draw|fill|filldraw|path|node|coordinate|foreach|shade|clip|tikzset)\b/.test(rest)) return
    }
    s.pos++
  }
}

// ─── options ────────────────────────────────────────────────────────

function optionsOpt(s: Scanner): Option[] {
  return s.at('[') ? parseOptionList(s.balanced('[', ']')) : []
}

/** `a, b=c, key={x,y}, "label" above` → options. */
export function parseOptionList(text: string): Option[] {
  const out: Option[] = []
  for (const part of splitTopLevel(text, ',')) {
    if (part.startsWith('"')) {
      out.push(parseQuoted(part))
      continue
    }
    const eq = topLevelIndexOf(part, '=')
    if (eq === -1) {
      out.push({ key: normalizeKey(part) })
    } else {
      out.push({ key: normalizeKey(part.slice(0, eq)), value: stripBraces(part.slice(eq + 1).trim()) })
    }
  }
  return out
}

/** The quotes library: `"text"`, `"text"'` (swap), `"text" {opts}` / `"text" above`. */
function parseQuoted(part: string): Option {
  let i = 1
  while (i < part.length && part[i] !== '"') i += part[i] === '\\' ? 2 : 1
  const text = part.slice(1, i)
  let rest = part.slice(i + 1).trim()
  let swap = false
  if (rest.startsWith("'")) {
    swap = true
    rest = rest.slice(1).trim()
  }
  const options = rest.length > 0 ? parseOptionList(stripBraces(rest)) : []
  return { key: '"', quoted: { text, swap, options } }
}

function topLevelIndexOf(text: string, ch: string): number {
  let depth = 0
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!
    if (c === '\\') {
      i++
      continue
    }
    if (c === '{' || c === '[' || c === '(') depth++
    else if (c === '}' || c === ']' || c === ')') depth--
    else if (depth === 0 && c === ch) return i
  }
  return -1
}

function normalizeKey(key: string): string {
  return key.trim().replace(/\s+/g, ' ')
}

function stripBraces(value: string): string {
  return value.startsWith('{') && value.endsWith('}') ? value.slice(1, -1) : value
}

// ─── path items ─────────────────────────────────────────────────────

const PATH_KEYWORDS = new Set([
  'to', 'arc', 'circle', 'ellipse', 'rectangle', 'grid', 'parabola', 'sin', 'cos',
  'cycle', 'node', 'coordinate', 'edge', 'plot', 'pic', 'child', 'let', 'foreach', 'bend', 'decorate', 'svg',
])

/** Items up to and including the statement's `;`. */
function parsePathItems(s: Scanner): PathItem[] {
  const items: PathItem[] = []
  for (;;) {
    if (s.eat(';')) return items
    if (s.done) throw s.error('missing ";"')
    items.push(parsePathItem(s))
  }
}

function parsePathItem(s: Scanner): PathItem {
  if (s.at('(') || s.at('++') || s.match(/^\+\s*\(/)) return { kind: 'coord', coord: parseCoordinate(s) }
  if (s.at('[')) return { kind: 'options', options: parseOptionList(s.balanced('[', ']')) }
  if (s.eat('--')) return { kind: 'op', op: '--' }
  if (s.eat('-|')) return { kind: 'op', op: '-|' }
  if (s.eat('|-')) return { kind: 'op', op: '|-' }
  if (s.eat('..')) {
    if (!s.keyword('controls')) throw s.error('expected "controls" after ".."')
    const c1 = parseCoordinate(s)
    const c2 = s.keyword('and') ? parseCoordinate(s) : undefined
    s.expect('..')
    return { kind: 'controls', c1, ...(c2 ? { c2 } : {}) }
  }
  const word = s.match(/^[a-zA-Z]+/)?.[0]
  if (word === undefined || !PATH_KEYWORDS.has(word)) {
    const cmd = s.peekCommand()
    if (cmd === 'foreach') throw s.error('\\foreach inside a path is not supported')
    throw s.error(`unexpected "${cmd !== undefined ? '\\' + cmd : s.peek()}" in path`)
  }
  s.pos += word.length
  switch (word) {
    case 'cycle':
      return { kind: 'cycle' }
    case 'rectangle':
      return { kind: 'rectangle' }
    case 'sin':
      return { kind: 'sin' }
    case 'cos':
      return { kind: 'cos' }
    case 'to':
      return { kind: 'to', options: optionsOpt(s) }
    case 'grid':
      return { kind: 'grid', options: optionsOpt(s) }
    case 'node':
      return parseNodeItem(s)
    case 'pic':
      return parsePicItem(s)
    case 'coordinate':
      return parseCoordinateItem(s)
    case 'arc': {
      const options = optionsOpt(s)
      if (!s.at('(')) return { kind: 'arc', options }
      // `arc (start:end:radius)` / `arc (start:end:rx and ry)`
      const parts = splitTopLevel(s.balanced('(', ')'), ':')
      if (parts.length !== 3) throw s.error('arc (start:end:radius) needs three parts')
      const start = numberOf(parts[0]!, s)
      const end = numberOf(parts[1]!, s)
      const radii = parseRadii(parts[2]!, s)
      return { kind: 'arc', options, legacy: { start, end, radius: radii.radius, ...(radii.yRadius ? { yRadius: radii.yRadius } : {}) } }
    }
    case 'circle':
    case 'ellipse': {
      const options = optionsOpt(s)
      if (!s.at('(')) return { kind: word, options }
      const radii = parseRadii(s.balanced('(', ')'), s)
      return { kind: word, options, legacy: radii }
    }
    case 'parabola': {
      const options = optionsOpt(s)
      const bend = s.keyword('bend') ? parseCoordinate(s) : undefined
      return { kind: 'parabola', options, ...(bend ? { bend } : {}) }
    }
    case 'edge': {
      if (s.keyword('from')) {
        if (!s.keyword('parent')) throw s.error('expected "edge from parent"')
        const options = optionsOpt(s)
        const nodes: PathItem[] = []
        while (s.keyword('node')) nodes.push(parseNodeItem(s))
        return { kind: 'edgeFromParent', options, nodes }
      }
      const options = optionsOpt(s)
      const nodes: PathItem[] = []
      while (s.keyword('node')) nodes.push(parseNodeItem(s))
      const target = parseCoordinate(s)
      return { kind: 'edge', options, nodes, target }
    }
    case 'child': {
      const options = optionsOpt(s)
      if (s.keyword('foreach')) throw s.error('child foreach is not supported')
      // The child path: a node, nested children, `edge from parent` — path items with no `;`.
      const inner = new Scanner(s.balanced('{', '}'))
      const body: PathItem[] = []
      while (!inner.done) body.push(parsePathItem(inner))
      return { kind: 'child', options, body }
    }
    case 'plot': {
      const start = s.pos - word.length
      const options = optionsOpt(s)
      if (s.keyword('coordinates')) s.balanced('{', '}')
      else if (s.keyword('function') || s.keyword('file')) s.balanced('{', '}')
      else if (s.at('(')) s.balanced('(', ')')
      else throw s.error('plot: expected coordinates, function, file or an expression')
      return { kind: 'plot', options, source: s.slice(start) }
    }
    default:
      throw s.error(`"${word}" in a path is not supported`)
  }
}

/** `[opts] (name) at (c) {text}` in any order, ending at the text. */
function parseNodeItem(s: Scanner): PathItem {
  let options: Option[] = []
  let name: string | undefined
  let at: Coordinate | undefined
  for (;;) {
    if (s.at('[')) options = [...options, ...parseOptionList(s.balanced('[', ']'))]
    else if (s.at('(')) name = s.balanced('(', ')').trim()
    else if (s.keyword('at')) at = parseCoordinate(s)
    else if (s.at('{')) {
      const text = s.balanced('{', '}').trim()
      return { kind: 'node', options, ...(name !== undefined ? { name } : {}), ...(at ? { at } : {}), text }
    } else if (s.keyword('foreach')) throw s.error('node foreach is not supported')
    else throw s.error('node: expected [options], (name), at (…) or {text}')
  }
}

/** `[opts] (name) at (c) {type=args}` in any order, ending at the braces. */
function parsePicItem(s: Scanner): PathItem {
  let options: Option[] = []
  let name: string | undefined
  let at: Coordinate | undefined
  for (;;) {
    if (s.at('[')) options = [...options, ...parseOptionList(s.balanced('[', ']'))]
    else if (s.at('(')) name = s.balanced('(', ')').trim()
    else if (s.keyword('at')) at = parseCoordinate(s)
    else if (s.at('{')) {
      const body = s.balanced('{', '}').trim()
      const eq = topLevelIndexOf(body, '=')
      const type = normalizeKey(eq === -1 ? body : body.slice(0, eq))
      const args = eq === -1 ? undefined : body.slice(eq + 1).trim()
      return { kind: 'pic', options, ...(name !== undefined ? { name } : {}), ...(at ? { at } : {}), type, ...(args !== undefined ? { args } : {}) }
    } else throw s.error('pic: expected [options], (name), at (…) or {type=…}')
  }
}

/** `[opts] (name) [at (c)]` — options only before the name; a `[` after it starts a path item. */
function parseCoordinateItem(s: Scanner): PathItem {
  const options = optionsOpt(s)
  if (!s.at('(')) throw s.error('coordinate: expected (name)')
  const name = s.balanced('(', ')').trim()
  const at = s.keyword('at') ? parseCoordinate(s) : undefined
  return { kind: 'coordinate', name, options, ...(at ? { at } : {}) }
}

function parseRadii(text: string, s: Scanner): { radius: Length; yRadius?: Length } {
  const parts = text.split(/\s+and\s+/)
  const radius = lengthOf(parts[0]!, s)
  if (parts.length === 1) return { radius }
  return { radius, yRadius: lengthOf(parts[1]!, s) }
}

// ─── coordinates ────────────────────────────────────────────────────

function parseCoordinate(s: Scanner): Coordinate {
  let relative: RelativeKind | undefined
  if (s.eat('++')) relative = 'update'
  else if (s.match(/^\+\s*\(/)) {
    s.eat('+')
    relative = 'keep'
  }
  const inner = s.balanced('(', ')')
  const c = coordinateOf(inner, s)
  if (!relative) return c
  if (c.kind === 'perpendicular' || c.kind === 'calc') throw s.error(`relative ${c.kind} coordinates are not supported`)
  return { ...c, relative }
}

/** The text between a coordinate's parentheses. */
export function coordinateOf(raw: string, s: Scanner): Coordinate {
  const text = raw.trim()
  if (text.startsWith('$') && text.endsWith('$')) {
    return { kind: 'calc', expr: parseCalc(text.slice(1, -1), s) }
  }
  if (/\bcs\s*:/.test(text)) throw s.error(`coordinate system "${text}" is not supported`)
  for (const form of ['|-', '-|'] as const) {
    const i = topLevelIndexOf2(text, form)
    if (i !== -1) {
      return {
        kind: 'perpendicular',
        form,
        a: coordinateOf(text.slice(0, i), s),
        b: coordinateOf(text.slice(i + 2), s),
      }
    }
  }
  const parts = splitTopLevel(text, ',')
  if (parts.length === 3) throw s.error(`3D coordinate (${text}) is not supported`)
  if (parts.length === 2) {
    return { kind: 'cartesian', x: lengthOf(parts[0]!, s), y: lengthOf(parts[1]!, s) }
  }
  const polar = splitTopLevel(text, ':')
  if (polar.length === 2) {
    if (/\band\b/.test(polar[1]!)) throw s.error('elliptical polar coordinates are not supported')
    return { kind: 'polar', angle: numberOf(polar[0]!, s), radius: lengthOf(polar[1]!, s) }
  }
  if (text.length === 0) throw s.error('empty coordinate')
  if (/^[-+.\d]/.test(text)) throw s.error(`cannot read coordinate (${text})`)
  const dot = text.indexOf('.')
  if (dot === -1) return { kind: 'named', name: text }
  return { kind: 'named', name: text.slice(0, dot).trim(), anchor: text.slice(dot + 1).trim() }
}

function topLevelIndexOf2(text: string, needle: string): number {
  let depth = 0
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!
    if (c === '{' || c === '[' || c === '(') depth++
    else if (c === '}' || c === ']' || c === ')') depth--
    else if (depth === 0 && text.startsWith(needle, i)) return i
  }
  return -1
}

const PLAIN_NUMBER = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i
const PLAIN_LENGTH = /^([-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)\s*(cm|mm|pt|bp|in|em|ex|px)?$/i

function numberOf(text: string, s: Scanner): number {
  const t = text.trim()
  if (!PLAIN_NUMBER.test(t)) throw s.error(`"${t}" is an expression — TikZ would evaluate it with pgfmath, which is not supported; write the value`)
  return Number(t)
}

function lengthOf(text: string, s: Scanner): Length {
  const m = PLAIN_LENGTH.exec(text.trim())
  if (!m) throw s.error(`"${text.trim()}" is an expression — TikZ would evaluate it with pgfmath, which is not supported; write the value`)
  return m[2] ? { value: Number(m[1]), unit: m[2].toLowerCase() } : { value: Number(m[1]) }
}

// ─── calc ───────────────────────────────────────────────────────────

/**
 * The calc library, manual §13.5: a sum of `factor*(coordinate)` terms,
 * each coordinate optionally modified by `!t!`, `!d!`, `!(P)!` and
 * `!t!θ:` chains.
 */
function parseCalc(text: string, outer: Scanner): CalcExpr {
  const s = new Scanner(text)
  const terms: { factor: number; expr: CalcExpr }[] = []
  while (!s.done) {
    let sign = 1
    if (s.eat('-')) sign = -1
    else s.eat('+')
    let factor = 1
    const save = s.pos
    const n = s.number()
    if (n !== undefined && s.eat('*')) factor = n
    else s.pos = save
    if (!s.at('(')) throw outer.error(`calc: expected "(" in ($${text}$)`)
    let expr: CalcExpr = { kind: 'coord', coord: coordinateOf(s.balanced('(', ')'), outer) }
    while (s.eat('!')) {
      if (s.at('(')) {
        const p: CalcExpr = { kind: 'coord', coord: coordinateOf(s.balanced('(', ')'), outer) }
        s.expect('!')
        const b: CalcExpr = { kind: 'coord', coord: coordinateOf(s.balanced('(', ')'), outer) }
        expr = { kind: 'project', a: expr, p, b }
        continue
      }
      const mod = s.length()
      if (mod === undefined) throw outer.error(`calc: expected a factor after "!" in ($${text}$)`)
      s.expect('!')
      let b: CalcExpr
      const angleSave = s.pos
      const angle = s.number()
      if (angle !== undefined && s.eat(':')) {
        b = { kind: 'rotateAround', p: { kind: 'coord', coord: coordinateOf(s.balanced('(', ')'), outer) }, about: expr, angle }
      } else {
        s.pos = angleSave
        b = { kind: 'coord', coord: coordinateOf(s.balanced('(', ')'), outer) }
      }
      expr = mod.unit ? { kind: 'towardBy', a: expr, b, distance: mod } : { kind: 'toward', a: expr, b, t: mod.value }
    }
    terms.push({ factor: sign * factor, expr })
  }
  if (terms.length === 0) throw outer.error('calc: empty expression')
  if (terms.length === 1 && terms[0]!.factor === 1) return terms[0]!.expr
  return { kind: 'sum', terms }
}

// ─── foreach ────────────────────────────────────────────────────────

function parseForeach(s: Scanner, start: number, at: Position): Statement {
  const variables: string[] = []
  for (;;) {
    const v = s.command()
    if (v === undefined) throw s.error('\\foreach: expected a \\variable')
    variables.push(v)
    if (!s.eat('/')) break
  }
  const options = optionsOpt(s)
  if (!s.keyword('in')) throw s.error('\\foreach: expected "in"')
  const list = s.balanced('{', '}')
  let body: string
  if (s.at('{')) {
    body = s.balanced('{', '}')
  } else {
    // A single statement: everything through its top-level `;`. It is
    // parsed after substitution, when `\x` has become a number.
    s.skip()
    body = s.until(';')
    if (!s.eat(';')) throw s.error('\\foreach: body statement is missing its ";"')
    body += ';'
  }
  return { kind: 'foreach', variables, list, options, body: body.trim(), source: s.slice(start), at }
}
