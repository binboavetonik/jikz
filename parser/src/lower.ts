/**
 * AST → IR. The one place TikZ semantics turn into jikz calls.
 *
 * Coordinates stay in the picture's frame (TikZ numbers, y up) — the
 * picture is built with `frame: 'math'` and does the port at render
 * time, so a `(1,2)` in the source is a `(1, 2)` in the IR. Lengths
 * with units become frame units (`2cm` is `2` when the unit is a cm).
 *
 * Two modes: `dsl` throws `JikzError('unsupported')` on the first
 * statement it cannot lower (the template is a jikz feature and a gap
 * is a bug), `file` turns it into a `skipped` item (decision 2 — the
 * eject path keeps the file compiling and names the gap).
 *
 * Styles are TikZ's: `name/.style={…}` records the options and using
 * `name` inlines them, `#1` replaced by the value; `every node` and
 * friends are styles the lowering applies by itself. That state is a
 * {@link TikzState}, scoped like TikZ scopes it and, for the DSL, kept
 * per picture across template calls.
 */
import { JikzError, cm, length, pt } from 'jikz'
import type { CalcExpr, Coordinate, Length, Option, PathItem, PictureAst, RelativeKind, Statement } from './ast'
import type { IrItem, IrOp, IrPoint, IrRecord, IrShape, IrValue } from './ir'
import { KeyError, mapOptions, opposite, type KeyContext, type KeyEnv, type MappedOptions } from './keys'
import { coordinateOf, parseOptionList, parseStatements } from './parse'
import { Scanner } from './scan'

export interface LowerOptions {
  /** `dsl` throws on a gap; `file` (default) records it as `skipped`. */
  mode?: 'dsl' | 'file'
  /** Px per frame unit — the picture's `unit`. Default `cm(1)`. */
  unit?: number
  /** Names for anonymous nodes. Default: `tikz-1`, `tikz-2`, … per call. */
  names?: () => string
  /** Styles and defaults carried over from earlier statements (the DSL keeps one per picture). */
  state?: TikzState
}

/** What `\tikzset` and scope options change: styles, `>=`, `node distance`. */
export interface TikzState {
  /** `name` → the option text of `name/.style={…}`. */
  styles: Map<string, string>
  /** What `>` stands for in `->`. */
  tip?: string
  /** `node distance`. TikZ's default is 1cm. */
  nodeDistance: IrValue
  /** Tree placement: `level distance`, `sibling distance` (15mm each), `grow` (down). */
  tree: { levelDistance: IrValue; siblingDistance: IrValue; grow: number; swap: boolean }
}

export function createState(): TikzState {
  return {
    // TikZ: `\tikzset{edge from parent/.style={draw}}`
    styles: new Map([['edge from parent', 'draw']]),
    nodeDistance: { $len: '1cm' },
    tree: { levelDistance: { $len: '15mm' }, siblingDistance: { $len: '15mm' }, grow: -90, swap: false },
  }
}

class Unsupported extends Error {
  constructor(reason: string) {
    super(reason)
    this.name = 'Unsupported'
  }
}

export function lower(ast: PictureAst | readonly Statement[], options: LowerOptions = {}): IrItem[] {
  let counter = 0
  const ctx: Ctx = {
    mode: options.mode ?? 'file',
    unit: options.unit ?? cm(1),
    names: options.names ?? (() => `tikz-${++counter}`),
    state: options.state ?? createState(),
  }
  if (Array.isArray(ast)) return lowerStatements(ast as readonly Statement[], ctx)
  const picture = ast as PictureAst
  if (picture.options.length === 0) return lowerStatements(picture.body, ctx)
  // `\begin{tikzpicture}[opts]` is a scope around the body, as in TikZ.
  const scope: Statement = {
    kind: 'scope',
    options: picture.options,
    body: picture.body,
    source: `\\begin{tikzpicture}[${picture.options.map((o) => (o.value === undefined ? o.key : `${o.key}=${o.value}`)).join(', ')}]`,
    at: { line: 1, column: 1 },
  }
  return lowerStatements([scope], ctx)
}

interface Ctx {
  readonly mode: 'dsl' | 'file'
  readonly unit: number
  readonly names: () => string
  readonly state: TikzState
}

function lowerStatements(statements: readonly Statement[], ctx: Ctx): IrItem[] {
  const out: IrItem[] = []
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]!
    try {
      if (stmt.kind === 'path' && stmt.verb === 'clip') {
        // `\clip` applies to everything after it in the same body.
        const shape = clipShape(stmt, ctx)
        const body = lowerStatements(statements.slice(i + 1), ctx)
        out.push({ kind: 'clip', source: stmt.source, shape, body })
        return out
      }
      out.push(...lowerStatement(stmt, ctx))
    } catch (e) {
      if (!(e instanceof Unsupported) && !(e instanceof KeyError)) throw e
      if (ctx.mode === 'dsl') {
        throw new JikzError(
          'unsupported',
          `tikz: line ${stmt.at.line}:${stmt.at.column}: ${e.message}\n  in: ${stmt.source}`
        )
      }
      out.push({ kind: 'skipped', source: stmt.source, reason: e.message, line: stmt.at.line })
    }
  }
  return out
}

function lowerStatement(stmt: Statement, ctx: Ctx): IrItem[] {
  switch (stmt.kind) {
    case 'unsupported':
      throw new Unsupported(stmt.reason)
    case 'tikzset':
      applySet(stmt.options, ctx)
      return []
    case 'library':
      // The notation has every library's constructs it supports already.
      return []
    case 'scope':
      return [lowerScope(stmt, ctx)]
    case 'foreach':
      return lowerStatements(expandForeach(stmt), ctx)
    case 'path':
      return lowerPath(stmt, ctx)
  }
}

// ─── styles ─────────────────────────────────────────────────────────

const HANDLER = /^(.+?)\/\.(style|append style|code|initial|default|style 2 args|style n args|get|add|prefix style)$/

/**
 * Inline styles, as TikZ does when a key is used: a defined name is
 * replaced by its options (with `#1` substituted), recursively; a
 * `name/.style={…}` declaration records itself and produces nothing.
 */
