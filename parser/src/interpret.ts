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
  point,
  rel,
  type Frame,
  type Pen,
  type PenOptions,
  type PictureEdgeOptions,
  type PictureEndpoint,
  type PointLike,
  type ScopeOptions,
} from 'jikz'
import type { IrItem, IrOp, IrPoint, IrRecord, IrTransform } from './ir'

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
}

export function interpret(items: readonly IrItem[], host: TikzHost): void {
  for (const item of items) {
    switch (item.kind) {
      case 'skipped':
        break
      case 'pen':
        runPen(host.pen(item.options as never), item.ops, host)
        break
      case 'node':
        host.node(item.name, { ...item.options, ...(item.at ? { at: resolve(item.at, host) } : {}) })
        break
      case 'coordinate':
        host.coordinate(item.name, resolve(item.at, host))
        break
      case 'edge':
        host.edge(endpoint(item.from, host), endpoint(item.to, host), item.options as never)
        break
      case 'scope':
        host.scope(scopeOptions(item.options, item.transform, host), (s) => interpret(item.body, s))
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
        pen.node(op.name, op.options as never)
        break
      case 'coordinate':
        pen.coordinate(op.name)
        break
      case 'push':
        pen.push(op.options as never)
        break
    }
  }
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
  return { ...(options as ScopeOptions), ...(transform ? { transform: scopeTransform(transform, host) } : {}) }
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
