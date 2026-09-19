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
 */
import { JikzError, cm, length, pt } from 'jikz'
import type { CalcExpr, Coordinate, Length, Option, PathItem, PictureAst, RelativeKind, Statement } from './ast'
import type { IrItem, IrOp, IrPoint, IrRecord, IrValue } from './ir'
import { KeyError, mapOptions, type MappedOptions } from './keys'
import { parseStatements } from './parse'

export interface LowerOptions {
  /** `dsl` throws on a gap; `file` (default) records it as `skipped`. */
  mode?: 'dsl' | 'file'
  /** Px per frame unit — the picture's `unit`. Default `cm(1)`. */
  unit?: number
  /** Names for anonymous nodes. Default: `tikz-1`, `tikz-2`, … per call. */
  names?: () => string
}

class Unsupported extends Error {
  constructor(reason: string) {
    super(reason)
    this.name = 'Unsupported'
  }
}

export function lower(ast: PictureAst | readonly Statement[], options: LowerOptions = {}): IrItem[] {
  const statements = Array.isArray(ast) ? (ast as readonly Statement[]) : (ast as PictureAst).body
  let counter = 0
  const ctx: Ctx = {
    mode: options.mode ?? 'file',
    unit: options.unit ?? cm(1),
    names: options.names ?? (() => `tikz-${++counter}`),
  }
  return lowerStatements(statements, ctx)
}

interface Ctx {
  readonly mode: 'dsl' | 'file'
  readonly unit: number
  readonly names: () => string
}