function expand(options: readonly Option[], ctx: Ctx, depth = 0): Option[] {
  if (depth > 32) throw new Unsupported('style expansion does not terminate')
  const out: Option[] = []
  for (const o of options) {
    const handler = HANDLER.exec(o.key)
    if (handler) {
      const [, name, what] = handler
      if (what === 'style') ctx.state.styles.set(name!, o.value ?? '')
      else if (what === 'append style') ctx.state.styles.set(name!, [ctx.state.styles.get(name!), o.value ?? ''].filter(Boolean).join(', '))
      else throw new Unsupported(`"${o.key}": only /.style and /.append style are supported`)
      continue
    }
    const style = ctx.state.styles.get(o.key)
    if (style !== undefined && !o.quoted) {
      const text = style.replace(/#1/g, o.value ?? '')
      out.push(...expand(parseOptionList(text), ctx, depth + 1))
      continue
    }
    out.push(o)
  }
  return out
}

/** The options of an `every …` style, if defined. */
function every(name: string, ctx: Ctx): Option[] {
  const style = ctx.state.styles.get(`every ${name}`)
  return style === undefined ? [] : expand(parseOptionList(style), ctx)
}

/** `\tikzset{…}` outside any path: declarations and scope state. */
function applySet(options: readonly Option[], ctx: Ctx): void {
  const rest = expand(options, ctx)
  if (rest.length === 0) return
  const mapped = mapOptions(rest, 'scope', env(ctx))
  requireKnown(mapped, 'scope')
  applyState(mapped, ctx)
  if (mapped.style.length || mapped.transform || mapped.shiftPx || mapped.arrowEnd !== undefined) {
    throw new Unsupported(`\\tikzset{${rest[0]!.key}}: only style definitions, >= and node distance are supported here — put paint on the statements or a scope`)
  }
}

function applyState(mapped: MappedOptions, ctx: Ctx): void {
  if (mapped.tip !== undefined) ctx.state.tip = mapped.tip
  if (mapped.nodeDistance !== undefined) ctx.state.nodeDistance = mapped.nodeDistance
  if (mapped.tree) ctx.state.tree = treeState(ctx.state.tree, mapped.tree)
}

function treeState(base: TikzState['tree'], t: NonNullable<MappedOptions['tree']>): TikzState['tree'] {
  return {
    levelDistance: t.levelDistance ?? base.levelDistance,
    siblingDistance: t.siblingDistance ?? base.siblingDistance,
    grow: t.grow ?? base.grow,
    swap: t.grow !== undefined ? (t.swap ?? false) : base.swap,
  }
}

function env(ctx: Ctx, paint?: KeyEnv['paint']): KeyEnv {
  return { ...(ctx.state.tip !== undefined ? { tip: ctx.state.tip } : {}), ...(paint ? { paint } : {}) }
}

/** Map with styles expanded and the `every` defaults in front. */
function mapped(options: readonly Option[], context: KeyContext, ctx: Ctx, everyName?: string, paint?: KeyEnv['paint']): MappedOptions {
  const defaults = everyName ? every(everyName, ctx) : []
  const m = mapOptions([...defaults, ...expand(options, ctx)], context, env(ctx, paint))
  requireKnown(m, context)
  return m
}

// ─── helpers ────────────────────────────────────────────────────────

function requireKnown(m: MappedOptions, where: string): void {
  if (m.unknown.length === 0) return
  const o = m.unknown[0]!
  throw new Unsupported(`unknown ${where} key "${o.key}${o.value !== undefined ? '=' + o.value : ''}"${o.hint ? ` — ${o.hint}` : ''}`)
}

/** A TikZ length in frame units. */
function units(l: Length, ctx: Ctx): number {
  if (l.unit === undefined) return l.value
  if (l.unit === 'em') return (pt(10) * l.value) / ctx.unit
  if (l.unit === 'ex') return (pt(4.3) * l.value) / ctx.unit
  return length(`${l.value}${l.unit}`) / ctx.unit
}

function round(n: number): number {
  const r = Math.round(n * 1e9) / 1e9
  return Object.is(r, -0) ? 0 : r
}

// ─── points ─────────────────────────────────────────────────────────

function lowerPoint(c: Coordinate, ctx: Ctx): IrPoint {
  switch (c.kind) {
    case 'cartesian': {
      const x = units(c.x, ctx)
      const y = units(c.y, ctx)
      return relative(c.relative, x, y)
    }
    case 'polar': {
      const r = units(c.radius, ctx)
      const rad = (c.angle * Math.PI) / 180
      return relative(c.relative, round(r * Math.cos(rad)), round(r * Math.sin(rad)))
    }
    case 'named':
      if (c.relative) throw new Unsupported(`relative named coordinate ++(${c.name}) is not supported`)
      return { kind: 'name', ref: c.anchor === undefined ? c.name : `${c.name}.${c.anchor}` }
    case 'perpendicular': {
      const a = lowerPoint(c.a, ctx)
      const b = lowerPoint(c.b, ctx)
      // (p |- q): vertical through p meets horizontal through q → x of p, y of q.
      return c.form === '|-' ? { kind: 'perp', a, b } : { kind: 'perp', a: b, b: a }
    }
    case 'calc':
      return lowerCalc(c.expr, ctx)
  }
}

function relative(kind: RelativeKind | undefined, x: number, y: number): IrPoint {
  if (kind === undefined) return { kind: 'xy', x, y }
  if (kind === 'keep') throw new Unsupported('+(dx,dy) (a relative coordinate that does not move the pen) is not supported yet — use ++(dx,dy)')
  return { kind: 'rel', dx: x, dy: y }
}

function lowerCalc(e: CalcExpr, ctx: Ctx): IrPoint {
  switch (e.kind) {
    case 'coord': {
      const p = lowerPoint(e.coord, ctx)
      if (p.kind === 'rel') throw new Unsupported('relative coordinates inside ($…$) are not supported')
      return p
    }
    case 'toward':
      return { kind: 'toward', a: lowerCalc(e.a, ctx), b: lowerCalc(e.b, ctx), t: e.t }
    case 'towardBy':
      return { kind: 'towardBy', a: lowerCalc(e.a, ctx), b: lowerCalc(e.b, ctx), distance: units(e.distance, ctx) }
    case 'project':
      return { kind: 'project', a: lowerCalc(e.a, ctx), p: lowerCalc(e.p, ctx), b: lowerCalc(e.b, ctx) }
    case 'rotateAround':
      return { kind: 'rotateAround', p: lowerCalc(e.p, ctx), about: lowerCalc(e.about, ctx), angle: e.angle }
    case 'sum':
      return { kind: 'sum', terms: e.terms.map((t) => ({ factor: t.factor, p: lowerCalc(t.expr, ctx) })) }
  }
}

/** `p + (dx, dy)` in frame units. */
function plus(p: IrPoint, d: Extract<IrPoint, { kind: 'rel' }>): IrPoint {
  if (p.kind === 'rel') throw new Unsupported('relative from relative')
  if (p.kind === 'xy') return { kind: 'xy', x: round(p.x + d.dx), y: round(p.y + d.dy) }
  return { kind: 'sum', terms: [{ factor: 1, p }, { factor: 1, p: { kind: 'xy', x: d.dx, y: d.dy } }] }
}

/** `plot coordinates {(…) (…)}` — the points; other plot forms by name. */
function plotPoints(item: Extract<PathItem, { kind: 'plot' }>, ctx: Ctx): Coordinate[] {
  for (const o of item.options) {
    throw new Unsupported(`plot[${o.key}] is not supported yet — only plain "plot coordinates {…}" is`)
  }
  const m = /^plot\s*(?:\[[^\]]*\])?\s*coordinates\s*\{([\s\S]*)\}$/.exec(item.source.trim())
  if (!m) throw new Unsupported('only "plot coordinates {…}" is supported — function and file plots need pgfmath or a file')
  const s = new Scanner(m[1]!)
  const out: Coordinate[] = []
  while (!s.done) {
    const c = coordinateOf(s.balanced('(', ')'), s)
    if (c.kind !== 'perpendicular' && c.kind !== 'calc' && c.relative) throw new Unsupported('relative coordinates in a plot')
    out.push(c)
  }
  if (out.length === 0) throw new Unsupported('plot coordinates {} has no points')
  void ctx
  return out
}

