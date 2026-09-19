/**
 * IR → calls on a live container. The product: `tikz(pic)` ends here.
 *
 * It is also the oracle for the eject path — for every corpus entry,
 * the SVG this produces and the SVG produced by running the emitted
 * TypeScript must be byte-identical. That property is what catches
 * printer drift on the commit that causes it (plan §7).
 */
import {
  Point,
  Transform,
  circle,
  fillPatterns,
  length,
  path,
  pt,
  point,
  rect,
  rel,
  type DrawOptions,
  type Frame,
  type Pen,
  type Renderable,
  type PenOptions,
  type PictureEdgeOptions,
  type PictureEndpoint,
  type PointLike,
  type ScopeOptions,
} from 'jikz'
import { angle, rightAngle } from 'jikz/angles'
import type { IrItem, IrOp, IrPoint, IrRecord, IrShape, IrTransform, IrValue } from './ir'

/**
 * What the interpreter needs of a picture or scope — the verbs of
 * `ItemContainer`, spelled structurally so any shape set fits.
 */
export interface TikzHost {
  readonly frame: Frame
  /** A frame length in px. */
  length(v: number): number
  resolve(spec: string): Point
  pen(options?: PenOptions): Pen
  node(name: string, options: Record<string, unknown>): unknown
  coordinate(name: string, at: PointLike): unknown
  edge(from: PictureEndpoint, to: PictureEndpoint, options?: PictureEdgeOptions): unknown
  scope(options: ScopeOptions, build: (scope: TikzHost) => void): unknown
  draw(obj: Renderable, options?: DrawOptions): unknown
  fill(obj: Renderable, options?: DrawOptions): unknown
  filldraw(obj: Renderable, options?: DrawOptions): unknown
  path(obj: Renderable, options?: DrawOptions): unknown
}

export function interpret(items: readonly IrItem[], host: TikzHost): void {
  for (const item of items) {
    switch (item.kind) {
      case 'skipped':
        break
      case 'pen':
        runPen(host.pen(live(item.options) as never), item.ops, host)
        break
      case 'node':
        host.node(item.name, { ...live(item.options), ...(item.at ? { at: resolve(item.at, host) } : {}) })
        break
      case 'coordinate':
        host.coordinate(item.name, resolve(item.at, host))
        break
      case 'edge':
        host.edge(endpoint(item.from, host), endpoint(item.to, host), live(item.options) as never)
        break
      case 'scope':
        host.scope(scopeOptions(item.options, item.transform, host), (s) => interpret(item.body, s))
        break
      case 'pic': {
        const [a, b, c] = item.points.map((p) => resolve(p, host)) as [Point, Point, Point]
        const mark = (item.pic === 'angle' ? angle : rightAngle)(a, b, c, live(item.options))
        host[item.mode](mark, item.style ? { style: live({ style: item.style }).style as DrawOptions['style'] } : undefined)
        break
      }
      case 'clip':
        // A scope's clip is screen geometry; the frame maps the shape once.
        host.scope({ clip: host.frame.renderable(shape(item.shape, host)) as { toSVGPath(): string } }, (s) => interpret(item.body, s))
        break
    }
  }
}

function runPen(pen: Pen, ops: readonly IrOp[], host: TikzHost): void {
  for (const op of ops) {
    switch (op.op) {
      case 'moveTo':
      case 'lineTo':
      case 'hvTo':
      case 'vhTo':
      case 'rectangle':
      case 'sin':
      case 'cos':
        pen[op.op](penPoint(op.to, host))
        break
      case 'curveTo':
        pen.curveTo(penPoint(op.c1, host), penPoint(op.c2, host), penPoint(op.to, host))
        break
      case 'to':
        pen.to(penPoint(op.to, host), op.options as never)
        break
      case 'arc':
        pen.arc(op.options as never)
        break
      case 'circle':
        pen.circle(op.options as never)
        break
      case 'ellipse':
        pen.ellipse(op.xRadius, op.yRadius)
        break
      case 'grid':
        pen.grid(penPoint(op.to, host), op.options as never)
        break
      case 'parabola':
        pen.parabola(penPoint(op.to, host), op.bend ? { bend: penPoint(op.bend, host) } : {})
        break
      case 'close':
        pen.close()
        break
      case 'node':
        pen.node(op.name, live(op.options) as never)
        break
      case 'coordinate':
        pen.coordinate(op.name)
        break
      case 'push':
        pen.push(live(op.options) as never)
        break
    }
  }
}