function lowerStatements(statements: readonly Statement[], ctx: Ctx): IrItem[] {
  const out: IrItem[] = []
  for (const stmt of statements) {
    try {
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
      throw new Unsupported('\\tikzset is not supported yet (styles land in M3)')
    case 'scope':
      return [lowerScope(stmt, ctx)]
    case 'foreach':
      return lowerStatements(expandForeach(stmt), ctx)
    case 'path':
      return [lowerPath(stmt, ctx)]
  }
}

// ─── helpers ────────────────────────────────────────────────────────

function requireKnown(mapped: MappedOptions, where: string): void {
  if (mapped.unknown.length === 0) return
  const o: Option = mapped.unknown[0]!
  throw new Unsupported(`unknown ${where} key "${o.key}${o.value !== undefined ? '=' + o.value : ''}"`)
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

function styleValue(mapped: MappedOptions): IrValue[] {
  return mapped.style
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

// ─── nodes ──────────────────────────────────────────────────────────

type NodeItem = Extract<PathItem, { kind: 'node' }>

/** The `pic.node()` option bag for a node item. */
function nodeOptions(item: NodeItem, ctx: Ctx, onPath: boolean): { name: string; options: IrRecord; mapped: MappedOptions } {
  const mapped = mapOptions(item.options, 'node')
  requireKnown(mapped, 'node')
  if (mapped.arrowStart !== undefined || mapped.arrowEnd !== undefined) throw new Unsupported('arrow tips on a node')
  if (Object.keys(mapped.to).length) throw new Unsupported(`"${Object.keys(mapped.to)[0]}" on a node`)
  const name = item.name ?? mapped.name ?? ctx.names()
  // A TikZ node paints nothing unless told to: no border, no fill.
  const style: IrValue[] = [{ stroke: 'none', fill: 'none' }, ...styleValue(mapped)]
  const options: Record<string, IrValue | undefined> = {
    text: item.text,
    ...mapped.node,
    style,
    ...(Object.keys(mapped.textStyle).length ? { textStyle: mapped.textStyle } : {}),
    ...(mapped.labels.length ? { labels: mapped.labels } : {}),
  }
  if (onPath) {
    if (mapped.pos !== undefined) options.pos = mapped.pos
    if (mapped.sloped) throw new Unsupported('sloped on a path node is not supported yet')
  } else if (mapped.pos !== undefined || mapped.sloped) {
    throw new Unsupported('pos/sloped on a node that is not on a path')
  }
  void ctx
  return { name, options, mapped }
}

// ─── path statements ────────────────────────────────────────────────

type PathStmt = Extract<Statement, { kind: 'path' }>

function lowerPath(stmt: PathStmt, ctx: Ctx): IrItem {
  const supportedVerb = stmt.verb === 'draw' || stmt.verb === 'fill' || stmt.verb === 'filldraw' || stmt.verb === 'path'
  if (!supportedVerb) throw new Unsupported(`\\${stmt.verb} is not supported yet`)
  const mode = stmt.verb
  const mapped = mapOptions(stmt.options, 'path')
  requireKnown(mapped, 'path')
  const items = stmt.items

  // `\node …;` / `\coordinate …;` — a path whose only item is the node.
  if (items.length === 1 && items[0]!.kind === 'node') {
    if (stmt.verb !== 'path') throw new Unsupported(`\\${stmt.verb} with only a node`)
    const item = items[0]!
    const { name, options } = nodeOptions(item, ctx, false)
    const at = item.at ? lowerPoint(item.at, ctx) : undefined
    if (at?.kind === 'rel') throw new Unsupported('a node at a relative coordinate')
    return { kind: 'node', source: stmt.source, name, ...(at ? { at } : {}), options }
  }
  if (items.length === 1 && items[0]!.kind === 'coordinate') {
    const item = items[0]!
    if (!item.at) throw new Unsupported('\\coordinate needs "at (…)"')
    if (item.options.length) throw new Unsupported('options on \\coordinate')
    const at = lowerPoint(item.at, ctx)
    if (at.kind === 'rel') throw new Unsupported('a coordinate at a relative position')
    return { kind: 'coordinate', source: stmt.source, name: item.name, at }
  }

  if (mapped.arrowStart !== undefined || mapped.arrowEnd !== undefined) {
    return lowerEdge(stmt, mapped, ctx)
  }
  if (Object.keys(mapped.to).length) throw new Unsupported(`"${Object.keys(mapped.to)[0]}" belongs on to[…]`)

  const penOptions: Record<string, IrValue | undefined> = {
    ...(mode !== 'draw' ? { mode } : {}),
    ...(mapped.style.length ? { style: styleValue(mapped) } : {}),
    ...(mapped.shortenStart !== undefined ? { shortenStart: mapped.shortenStart } : {}),
    ...(mapped.shortenEnd !== undefined ? { shortenEnd: mapped.shortenEnd } : {}),
  }
  if (mapped.labels.length) throw new Unsupported('a quoted label on a path (use node{…})')

  const ops: IrOp[] = []
  let pending: PathItem | undefined
  let pendingNodes: NodeItem[] = []
  let hasPen = false

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

  for (const item of items) {
    switch (item.kind) {
      case 'coord': {
        const to = lowerPoint(item.coord, ctx)
        if (pending === undefined) {
          ops.push({ op: 'moveTo', to })
        } else {
          ops.push(segment(pending, to, ctx))
          pending = undefined
          flushNodes()
        }
        hasPen = true
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
        flushNodes()
        break
      case 'arc':
        requirePen('arc')
        ops.push({ op: 'arc', options: arcOptions(item, ctx) })
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
        const m = mapOptions(item.options, 'path')
        requireKnown(m, 'path')
        if (m.arrowStart !== undefined || m.arrowEnd !== undefined) throw new Unsupported('arrow tips mid-path')
        ops.push({ op: 'push', options: { ...(m.style.length ? { style: styleValue(m) } : {}) } })
        break
      }
      case 'edge':
        throw new Unsupported('"edge" on a path is not supported yet — use \\draw[->] (a) -- (b)')
      case 'plot':
        throw new Unsupported('"plot" is not supported yet')
    }
  }
  if (pending !== undefined) throw new Unsupported(`path ends after "${pending.kind === 'op' ? pending.op : pending.kind}"`)
  if (pendingNodes.length) flushNodes()
  return { kind: 'pen', source: stmt.source, options: penOptions, ops }
}

function segment(pending: PathItem, to: IrPoint, ctx: Ctx): IrOp {
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
      const m = mapOptions(pending.options, 'to')
      requireKnown(m, 'to')
      if (m.style.length || m.arrowEnd !== undefined || m.arrowStart !== undefined) {
        throw new Unsupported('style or arrow keys on to[…] inside a path')
      }
      return { op: 'to', to, options: m.to }
    }
    case 'rectangle':
      return { op: 'rectangle', to }
    case 'sin':
    case 'cos':
      return { op: pending.kind, to }
    case 'grid': {
      const options: Record<string, IrValue> = {}
      for (const o of pending.options) {
        if ((o.key === 'step' || o.key === 'xstep' || o.key === 'ystep') && o.value !== undefined) {
          options[o.key] = lengthUnits(o.value, ctx)
        } else if (o.key === 'help lines' && o.value === undefined) {
          // TikZ `help lines` = thin, gray — a style on the whole path in
          // TikZ too; the pen has no per-op style, so it is not modelled.
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

/**
 * `\draw[->] (a) -- (b)` and `\draw[->] (a) to[bend left] (b)` — the
 * pen has no arrow tips, so a one-segment path with tips is an edge,
 * which has them. Path nodes become the edge's labels.
 */
function lowerEdge(stmt: PathStmt, mapped: MappedOptions, ctx: Ctx): IrItem {
  const coords = stmt.items.filter((i) => i.kind === 'coord')
  const ops = stmt.items.filter((i) => i.kind === 'op' || i.kind === 'to')
  const others = stmt.items.filter((i) => i.kind !== 'coord' && i.kind !== 'op' && i.kind !== 'to' && i.kind !== 'node')
  if (coords.length !== 2 || ops.length !== 1 || others.length !== 0 || stmt.items[0]!.kind !== 'coord') {
    throw new Unsupported('arrow tips on anything but a single segment (a) -- (b) / (a) to[…] (b) are not supported yet')
  }
  const op = ops[0]!
  if (op.kind === 'op' && op.op !== '--') throw new Unsupported(`arrow tips on ${op.op}`)
  const from = lowerPoint((coords[0] as Extract<PathItem, { kind: 'coord' }>).coord, ctx)
  const to = lowerPoint((coords[1] as Extract<PathItem, { kind: 'coord' }>).coord, ctx)
  if (from.kind === 'rel' || to.kind === 'rel') throw new Unsupported('relative coordinates on an edge')

  const routing = op.kind === 'to' ? mapOptions(op.options, 'to') : undefined
  if (routing) requireKnown(routing, 'to')
  const bend = routing?.to.bend ?? mapped.to.bend
  const labels: IrRecord[] = []
  const secondCoord = stmt.items.indexOf(coords[1]!)
  stmt.items.forEach((item, i) => {
    if (item.kind !== 'node') return
    const { options, mapped: nm } = nodeOptions(item, ctx, true)
    const anchor = nm.node.anchor
    labels.push({
      text: item.text,
      pos: nm.pos ?? (i < secondCoord ? 0.5 : 1),
      ...(anchor !== undefined ? { at: oppositeAnchor(String(anchor)) } : {}),
      ...(options.textStyle !== undefined ? { style: options.textStyle } : {}),
      ...(nm.sloped ? { sloped: true } : {}),
    })
  })
  const options: Record<string, IrValue | undefined> = {
    ...(mapped.arrowStart !== undefined ? { arrowStart: mapped.arrowStart } : {}),
    ...(mapped.arrowEnd !== undefined ? { arrowEnd: mapped.arrowEnd } : {}),
    ...(bend !== undefined ? { bendAngle: bend as number } : {}),
    ...(routing?.to.out !== undefined ? { out: routing.to.out } : {}),
    ...(routing?.to.in !== undefined ? { in: routing.to.in } : {}),
    ...(routing?.to.looseness !== undefined ? { looseness: routing.to.looseness } : {}),
    ...(mapped.shortenStart !== undefined ? { shortenStart: mapped.shortenStart } : {}),
    ...(mapped.shortenEnd !== undefined ? { shortenEnd: mapped.shortenEnd } : {}),
    ...(mapped.style.length ? { style: styleValue(mapped) } : {}),
    ...(labels.length ? { labels } : {}),
  }
  return { kind: 'edge', source: stmt.source, from, to, options }
}

function oppositeAnchor(anchor: string): string {
  const table: Record<string, string> = {
    south: 'north',
    north: 'south',
    east: 'west',
    west: 'east',
    'south east': 'north west',
    'south west': 'north east',
    'north east': 'south west',
    'north west': 'south east',
  }
  return table[anchor] ?? anchor
}

// ─── scopes ─────────────────────────────────────────────────────────

function lowerScope(stmt: Extract<Statement, { kind: 'scope' }>, ctx: Ctx): IrItem {
  const mapped = mapOptions(stmt.options, 'scope')
  requireKnown(mapped, 'scope')
  if (mapped.arrowStart !== undefined || mapped.arrowEnd !== undefined) throw new Unsupported('arrow tips on a scope are not supported yet')
  const options: Record<string, IrValue | undefined> = {
    ...(mapped.style.length ? { style: styleValue(mapped) } : {}),
  }
  const transform = mapped.transform
    ? {
        ...(mapped.transform.shift ? { shift: mapped.transform.shift } : {}),
        ...(mapped.transform.rotate !== undefined ? { rotate: mapped.transform.rotate } : {}),
        ...(mapped.transform.scale !== undefined ? { scale: mapped.transform.scale } : {}),
      }
    : undefined
  const body = lowerStatements(stmt.body, ctx)
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