/** `\clip` forms the frame can map: a rectangle, a circle, or a polygon. */
function clipShape(stmt: PathStmt, ctx: Ctx): IrShape {
  if (stmt.options.length) throw new Unsupported('options on \\clip are not supported')
  const items = stmt.items
  const abs = (c: Coordinate): IrPoint => {
    const p = lowerPoint(c, ctx)
    if (p.kind === 'rel') throw new Unsupported('a relative coordinate in \\clip')
    return p
  }
  if (items.length === 3 && items[0]!.kind === 'coord' && items[1]!.kind === 'rectangle' && items[2]!.kind === 'coord') {
    const a = abs(items[0]!.coord)
    const b = abs(items[2]!.coord)
    if (a.kind !== 'xy' || b.kind !== 'xy') throw new Unsupported('\\clip rectangle needs plain coordinates')
    return { kind: 'rect', x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(b.x - a.x), height: Math.abs(b.y - a.y) }
  }
  if (items.length === 2 && items[0]!.kind === 'coord' && items[1]!.kind === 'circle') {
    const r = radiiOptions(items[1]!, ctx)
    if (r.radius === undefined) throw new Unsupported('\\clip circle needs one radius')
    return { kind: 'circle', center: abs(items[0]!.coord), radius: r.radius }
  }
  const ops: IrOp[] = []
  let expectCoord = true
  for (const item of items) {
    if (item.kind === 'coord' && expectCoord) {
      ops.push({ op: ops.length === 0 ? 'moveTo' : 'lineTo', to: abs(item.coord) })
      expectCoord = false
    } else if (item.kind === 'op' && item.op === '--' && !expectCoord) {
      expectCoord = true
    } else if (item.kind === 'cycle' && expectCoord && ops.length > 1) {
      ops.push({ op: 'close' })
      expectCoord = false
    } else {
      throw new Unsupported('\\clip supports (a) rectangle (b), (c) circle (r), and polygons with -- and cycle')
    }
  }
  if (ops.length < 3) throw new Unsupported('\\clip polygon needs at least three points')
  return { kind: 'path', ops }
}

/** `p` moved by a px vector, in frame terms. */
function shifted(p: IrPoint, shiftPx: { dx: number; dy: number }, ctx: Ctx): IrPoint {
  if (p.kind === 'rel') throw new Unsupported('xshift/yshift on a relative coordinate')
  const d = { kind: 'xy' as const, x: round(shiftPx.dx / ctx.unit), y: round(shiftPx.dy / ctx.unit) }
  if (p.kind === 'xy') return { kind: 'xy', x: round(p.x + d.x), y: round(p.y + d.y) }
  return { kind: 'sum', terms: [{ factor: 1, p }, { factor: 1, p: d }] }
}

// ─── nodes ──────────────────────────────────────────────────────────

type NodeItem = Extract<PathItem, { kind: 'node' }>

function styleOf(m: MappedOptions): IrValue[] {
  const style: IrValue[] = [...m.style]
  if (m.gradient) style.push({ gradient: m.gradient })
  return style
}

/** The `pic.node()` option bag for a node item. */
function nodeOptions(item: NodeItem, ctx: Ctx, onPath: boolean): { name: string; options: Record<string, IrValue | undefined>; mapped: MappedOptions } {
  const m = mapped(item.options, 'node', ctx, 'node')
  if (m.arrowStart !== undefined || m.arrowEnd !== undefined) throw new Unsupported('arrow tips on a node')
  if (Object.keys(m.to).length || m.loop !== undefined) throw new Unsupported(`"${Object.keys(m.to)[0] ?? 'loop'}" on a node`)
  const name = item.name ?? m.name ?? ctx.names()
  // A TikZ node paints nothing unless told to: no border, no fill.
  const style: IrValue[] = [{ stroke: 'none', fill: 'none' }, ...styleOf(m)]
  const labels = m.labels.map((l) => withEvery(l, 'label', ctx))
  const pins = m.pins.map((l) => withEvery(l, 'pin', ctx))
  const node = { ...m.node }
  if (typeof node.rightOf === 'string' || typeof node.leftOf === 'string' || typeof node.above === 'string' || typeof node.below === 'string' || typeof node.aboveLeft === 'string' || typeof node.aboveRight === 'string' || typeof node.belowLeft === 'string' || typeof node.belowRight === 'string') {
    if (node.distance === undefined) node.distance = ctx.state.nodeDistance
  }
  const options: Record<string, IrValue | undefined> = {
    text: item.text,
    ...node,
    style,
    ...(Object.keys(m.textStyle).length ? { textStyle: m.textStyle } : {}),
    ...(labels.length ? { labels } : {}),
    ...(pins.length ? { pins } : {}),
  }
  if (onPath) {
    if (m.pos !== undefined) options.pos = m.pos
    if (m.sloped) throw new Unsupported('sloped on a path node is not supported yet')
    if (m.shiftPx) {
      // The pen places the node in screen px; the shift follows, y flipped.
      options.dx = round(m.shiftPx.dx)
      options.dy = round(-m.shiftPx.dy)
    }
  } else if (m.pos !== undefined || m.sloped) {
    throw new Unsupported('pos/sloped on a node that is not on a path')
  }
  return { name, options, mapped: m }
}

/** `every label` / `every pin` text style folded under a label's own. */
function withEvery(label: IrRecord, kind: 'label' | 'pin', ctx: Ctx): IrRecord {
  const defaults = every(kind, ctx)
  if (defaults.length === 0) return label
  const m = mapOptions(defaults, 'label', env(ctx))
  requireKnown(m, 'label')
  const style = { ...m.textStyle, ...(label.style as IrRecord | undefined) }
  return { ...label, ...(Object.keys(style).length ? { style } : {}) }
}

// ─── path statements ────────────────────────────────────────────────

type PathStmt = Extract<Statement, { kind: 'path' }>
type CoordItem = Extract<PathItem, { kind: 'coord' }>
type EdgeItem = Extract<PathItem, { kind: 'edge' }>

