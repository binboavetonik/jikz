/**
 * IR → TypeScript source: the eject path.
 *
 * Two rules carry most of the value:
 *
 * 1. **Every statement keeps its source line as a comment.** The
 *    reader diffs the output against the TikZ they started from.
 * 2. **Deterministic output.** Fixed printer, fixed indentation, no
 *    formatter dependency — the corpus tests diff this text.
 *
 * The emitted picture is `frame: 'math'` with the unit the IR was
 * lowered in, so the numbers in the output are the numbers in the
 * source.
 */
import type { IrItem, IrOp, IrPoint, IrShape, IrTransform, IrValue } from './ir'

export interface EmitOptions {
  /** Module specifier for the jikz import. Default `@ozan.e/jikz`. */
  from?: string
  /** The unit to build the picture with, as source text. Default `cm(1)`. */
  unit?: string
  /**
   * `module` (default): an importable file with `build()`. `statements`:
   * just the calls on `host`, to paste where a template call was.
   */
  shape?: 'module' | 'statements'
  /** The variable the statements are called on. Default `pic`. */
  host?: string
}

export function emit(items: readonly IrItem[], options: EmitOptions = {}): string {
  const from = options.from ?? '@ozan.e/jikz'
  const unit = options.unit ?? 'cm(1)'
  const host = options.host ?? 'pic'
  const used = new Set<string>()
  const body: string[] = []
  emitItems(items, host, options.shape === 'statements' ? '' : '  ', body, used, host)

  const needsRef = body.some((l) => l.includes('ref('))
  if (body.some((l) => l.includes('fillPatterns['))) used.add('fillPatterns')
  const ref = `const ref = (spec: string) => ${host}.frame.unmap(${host}.resolve(spec))`
  if (options.shape === 'statements') {
    const lines = needsRef ? [ref, ...body] : body
    // Drop the blank line that separates items from a preamble.
    return `${lines.join('\n').replace(/^\n/, '')}\n`
  }
  used.add('picture').add('allShapes').add('cm')
  const imports = [...used].filter((n) => n !== 'ref').sort()
  const lines: string[] = [
    `import { ${imports.join(', ')} } from '${from}'`,
    '',
    'export function build() {',
    `  const ${host} = picture({ shapes: allShapes, frame: 'math', unit: ${unit} })`,
  ]
  if (needsRef) {
    lines.push('  /** A named point, in the picture\'s frame coordinates. */')
    lines.push(`  ${ref}`)
  }
  lines.push(...body, '', `  return ${host}`, '}', '')
  return lines.join('\n')
}

function emitItems(items: readonly IrItem[], host: string, indent: string, out: string[], used: Set<string>, root: string): void {
  for (const item of items) {
    out.push('')
    for (const line of item.source.split('\n')) out.push(`${indent}// ${line}`)
    switch (item.kind) {
      case 'skipped':
        out.push(`${indent}// TODO(jikz-tikz): ${item.reason}`)
        break
      case 'pen': {
        const opts = Object.keys(item.options).length ? printValue(item.options, indent, used) : ''
        out.push(`${indent}${host}.pen(${opts})${item.ops.map((op) => printOp(op, indent, used)).join('')}`)
        break
      }
      case 'node': {
        const at = item.at ? `at: ${printPoint(item.at, used)}, ` : ''
        out.push(`${indent}${host}.node(${str(item.name)}, { ${at}${printFields(item.options, indent, used)} })`)
        break
      }
      case 'coordinate':
        out.push(`${indent}${host}.coordinate(${str(item.name)}, ${printPoint(item.at, used)})`)
        break
      case 'edge':
        out.push(
          `${indent}${host}.edge(${printEndpoint(item.from, used)}, ${printEndpoint(item.to, used)}${
            Object.keys(item.options).length ? `, ${printValue(item.options, indent, used)}` : ''
          })`
        )
        break
      case 'clip': {
        out.push(`${indent}${host}.scope({ clip: ${root}.frame.renderable(${printShape(item.shape, used)}) }, (s) => {`)
        emitItems(item.body, 's', `${indent}  `, out, used, root)
        out.push(`${indent}})`)
        break
      }
      case 'scope': {
        const fields = printFields(item.options, indent, used)
        const transform = item.transform ? printTransform(item.transform, used, root) : ''
        const all = [fields, transform ? `transform: ${transform}` : ''].filter(Boolean).join(', ')
        out.push(`${indent}${host}.scope({ ${all} }, (s) => {`)
        emitItems(item.body, 's', `${indent}  `, out, used, root)
        out.push(`${indent}})`)
        break
      }
    }
  }
}