/** A clip shape in frame coordinates. */
function shape(sh: IrShape, host: TikzHost) {
  switch (sh.kind) {
    case 'rect':
      return rect(sh.x, sh.y, sh.width, sh.height)
    case 'circle':
      return circle(resolve(sh.center, host), sh.radius)
    case 'path': {
      let p = path()
      for (const op of sh.ops) {
        if (op.op === 'moveTo') p = p.moveTo(resolve(op.to, host))
        else if (op.op === 'lineTo') p = p.lineTo(resolve(op.to, host))
        else if (op.op === 'close') p = p.close()
      }
      return p
    }
  }
}

/** Every name the items register, in order — what a template call returns. */
export function namesOf(items: readonly IrItem[]): string[] {
  const out: string[] = []
  for (const item of items) {
    if (item.kind === 'node' || item.kind === 'coordinate') {
      out.push(item.name)
    } else if (item.kind === 'pen') {
      for (const op of item.ops) if (op.op === 'node' || op.op === 'coordinate') out.push(op.name)
    } else if (item.kind === 'scope' || item.kind === 'clip') {
      out.push(...namesOf(item.body))
    }
  }
  return out
}

/** IR data → the option object: `{ $pattern }` becomes the library's pattern. */
export function live(v: IrRecord): Record<string, unknown> {
  return liveValue(v) as Record<string, unknown>
}

function liveValue(v: IrValue | undefined): unknown {
  if (v === undefined || typeof v !== 'object') return v
  if (Array.isArray(v)) return v.map((x) => liveValue(x as IrValue))
  if ('$pattern' in v) return fillPatterns[(v as { $pattern: string }).$pattern as keyof typeof fillPatterns]
  if ('$len' in v) return lengthPx((v as { $len: string }).$len)
  const out: Record<string, unknown> = {}
  for (const [k, x] of Object.entries(v as IrRecord)) if (x !== undefined) out[k] = liveValue(x)
  return out
}

/** A TikZ length to px: `2cm` through `length()`, a bare number is pt, em/ex at 10pt/4.3pt. */
export function lengthPx(value: string): number {
  if (/^[-+]?[\d.]+$/.test(value)) return pt(Number(value))
  if (/em$/.test(value)) return pt(10) * parseFloat(value)
  if (/ex$/.test(value)) return pt(4.3) * parseFloat(value)
  return length(value)
}

/** A pen target: names and `rel()` pass through; recipes evaluate. */
function penPoint(p: IrPoint, host: TikzHost): Point | string | ReturnType<typeof rel> {
  if (p.kind === 'name') return p.ref
  if (p.kind === 'rel') return rel(p.dx, p.dy)
  return resolve(p, host)
}

/** An edge endpoint: a name stays a name so the edge finds the border. */
function endpoint(p: IrPoint, host: TikzHost): Point | string {
  return p.kind === 'name' ? p.ref : resolve(p, host)
}

/** A point recipe → a `Point` in the host's frame coordinates. */
export function resolve(p: IrPoint, host: TikzHost): Point {
  switch (p.kind) {
    case 'xy':
      return point(p.x, p.y)
    case 'name':
      return host.frame.unmap(host.resolve(p.ref))
    case 'rel':
      throw new Error('a relative coordinate can only be a pen target')
    case 'toward':
      return resolve(p.a, host).toward(resolve(p.b, host), p.t)
    case 'towardBy':
      return resolve(p.a, host).towardByDistance(resolve(p.b, host), p.distance)
    case 'project':
      return resolve(p.p, host).project(resolve(p.a, host), resolve(p.b, host))
    case 'rotateAround':
      return resolve(p.p, host).rotateAround(resolve(p.about, host), p.angle)
    case 'sum':
      return p.terms.reduce((acc, t) => acc.add(resolve(t.p, host).scale(t.factor)), point(0, 0))
    case 'perp':
      return point(resolve(p.a, host).x, resolve(p.b, host).y)
  }
}

export function scopeOptions(options: IrRecord, transform: IrTransform | undefined, host: TikzHost): ScopeOptions {
  return { ...(live(options) as ScopeOptions), ...(transform ? { transform: scopeTransform(transform, host) } : {}) }
}

/**
 * A scope transform is screen-space in jikz; the shift is a frame
 * vector, so it goes through the host's unit and the y flip here —
 * the emitted code spells out the same two calls.
 */
export function scopeTransform(t: IrTransform, host: TikzHost): Transform {
  let acc = Transform.identity()
  if (t.shift) acc = acc.translate(host.length(t.shift.dx), -host.length(t.shift.dy))
  if (t.rotate !== undefined) acc = acc.rotate(-t.rotate)
  if (t.scale !== undefined) acc = acc.scale(t.scale)
  return acc
}