function lowerPath(stmt: PathStmt, ctx: Ctx): IrItem[] {
  const verb = stmt.verb
  if (verb === 'clip') throw new Unsupported('\\clip inside a \\foreach body is not supported')
  if (verb === 'pattern' || verb === 'useasboundingbox') throw new Unsupported(`\\${verb} is not supported yet`)
  const mode = verb === 'shade' ? 'fill' : verb === 'shadedraw' ? 'filldraw' : verb
  const m = mapped(stmt.options, 'path', ctx, 'path', mode)
  const items = stmt.items

  // `\node …;` / `\coordinate …;` — a path whose only item is the node.
  if (items.length === 1 && items[0]!.kind === 'node') {
    if (verb !== 'path') throw new Unsupported(`\\${verb} with only a node`)
    const item = items[0]!
    const { name, options, mapped: nm } = nodeOptions(item, ctx, false)
    let at = item.at ? lowerPoint(item.at, ctx) : undefined
    if (at?.kind === 'rel') throw new Unsupported('a node at a relative coordinate')
    if (nm.shiftPx) {
      if (!at) throw new Unsupported('xshift/yshift on a placed node (right=of …) is not supported yet')
      at = shifted(at, nm.shiftPx, ctx)
    }
    return [{ kind: 'node', source: stmt.source, name, ...(at ? { at } : {}), options }]
  }
  if (items.length === 1 && items[0]!.kind === 'coordinate') {
    const item = items[0]!
    if (!item.at) throw new Unsupported('\\coordinate needs "at (…)"')
    if (item.options.length) throw new Unsupported('options on \\coordinate')
    const at = lowerPoint(item.at, ctx)
    if (at.kind === 'rel') throw new Unsupported('a coordinate at a relative position')
    return [{ kind: 'coordinate', source: stmt.source, name: item.name, at }]
  }

  if (items.length === 1 && items[0]!.kind === 'pic') return [lowerPic(stmt, items[0]!, m, ctx)]
  if (items.some((i) => i.kind === 'pic')) throw new Unsupported('a pic inside a longer path')
  if (items.some((i) => i.kind === 'child')) return lowerTree(stmt, m, ctx)
  if (items.some((i) => i.kind === 'edgeFromParent')) throw new Unsupported('"edge from parent" outside a child')

  const hasEdges = items.some((i) => i.kind === 'edge')
  if ((m.arrowStart !== undefined || m.arrowEnd !== undefined) && !hasEdges) {
    return [lowerArrowPath(stmt, m, ctx)]
  }
  if (Object.keys(m.to).length || m.loop !== undefined) throw new Unsupported(`"${Object.keys(m.to)[0] ?? 'loop'}" belongs on to[…] or edge[…]`)
  if (verb === 'shade' || verb === 'shadedraw') {
    if (!m.gradient) m.gradient = { type: 'linear', angle: 90, stops: [{ offset: 0, color: '#ffffff' }, { offset: 1, color: '#808080' }] }
  }

  const penOptions: Record<string, IrValue | undefined> = {
    ...(mode !== 'draw' ? { mode } : {}),
    ...(m.style.length || m.gradient ? { style: styleOf(m) } : {}),
    ...(m.shortenStart !== undefined ? { shortenStart: m.shortenStart } : {}),
    ...(m.shortenEnd !== undefined ? { shortenEnd: m.shortenEnd } : {}),
  }
  if (m.labels.length) throw new Unsupported('a quoted label on a path (use node{…})')

  const ops: IrOp[] = []
  const edges: IrItem[] = []
  let pending: PathItem | undefined
  let pendingNodes: NodeItem[] = []
  let hasPen = false
  let lastCoord: IrPoint | undefined
  // Where the pen is, when it can be known without drawing: `+(dx,dy)`
  // and `cycle` need it. An arc's end is not known here.
  let penPos: IrPoint | undefined
  let subpathStart: IrPoint | undefined

  const flushNodes = () => {
    for (const n of pendingNodes) {
      const { name, options } = nodeOptions(n, ctx, true)
      ops.push({ op: 'node', name, options: { pos: 0.5, ...options } })
    }
    pendingNodes = []
  }
  const requirePen = (what: string) => {
    if (!hasPen) throw new Unsupported(`"${what}" before the path has a starting point`)
  }

  /** A coordinate as a pen target, with the pen's position kept up to date. */
  const target = (coord: Coordinate): IrPoint => {
    if (coord.kind !== 'perpendicular' && coord.kind !== 'calc' && coord.relative === 'keep') {
      if (penPos === undefined) throw new Unsupported('+(…) after an operation whose end point is not known here (an arc); use ++(…) or an absolute coordinate')
      const d = lowerPoint({ ...coord, relative: 'update' }, ctx) as Extract<IrPoint, { kind: 'rel' }>
      return plus(penPos, d)
    }
    const to = lowerPoint(coord, ctx)
    penPos = to.kind === 'rel' ? (penPos ? plus(penPos, to) : undefined) : to
    return to
  }
  const place = (to: IrPoint) => {
    if (pending === undefined) {
      ops.push({ op: 'moveTo', to })
      subpathStart = penPos
    } else {
      ops.push(segment(pending, to, ctx))
      pending = undefined
      flushNodes()
    }
    hasPen = true
    lastCoord = to.kind === 'rel' ? undefined : to
  }

  for (const item of items) {
    switch (item.kind) {
      case 'coord': {
        place(target(item.coord))
        break
      }
      case 'child':
      case 'edgeFromParent':
      case 'pic':
        throw new Unsupported(`"${item.kind}" here`)
      case 'plot': {
        const points = plotPoints(item, ctx)
        if (pending !== undefined && (pending.kind !== 'op' || pending.op !== '--')) throw new Unsupported(`plot after ${pending.kind}`)
        // `plot` starts with a move, `-- plot` with a line (tikz.code.tex).
        points.forEach((p, i) => {
          if (i > 0) pending = { kind: 'op', op: '--' }
          place(target(p))
        })
        break
      }
      case 'op':
      case 'controls':
      case 'to':
      case 'rectangle':
      case 'grid':
      case 'parabola':
      case 'sin':
      case 'cos':
        requirePen(item.kind === 'op' ? item.op : item.kind)
        if (pending !== undefined) throw new Unsupported(`two path operations in a row`)
        pending = item
        break
      case 'cycle':
        requirePen('cycle')
        if (pending !== undefined && (pending.kind !== 'op' || pending.op !== '--')) {
          throw new Unsupported(`"cycle" after ${pending.kind}`)
        }
        pending = undefined
        ops.push({ op: 'close' })
        penPos = subpathStart
        flushNodes()
        break
      case 'arc':
        requirePen('arc')
        ops.push({ op: 'arc', options: arcOptions(item, ctx) })
        lastCoord = undefined
        penPos = undefined
        break
      case 'circle':
      case 'ellipse': {
        requirePen(item.kind)
        const r = radiiOptions(item, ctx)
        if (item.kind === 'ellipse' && r.xRadius === undefined) throw new Unsupported('ellipse needs x radius and y radius')
        ops.push(
          item.kind === 'ellipse'
            ? { op: 'ellipse', xRadius: r.xRadius as number, yRadius: r.yRadius as number }
            : { op: 'circle', options: r }
        )
        break
      }
      case 'node':
        if (item.at) throw new Unsupported('"at" on a node inside a path')
        if (pending !== undefined) {
          pendingNodes.push(item)
        } else {
          requirePen('node')
          const { name, options } = nodeOptions(item, ctx, true)
          ops.push({ op: 'node', name, options })
        }
        break
      case 'coordinate':
        requirePen('coordinate')
        if (item.at) throw new Unsupported('"at" on a coordinate inside a path')
        if (item.options.length) throw new Unsupported('options on a path coordinate')
        ops.push({ op: 'coordinate', name: item.name })
        break
      case 'options': {
        const o = mapped(item.options, 'path', ctx, undefined, mode)
        if (o.arrowStart !== undefined || o.arrowEnd !== undefined) throw new Unsupported('arrow tips mid-path')
        ops.push({ op: 'push', options: { ...(o.style.length ? { style: styleOf(o) } : {}) } })
        break
      }
      case 'edge': {
        requirePen('edge')
        if (pending !== undefined) throw new Unsupported('"edge" right after a path operation')
        if (lastCoord === undefined) throw new Unsupported('"edge" needs a plain coordinate before it (not a relative one or an arc)')
        edges.push(lowerEdgeItem(item, lastCoord, stmt, m, ctx))
        break
      }
    }
  }
  if (pending !== undefined) throw new Unsupported(`path ends after "${pending.kind === 'op' ? pending.op : pending.kind}"`)
  if (pendingNodes.length) flushNodes()
  // `\draw (a) edge (b);` — a path of bare moves paints nothing; skip the empty pen.
  const paintsNothing = ops.every((op) => op.op === 'moveTo')
  const pen = { kind: 'pen' as const, source: stmt.source, options: penOptions, ops }

  // Decorations: `decorate` replaces the path by its decoration; a
  // `pre`/`postaction` decoration paints under/over the path itself.
  const decorated = (d: MappedOptions, paint: MappedOptions): IrItem => decoratedItem(stmt, mode, d, paint, ops, ctx)
  if (m.decorate) {
    if (!m.decoration) throw new Unsupported('decorate without a decoration')
    // Path nodes still need their positions: an invisible pen carries them.
    const nodes = ops.filter((op) => op.op === 'node' || op.op === 'coordinate')
    const carrier = nodes.length ? [{ kind: 'pen' as const, source: stmt.source, options: { mode: 'path' }, ops }] : []
    return [decorated(m, m), ...carrier, ...edges]
  }
  const pre = m.preaction ? [decorated(m.preaction, m)] : []
  const post = m.postaction ? [decorated(m.postaction, m)] : []
  return [...pre, ...(paintsNothing ? [] : [pen]), ...post, ...edges]
}

