/**
 * Edge routers — TikZ's `to path` as a function. An {@link EdgeRouter}
 * turns the resolved endpoints of an edge into the {@link Path} it
 * draws; `edge(a, b, { route })` uses it instead of the built-in
 * `straight`/`-|`/`|-`/`bezier` routing. The routers here are the
 * common shapes; write your own for anything else.
 */
import { Point, point } from '../core/Point'
import { Path, path } from '../path/Path'
import type { Edge } from './Edge'

/** Builds the path an edge draws from its resolved endpoints. */
export type EdgeRouter = (from: Point, to: Point, edge: Edge) => Path

/** A straight segment — what `routing: 'straight'` draws. */
export const straightRouter: EdgeRouter = (from, to) => path().moveTo(from).lineTo(to)

/**
 * One right-angle bend: horizontal then vertical (TikZ `-|`, the
 * default) or vertical then horizontal (`|-`).
 */
export function orthogonalRouter(options: { first?: 'horizontal' | 'vertical' } = {}): EdgeRouter {
  const first = options.first ?? 'horizontal'
  return (from, to) =>
    first === 'horizontal'
      ? path().moveTo(from).lineTo(point(to.x, from.y)).lineTo(to)
      : path().moveTo(from).lineTo(point(from.x, to.y)).lineTo(to)
}

/**
 * Two bends through a shared "bus" line: with `y`, the edge runs
 * vertically to that y, across, then vertically to the target; with
 * `x` the other way round. Several edges given the same bus line up,
 * which is what wiring diagrams and layered drawings want.
 */
export function busRouter(bus: { x: number } | { y: number }): EdgeRouter {
  return (from, to) =>
    'y' in bus
      ? path().moveTo(from).lineTo(point(from.x, bus.y)).lineTo(point(to.x, bus.y)).lineTo(to)
      : path().moveTo(from).lineTo(point(bus.x, from.y)).lineTo(point(bus.x, to.y)).lineTo(to)
}