function printOp(op: IrOp, indent: string, used: Set<string>): string {
  // Verbs with an `(x, y)` overload take the shorthand; the rest take a Point.
  const xy = (pt: IrPoint) => printPenPoint(pt, used, true)
  const p = (pt: IrPoint) => printPenPoint(pt, used, false)
  switch (op.op) {
    case 'moveTo':
    case 'lineTo':
    case 'hvTo':
    case 'vhTo':
    case 'rectangle':
      return `.${op.op}(${xy(op.to)})`
    case 'sin':
    case 'cos':
      return `.${op.op}(${p(op.to)})`
    case 'curveTo':
      return `.curveTo(${p(op.c1)}, ${p(op.c2)}, ${p(op.to)})`
    case 'to':
      return `.to(${xy(op.to)}${Object.keys(op.options).length ? `, ${printValue(op.options, indent, used)}` : ''})`
    case 'arc':
      return `.arc(${printValue(op.options, indent, used)})`
    case 'circle':
      return `.circle(${printValue(op.options, indent, used)})`
    case 'ellipse':
      return `.ellipse(${num(op.xRadius)}, ${num(op.yRadius)})`
    case 'grid':
      return `.grid(${xy(op.to)}${Object.keys(op.options).length ? `, ${printValue(op.options, indent, used)}` : ''})`
    case 'parabola':
      return `.parabola(${p(op.to)}${op.bend ? `, { bend: ${p(op.bend)} }` : ''})`
    case 'close':
      return '.close()'
    case 'node':
      return `\n${indent}  .node(${str(op.name)}, ${printValue(op.options, indent + '  ', used)})`
    case 'coordinate':
      return `.coordinate(${str(op.name)})`
    case 'push':
      return `\n${indent}  .push(${printValue(op.options, indent + '  ', used)})`
  }
}

/** A pen target: `(x, y)` shorthand where the verb has it, names as strings, `rel()`. */
function printPenPoint(p: IrPoint, used: Set<string>, shorthand: boolean): string {
  if (p.kind === 'xy' && shorthand) return `${num(p.x)}, ${num(p.y)}`
  if (p.kind === 'name') return str(p.ref)
  if (p.kind === 'rel') {
    used.add('rel')
    return `rel(${num(p.dx)}, ${num(p.dy)})`
  }
  return printPoint(p, used)
}

function printEndpoint(p: IrPoint, used: Set<string>): string {
  return p.kind === 'name' ? str(p.ref) : printPoint(p, used)
}

/** A point recipe as an expression yielding a `Point` in frame coordinates. */
export function printPoint(p: IrPoint, used: Set<string>): string {
  const q = (x: IrPoint) => printPoint(x, used)
  switch (p.kind) {
    case 'xy':
      used.add('point')
      return `point(${num(p.x)}, ${num(p.y)})`
    case 'name':
      used.add('ref')
      return `ref(${str(p.ref)})`
    case 'rel':
      throw new Error('a relative coordinate can only be a pen target')
    case 'toward':
      return `${q(p.a)}.toward(${q(p.b)}, ${num(p.t)})`
    case 'towardBy':
      return `${q(p.a)}.towardByDistance(${q(p.b)}, ${num(p.distance)})`
    case 'project':
      return `${q(p.p)}.project(${q(p.a)}, ${q(p.b)})`
    case 'rotateAround':
      return `${q(p.p)}.rotateAround(${q(p.about)}, ${num(p.angle)})`
    case 'sum': {
      // `a + b - c`, with unit factors left out: the first term starts the chain.
      const term = (t: { factor: number; p: IrPoint }, first: boolean) => {
        const f = Math.abs(t.factor)
        const scaled = f === 1 ? q(t.p) : `${q(t.p)}.scale(${num(f)})`
        if (first) return t.factor < 0 ? `${scaled}.neg()` : scaled
        return `.${t.factor < 0 ? 'sub' : 'add'}(${scaled})`
      }
      return p.terms.map((t, i) => term(t, i === 0)).join('')
    }
    case 'perp':
      used.add('point')
      return `point(${q(p.a)}.x, ${q(p.b)}.y)`
  }
}