function segment(pending: PathItem, to: IrPoint, ctx: Ctx, pathGrid?: IrRecord): IrOp {
  switch (pending.kind) {
    case 'op':
      return { op: pending.op === '--' ? 'lineTo' : pending.op === '-|' ? 'hvTo' : 'vhTo', to }
    case 'controls': {
      const c1 = lowerPoint(pending.c1, ctx)
      const c2 = pending.c2 ? lowerPoint(pending.c2, ctx) : c1
      if (c1.kind === 'rel' || c2.kind === 'rel') throw new Unsupported('relative control points')
      return { op: 'curveTo', c1, c2, to }
    }
    case 'to': {
      const m = mapped(pending.options, 'to', ctx, 'to')
      if (m.style.length || m.arrowEnd !== undefined || m.arrowStart !== undefined || m.loop !== undefined) {
        throw new Unsupported('style, arrow or loop keys on to[…] inside a path')
      }
      return { op: 'to', to, options: m.to }
    }
    case 'rectangle':
      return { op: 'rectangle', to }
    case 'sin':
    case 'cos':
      return { op: pending.kind, to }
    case 'grid': {
      // Grid steps are frame lengths: `step=0.5` is half a unit, `step=1cm` a length.
      const options: Record<string, IrValue> = {}
      for (const [k, v] of Object.entries(pathGrid ?? {})) if (v !== undefined) options[k] = lengthUnits((v as { $len: string }).$len, ctx)
      for (const o of pending.options) {
        if ((o.key === 'step' || o.key === 'xstep' || o.key === 'ystep') && o.value !== undefined) {
          options[o.key] = lengthUnits(o.value, ctx)
        } else if (o.key === 'help lines' && o.value === undefined) {
          throw new Unsupported('grid[help lines] — put "help lines" on the \\draw instead')
        } else throw new Unsupported(`unknown grid key "${o.key}"`)
      }
      return { op: 'grid', to, options }
    }
    case 'parabola': {
      if (pending.options.length) throw new Unsupported('parabola options')
      const bend = pending.bend ? lowerPoint(pending.bend, ctx) : undefined
      if (bend?.kind === 'rel') throw new Unsupported('relative parabola bend')
      return { op: 'parabola', to, ...(bend ? { bend } : {}) }
    }
    default:
      throw new Unsupported(`${pending.kind} as a segment`)
  }
}

function lengthUnits(value: string, ctx: Ctx): number {
  const m = /^([-+]?[\d.]+)\s*([a-z]*)$/i.exec(value.trim())
  if (!m) throw new Unsupported(`"${value}" is not a length`)
  return units({ value: Number(m[1]), ...(m[2] ? { unit: m[2].toLowerCase() } : {}) }, ctx)
}

function arcOptions(item: Extract<PathItem, { kind: 'arc' }>, ctx: Ctx): IrRecord {
  const o: Record<string, IrValue> = {}
  if (item.legacy) {
    o.start = item.legacy.start
    o.end = item.legacy.end
    if (item.legacy.yRadius) {
      o.xRadius = units(item.legacy.radius, ctx)
      o.yRadius = units(item.legacy.yRadius, ctx)
    } else o.radius = units(item.legacy.radius, ctx)
  }
  for (const k of item.options) {
    if (k.value === undefined) throw new Unsupported(`unknown arc key "${k.key}"`)
    switch (k.key) {
      case 'start angle':
        o.start = Number(k.value)
        break
      case 'end angle':
        o.end = Number(k.value)
        break
      case 'delta angle':
        o.delta = Number(k.value)
        break
      case 'radius':
        o.radius = lengthUnits(k.value, ctx)
        break
      case 'x radius':
        o.xRadius = lengthUnits(k.value, ctx)
        break
      case 'y radius':
        o.yRadius = lengthUnits(k.value, ctx)
        break
      default:
        throw new Unsupported(`unknown arc key "${k.key}"`)
    }
  }
  return o
}

function radiiOptions(item: Extract<PathItem, { kind: 'circle' | 'ellipse' }>, ctx: Ctx): Record<string, number | undefined> {
  const o: Record<string, number | undefined> = {}
  if (item.legacy) {
    if (item.legacy.yRadius) {
      o.xRadius = units(item.legacy.radius, ctx)
      o.yRadius = units(item.legacy.yRadius, ctx)
    } else o.radius = units(item.legacy.radius, ctx)
  }
  for (const k of item.options) {
    if (k.value === undefined) throw new Unsupported(`unknown ${item.kind} key "${k.key}"`)
    if (k.key === 'radius') o.radius = lengthUnits(k.value, ctx)
    else if (k.key === 'x radius') o.xRadius = lengthUnits(k.value, ctx)
    else if (k.key === 'y radius') o.yRadius = lengthUnits(k.value, ctx)
    else throw new Unsupported(`unknown ${item.kind} key "${k.key}"`)
  }
  if (item.kind === 'ellipse' && o.radius !== undefined && o.xRadius === undefined) {
    o.xRadius = o.radius
    o.yRadius = o.radius
    delete o.radius
  }
  return o
}