function printShape(sh: IrShape, used: Set<string>): string {
  switch (sh.kind) {
    case 'rect':
      used.add('rect')
      return `rect(${num(sh.x)}, ${num(sh.y)}, ${num(sh.width)}, ${num(sh.height)})`
    case 'circle':
      used.add('circle')
      return `circle(${printPoint(sh.center, used)}, ${num(sh.radius)})`
    case 'path':
      used.add('path')
      return `path()${sh.ops.map((op) => (op.op === 'close' ? '.close()' : `.${op.op}(${printPoint((op as { to: IrPoint }).to, used)})`)).join('')}`
  }
}

function printTransform(t: IrTransform, used: Set<string>, root: string): string {
  used.add('Transform')
  let s = 'Transform.identity()'
  if (t.shift) s += `.translate(${root}.length(${num(t.shift.dx)}), -${root}.length(${num(t.shift.dy)}))`
  if (t.rotate !== undefined) s += `.rotate(${num(-t.rotate)})`
  if (t.scale !== undefined) s += `.scale(${num(t.scale)})`
  return s
}

// ─── value printer ──────────────────────────────────────────────────

function printFields(record: { readonly [k: string]: IrValue | undefined }, indent: string, used: Set<string>): string {
  return Object.entries(record)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${key(k)}: ${printValue(v!, indent, used)}`)
    .join(', ')
}

export function printValue(v: IrValue, indent: string, used: Set<string>): string {
  if (typeof v === 'string') return str(v)
  if (typeof v === 'number') return num(v)
  if (typeof v === 'boolean') return String(v)
  if (Array.isArray(v)) return `[${v.map((x) => printValue(x, indent, used)).join(', ')}]`
  if ('$pattern' in v) return `fillPatterns[${str((v as { $pattern: string }).$pattern)}]`
  if ('$len' in v) return printLength((v as { $len: string }).$len, used)
  const fields = printFields(v as { readonly [k: string]: IrValue | undefined }, indent, used)
  return fields.length === 0 ? '{}' : `{ ${fields} }`
}

/** `2cm` → `cm(2)`; a bare number is pt; em/ex spelled out in pt. */
function printLength(value: string, used: Set<string>): string {
  const m = /^([-+]?[\d.]+)([a-z]*)$/i.exec(value)
  if (!m) throw new Error(`not a length: ${value}`)
  const n = Number(m[1])
  const unit = m[2]!.toLowerCase()
  const fn: Record<string, string> = { '': 'pt', pt: 'pt', cm: 'cm', mm: 'mm', bp: 'bp', in: 'inch' }
  if (unit === 'px') return num(n)
  if (unit === 'em') {
    used.add('pt')
    return `pt(${num(10 * n)})`
  }
  if (unit === 'ex') {
    used.add('pt')
    return `pt(${num(4.3 * n)})`
  }
  const f = fn[unit]
  if (!f) throw new Error(`not a length: ${value}`)
  used.add(f)
  return `${f}(${num(n)})`
}

function key(k: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(k) ? k : str(k)
}

function str(s: string): string {
  return `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`
}

function num(n: number): string {
  const r = Math.round(n * 1e9) / 1e9
  return String(Object.is(r, -0) ? 0 : r)
}