// ─── edges ──────────────────────────────────────────────────────────

/** A path node as an edge label. */
function edgeLabel(item: NodeItem, defaultPos: number, ctx: Ctx): IrRecord {
  const { options, mapped: nm } = nodeOptions(item, ctx, true)
  const anchor = nm.node.anchor
  return {
    text: item.text,
    pos: nm.pos ?? defaultPos,
    ...(anchor !== undefined ? { at: opposite(String(anchor)) } : {}),
    ...(options.textStyle !== undefined ? { style: options.textStyle } : {}),
    ...(nm.sloped ? { sloped: true } : {}),
  }
}

/** `pic.edge()` options from the path's paint, the routing and the labels. */
function edgeOptions(paint: MappedOptions, routing: MappedOptions | undefined, labels: IrRecord[]): Record<string, IrValue | undefined> {
  const r = routing?.to ?? {}
  const bend = r.bend ?? paint.to.bend
  const loop = routing?.loop ?? paint.loop
  const style = [...styleOf(paint), ...(routing ? styleOf(routing) : [])]
  const arrowStart = routing?.arrowStart ?? paint.arrowStart
  const arrowEnd = routing?.arrowEnd ?? paint.arrowEnd
  return {
    ...(arrowStart !== undefined ? { arrowStart } : {}),
    ...(arrowEnd !== undefined ? { arrowEnd } : {}),
    ...(loop !== undefined ? { loop } : {}),
    ...(bend !== undefined ? { bendAngle: bend as number } : {}),
    ...(r.out !== undefined ? { out: r.out } : {}),
    ...(r.in !== undefined ? { in: r.in } : {}),
    ...(r.looseness !== undefined ? { looseness: r.looseness } : {}),
    ...(paint.shortenStart !== undefined ? { shortenStart: paint.shortenStart } : {}),
    ...(paint.shortenEnd !== undefined ? { shortenEnd: paint.shortenEnd } : {}),
    ...(style.length ? { style } : {}),
    ...(labels.length ? { labels } : {}),
  }
}

/**
 * `\draw[->] (a) -- (b)` and `\draw[->] (a) to[bend left] (b)` — the
 * pen has no arrow tips, so a one-segment path with tips is an edge,
 * which has them. Path nodes become the edge's labels.
 */
function lowerArrowPath(stmt: PathStmt, m: MappedOptions, ctx: Ctx): IrItem {
  const coords = stmt.items.filter((i): i is CoordItem => i.kind === 'coord')
  const ops = stmt.items.filter((i) => i.kind === 'op' || i.kind === 'to')
  const others = stmt.items.filter((i) => i.kind !== 'coord' && i.kind !== 'op' && i.kind !== 'to' && i.kind !== 'node')
  if (coords.length !== 2 || ops.length !== 1 || others.length !== 0 || stmt.items[0]!.kind !== 'coord') {
    throw new Unsupported('arrow tips on anything but a single segment (a) -- (b) / (a) to[…] (b) are not supported yet')
  }
  const op = ops[0]!
  if (op.kind === 'op' && op.op !== '--') throw new Unsupported(`arrow tips on ${op.op}`)
  const from = lowerPoint(coords[0]!.coord, ctx)
  const to = lowerPoint(coords[1]!.coord, ctx)
  if (from.kind === 'rel' || to.kind === 'rel') throw new Unsupported('relative coordinates on an edge')

  const routing = op.kind === 'to' ? mapped(op.options, 'to', ctx, 'to') : undefined
  const secondCoord = stmt.items.indexOf(coords[1]!)
  const labels = stmt.items.flatMap((item, i) => (item.kind === 'node' ? [edgeLabel(item, i < secondCoord ? 0.5 : 1, ctx)] : []))
  return { kind: 'edge', source: stmt.source, from, to, options: edgeOptions(m, routing, labels) }
}

/** `(a) edge[opts] node{…} (b)` — an edge from the coordinate before it. */
function lowerEdgeItem(item: EdgeItem, from: IrPoint, stmt: PathStmt, paint: MappedOptions, ctx: Ctx): IrItem {
  const to = lowerPoint(item.target, ctx)
  if (to.kind === 'rel') throw new Unsupported('a relative coordinate as an edge target')
  const routing = mapped(item.options, 'edge', ctx, 'edge')
  const labels = item.nodes.flatMap((n) => (n.kind === 'node' ? [edgeLabel(n, 0.5, ctx)] : []))
  const source = `${stmt.source.split('\n')[0]}`
  return { kind: 'edge', source, from, to, options: edgeOptions(paint, routing, labels) }
}

// ─── decorations ────────────────────────────────────────────────────

const DECORATION_DEFAULTS = { amplitude: { $len: '2.5pt' }, segmentLength: { $len: '10pt' } }

/**
 * The decorated path: the statement's segments (no operations the
 * `Path` builder lacks) decorated in screen space. pgf's defaults —
 * amplitude 2.5pt, segment length 10pt — apply. The brace bulges to
 * the left of the path in TikZ's frame, which is `side: 'right'` in
 * screen space; `mirror` flips it.
 */
function decoratedItem(stmt: PathStmt, mode: 'draw' | 'fill' | 'filldraw' | 'path', d: MappedOptions, paint: MappedOptions, ops: readonly IrOp[], ctx: Ctx): IrItem {
  void ctx
  const dec = d.decoration!
  const pathOps = ops.filter((op) => op.op !== 'node' && op.op !== 'coordinate')
  for (const op of pathOps) {
    if (!['moveTo', 'lineTo', 'hvTo', 'vhTo', 'curveTo', 'to', 'close'].includes(op.op)) {
      throw new Unsupported(`"${op.op}" on a decorated path is not supported yet (lines, curves, to and cycle are)`)
    }
  }
  if (pathOps.length < 2) throw new Unsupported('a decorated path needs at least one segment')
  const style = [...styleOf(paint), ...(d !== paint ? styleOf(d) : [])]
  const options: Record<string, IrValue | undefined> = style.length ? { style } : {}
  if (dec.name === 'markings') {
    return {
      kind: 'decorated',
      source: stmt.source,
      mode,
      options,
      ops: pathOps,
      decoration: { name: 'markings', marks: dec.marks!.map((mk) => ({ mark: mk.tip, at: mk.at })) },
    }
  }
  const decOptions: Record<string, IrValue> = {
    amplitude: dec.amplitude ?? DECORATION_DEFAULTS.amplitude,
    ...(dec.name === 'brace' ? { side: dec.mirror ? 'left' : 'right' } : { wavelength: dec.segmentLength ?? DECORATION_DEFAULTS.segmentLength }),
    ...(dec.aspect !== undefined ? { aspect: dec.aspect } : {}),
    // TikZ's random steps are random per run; a fixed seed keeps the picture reproducible.
    ...(dec.name === 'random' ? { seed: 1 } : {}),
  }
  return { kind: 'decorated', source: stmt.source, mode, options, ops: pathOps, decoration: { name: dec.name, options: decOptions } }
}

// ─── pics ───────────────────────────────────────────────────────────

type PicItem = Extract<PathItem, { kind: 'pic' }>

/**
 * The angles library: `\pic[draw, fill=…, "$\alpha$", angle radius=…]
 * {angle=A--B--C}` and `right angle`, onto `angle()`/`rightAngle()`
 * from the angles extension, painted by the verb — `\draw pic` — or
 * by the pic's own `draw`/`fill` keys (`pic actions`).
 */
function lowerPic(stmt: PathStmt, item: PicItem, m: MappedOptions, ctx: Ctx): IrItem {
  const pic = item.type === 'angle' ? 'angle' : item.type === 'right angle' ? 'rightAngle' : undefined
  if (!pic) throw new Unsupported(`pic "${item.type}" is not supported — only the angles library's "angle" and "right angle" are`)
  if (item.at) throw new Unsupported('"at" on an angle pic (its position is the corner)')
  if (item.name !== undefined) throw new Unsupported('a named pic')
  const names = (item.args ?? 'A--B--C').split('--').map((n) => n.trim())
  if (names.length !== 3 || names.some((n) => n.length === 0)) throw new Unsupported(`${item.type}=${item.args ?? ''}: expected A--B--C`)
  const pm = mapped(item.options, 'path', ctx, undefined, 'filldraw')
  if (pm.arrowEnd !== undefined || pm.arrowStart !== undefined) throw new Unsupported('arrow tips on a pic')
  // The verb paints, or the pic actions do: a `draw` key strokes, a `fill` key fills.
  const strokes = pm.style.some((e) => typeof e === 'object' && 'stroke' in e)
  const fills = pm.style.some((e) => typeof e === 'object' && 'fill' in e) || pm.gradient !== undefined
  const mode = stmt.verb !== 'path' ? (stmt.verb === 'shade' ? 'fill' : stmt.verb === 'shadedraw' ? 'filldraw' : stmt.verb) : strokes && fills ? 'filldraw' : strokes ? 'draw' : fills ? 'fill' : 'path'
  if (mode === 'clip' || mode === 'pattern' || mode === 'useasboundingbox') throw new Unsupported(`\\${mode} pic`)
  const label = pm.labels[0] ?? m.labels[0]
  const text = pm.pic?.text ?? m.pic?.text ?? (label ? String(label.text) : undefined)
  const labelStyle = label?.style
  const options: Record<string, IrValue | undefined> = {
    radius: pm.pic?.radius ?? m.pic?.radius ?? { $len: '5mm' },
    eccentricity: pm.pic?.eccentricity ?? m.pic?.eccentricity ?? 0.6,
    ...(text !== undefined ? { label: text } : {}),
    ...(labelStyle !== undefined ? { labelStyle } : {}),
  }
  const style = [...styleOf(m), ...styleOf(pm)]
  return {
    kind: 'pic',
    source: stmt.source,
    pic,
    points: [{ kind: 'name', ref: names[0]! }, { kind: 'name', ref: names[1]! }, { kind: 'name', ref: names[2]! }],
    mode,
    options,
    ...(style.length ? { style } : {}),
  }
}

// ─── trees ──────────────────────────────────────────────────────────

type ChildItem = Extract<PathItem, { kind: 'child' }>

/**
 * `\node {r} child {node {a}} child {node {b} child {…}};` — TikZ's
 * own placement (tikz.code.tex, `\tikz@grow@direction`): a child sits
 * at the parent plus `level distance` along the growth angle, plus
 * `(i - (n+1)/2) × sibling distance` along the growth angle + 90°.
 * Distances come from the state at each level (`level <n>` styles
 * apply first), anonymous children are named `parent-i`, and each
 * child's edge is `pic.edge(parent, child)` with `edge from parent`.
 */
function lowerTree(stmt: PathStmt, m: MappedOptions, ctx: Ctx): IrItem[] {
  const items = stmt.items
  const rootItem = items[0]
  if (!rootItem || rootItem.kind !== 'node' || items.slice(1).some((i) => i.kind !== 'child')) {
    throw new Unsupported('a tree is a node followed by child {…} items only')
  }
  if (m.style.length || m.arrowEnd !== undefined) throw new Unsupported('paint on the tree statement — put it on the nodes or on "edge from parent"')
  const { name, options, mapped: nm } = nodeOptions(rootItem, ctx, false)
  let at: IrPoint = rootItem.at ? lowerPoint(rootItem.at, ctx) : { kind: 'xy', x: 0, y: 0 }
  if (at.kind === 'rel') throw new Unsupported('a tree root at a relative coordinate')
  if (nm.shiftPx) at = shifted(at, nm.shiftPx, ctx)
  const out: IrItem[] = [{ kind: 'node', source: stmt.source.split('\n')[0]!, name, at, options }]
  const children = items.slice(1) as ChildItem[]
  // Tree keys may sit on the statement or on the root node itself.
  const tree = treeState(treeState(ctx.state.tree, m.tree ?? {}), nm.tree ?? {})
  out.push(...lowerChildren(children, name, at, 1, { ...ctx, state: { ...ctx.state, tree } }))
  return out
}

function lowerChildren(children: readonly ChildItem[], parent: string, parentAt: IrPoint, level: number, ctx: Ctx): IrItem[] {
  const out: IrItem[] = []
  const n = children.length
  children.forEach((child, index) => {
    const i = index + 1
    // Level state: `level <n>` and `every child` may set the distances or growth.
    const levelOptions = [...every('child', ctx), ...expand(parseOptionList(ctx.state.styles.get(`level ${level}`) ?? ''), ctx), ...expand(child.options, ctx)]
    const cm = mapOptions(levelOptions, 'path', env(ctx))
    requireKnown(cm, 'child')
    const tree = treeState(ctx.state.tree, cm.tree ?? {})
    const inner: Ctx = { ...ctx, state: { ...ctx.state, tree } }
    const ld = lengthUnits((tree.levelDistance as { $len: string }).$len, ctx)
    const sd = lengthUnits((tree.siblingDistance as { $len: string }).$len, ctx)
    const grow = (tree.grow * Math.PI) / 180
    const across = ((tree.swap ? -1 : 1) * (i - (n + 1) / 2) * sd)
    const dx = round(ld * Math.cos(grow) + across * Math.cos(grow + Math.PI / 2))
    const dy = round(ld * Math.sin(grow) + across * Math.sin(grow + Math.PI / 2))
    const at = plus(parentAt, { kind: 'rel', dx, dy })
    if (cm.missing) return

    const nodeItem = child.body.find((b) => b.kind === 'node')
    const edgeItem = child.body.find((b): b is Extract<PathItem, { kind: 'edgeFromParent' }> => b.kind === 'edgeFromParent')
    const grandchildren = child.body.filter((b): b is ChildItem => b.kind === 'child')
    if (child.body.some((b) => b.kind !== 'node' && b.kind !== 'child' && b.kind !== 'edgeFromParent')) {
      throw new Unsupported('a child holds a node, children and "edge from parent" only')
    }
    if (!nodeItem) throw new Unsupported(`child ${i} of ${parent} has no node`)
    if (nodeItem.at) throw new Unsupported('"at" on a child node')

    // The child's node: every child node, the level's paint, its own options.
    const paint = cm.style.length || Object.keys(cm.textStyle).length ? levelOptions.filter((o) => !/^(level distance|sibling distance|grow|grow'|missing)$/.test(o.key)) : []
    const named: NodeItem = { ...nodeItem, options: [...every('child node', ctx), ...paint, ...nodeItem.options], name: nodeItem.name ?? `${parent}-${i}` }
    const { name, options } = nodeOptions(named, inner, false)
    out.push({ kind: 'node', source: `child ${i} of ${parent}`, name, at, options })

    // The edge from the parent: the `edge from parent` style (TikZ: `draw`), then the child's own.
    const edgeOptions = expand([{ key: 'edge from parent' }, ...(edgeItem?.options ?? [])], inner)
    const em = mapOptions(edgeOptions, 'edge', env(inner))
    requireKnown(em, 'edge from parent')
    const labels = (edgeItem?.nodes ?? []).flatMap((l) => (l.kind === 'node' ? [edgeLabel(l, 0.5, inner)] : []))
    const style = styleOf(em).filter((e) => !(typeof e === 'object' && 'stroke' in e && e.stroke === '#000000' && Object.keys(e).length === 1))
    out.push({
      kind: 'edge',
      source: `edge from parent ${parent} -- ${name}`,
      from: { kind: 'name', ref: parent },
      to: { kind: 'name', ref: name },
      options: edgeOptions.length ? edgeOptionsFor(em, style, labels) : {},
    })
    out.push(...lowerChildren(grandchildren, name, at, level + 1, inner))
  })
  return out
}

function edgeOptionsFor(em: MappedOptions, style: IrValue[], labels: IrRecord[]): Record<string, IrValue | undefined> {
  return {
    ...(em.arrowStart !== undefined ? { arrowStart: em.arrowStart } : {}),
    ...(em.arrowEnd !== undefined ? { arrowEnd: em.arrowEnd } : {}),
    ...(em.to.bend !== undefined ? { bendAngle: em.to.bend as number } : {}),
    ...(em.to.out !== undefined ? { out: em.to.out } : {}),
    ...(em.to.in !== undefined ? { in: em.to.in } : {}),
    ...(em.shortenStart !== undefined ? { shortenStart: em.shortenStart } : {}),
    ...(em.shortenEnd !== undefined ? { shortenEnd: em.shortenEnd } : {}),
    ...(style.length ? { style } : {}),
    ...(labels.length ? { labels } : {}),
  }
}

// ─── scopes ─────────────────────────────────────────────────────────

function lowerScope(stmt: Extract<Statement, { kind: 'scope' }>, ctx: Ctx): IrItem {
  // A scope's state is its own: styles and defaults set inside stay inside.
  const inner: Ctx = { ...ctx, state: { ...ctx.state, styles: new Map(ctx.state.styles) } }
  const m = mapped(stmt.options, 'scope', inner)
  applyState(m, inner)
  if (m.missing) throw new Unsupported('"missing" on a scope')
  if (m.arrowStart !== undefined || m.arrowEnd !== undefined) throw new Unsupported('arrow tips on a scope are not supported yet')
  if (m.labels.length || m.pins.length) throw new Unsupported('labels on a scope')
  const options: Record<string, IrValue | undefined> = {
    ...(m.style.length || m.gradient ? { style: styleOf(m) } : {}),
  }
  const t = m.transform
  const shift = t?.shift || m.shiftPx
    ? {
        dx: round((t?.shift?.dx ?? 0) + (m.shiftPx?.dx ?? 0) / ctx.unit),
        dy: round((t?.shift?.dy ?? 0) + (m.shiftPx?.dy ?? 0) / ctx.unit),
      }
    : undefined
  const transform =
    shift || t?.rotate !== undefined || t?.scale !== undefined
      ? {
          ...(shift ? { shift } : {}),
          ...(t?.rotate !== undefined ? { rotate: t.rotate } : {}),
          ...(t?.scale !== undefined ? { scale: t.scale } : {}),
        }
      : undefined
  const body = lowerStatements(stmt.body, inner)
  return { kind: 'scope', source: stmt.source.split('\n')[0]!, options, ...(transform ? { transform } : {}), body }
}

// ─── foreach ────────────────────────────────────────────────────────

/**
 * `\foreach` without pgfmath: literal lists, `...` ranges with an
 * optional step, `/`-separated tuples, and `count=`. Each iteration
 * substitutes the variables into the body text and parses it.
 */
export function expandForeach(stmt: Extract<Statement, { kind: 'foreach' }>): Statement[] {
  let count: { name: string; from: number } | undefined
  for (const o of stmt.options) {
    const m = o.key === 'count' && o.value !== undefined ? /^\\([a-zA-Z@]+)(?:\s+from\s+(-?\d+))?$/.exec(o.value.trim()) : null
    if (m) count = { name: m[1]!, from: m[2] ? Number(m[2]) : 1 }
    else throw new Unsupported(`\\foreach key "${o.key}" is not supported`)
  }
  const rows = foreachRows(stmt.list)
  const out: Statement[] = []
  rows.forEach((row, i) => {
    let body = stmt.body
    const values = row.split('/').map((v) => v.trim())
    stmt.variables.forEach((v, j) => {
      const value = values[j] ?? values[values.length - 1]!
      body = body.replace(new RegExp(`\\\\${v}(?![a-zA-Z@])`, 'g'), () => value)
    })
    if (count) body = body.replace(new RegExp(`\\\\${count.name}(?![a-zA-Z@])`, 'g'), () => String(count!.from + i))
    for (const inner of parseStatements(body)) {
      out.push({ ...inner, at: stmt.at, source: `${inner.source}  % ${stmt.variables.map((v) => `\\${v}`).join('/')}=${row}` })
    }
  })
  return out
}

function foreachRows(list: string): string[] {
  const items = list.split(',').map((s) => s.trim()).filter((s) => s.length > 0)
  const out: string[] = []
  for (let i = 0; i < items.length; i++) {
    const item = items[i]!
    if (item !== '...') {
      out.push(item)
      continue
    }
    const prev = out[out.length - 1]
    const next = items[i + 1]
    if (prev === undefined || next === undefined) throw new Unsupported('\\foreach: "..." needs a value on both sides')
    const to = Number(next)
    const from = Number(prev)
    const before = out.length >= 2 ? Number(out[out.length - 2]) : undefined
    if (!Number.isFinite(from) || !Number.isFinite(to)) throw new Unsupported(`\\foreach: "..." between "${prev}" and "${next}"`)
    const step = before !== undefined && Number.isFinite(before) && before !== from ? from - before : to >= from ? 1 : -1
    if (step === 0 || (to - from) / step < 0) throw new Unsupported(`\\foreach: cannot step from ${from} to ${to} by ${step}`)
    for (let v = from + step; step > 0 ? v <= to + 1e-9 : v >= to - 1e-9; v += step) out.push(String(round(v)))
    i++ // the range end is consumed
  }
  return out
}
