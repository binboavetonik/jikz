/**
 * 3D → 2D projection — jikz's analogue of TikZ's `3d` library and
 * tikz-3dplot's `\tdplotsetmaincoords`.
 *
 * TikZ's 3D is a projection and nothing more: no depth sorting, no
 * hidden surfaces — the author orders the drawing. So the whole
 * surface is `project(x, y, z) → Point`, and the rest of jikz (nodes,
 * edges, labels, the pen) takes the 2D result.
 *
 * ```ts
 * import { projection } from '@ozan.e/jikz/projection'
 *
 * const P = projection({ theta: 70, phi: 110, unit: 40 })   // \tdplotsetmaincoords{70}{110}
 * pic.pen().moveTo(P.point(0, 0, 0)).lineTo(P.point(1, 0, 0)).lineTo(P.point(1, 1, 0)).lineTo(P.point(0, 1, 0)).close()
 * ```
 *
 * The default frame is the screen (y down). For a `frame: 'math'`
 * picture pass `frame: 'math'` and the projection returns y-up
 * coordinates the picture will map.
 */
import { Point, point } from '../../core/Point'
import type { PointLike } from '../../core/types'
import { degToRad } from '../../utils/math'
import { Line } from '../../geometry/Line'

export interface ProjectionOptions {
  /** tdplot's θ: tilt of the z axis towards the viewer, degrees. Default 70. */
  theta?: number
  /** tdplot's φ: rotation about z, degrees. Default 110. */
  phi?: number
  /** Explicit image of the x unit vector (TikZ `x={(…)}`), overriding θ/φ. Y-up units. */
  x?: PointLike
  /** Explicit image of the y unit vector. */
  y?: PointLike
  /** Explicit image of the z unit vector. */
  z?: PointLike
  /** Px per 3D unit. Default 1. */
  unit?: number
  /** `'screen'` (default) returns y-down points; `'math'` y-up, for a math-frame picture. */
  frame?: 'screen' | 'math'
}

export type Point3 = readonly [number, number, number] | { x: number; y: number; z: number }

const xyz = (p: Point3): readonly [number, number, number] => ('x' in p ? [p.x, p.y, p.z] : p)

/** A fixed view: the 2D images of the three unit vectors. */
export class Projection {
  /** Image of (1, 0, 0), in the projection's frame, unit applied. */
  readonly x: Point
  /** Image of (0, 1, 0). */
  readonly y: Point
  /** Image of (0, 0, 1). */
  readonly z: Point
  readonly unit: number
  readonly frame: 'screen' | 'math'

  constructor(options: ProjectionOptions = {}) {
    const theta = options.theta ?? 70
    const phi = options.phi ?? 110
    const unit = options.unit ?? 1
    const flip = options.frame === 'math' ? 1 : -1
    // tikz-3dplot main coordinates, y up:
    //   x → (cos φ, −sin φ cos θ), y → (sin φ, cos φ cos θ), z → (0, sin θ)
    const t = degToRad(theta)
    const f = degToRad(phi)
    const ux = options.x ?? { x: Math.cos(f), y: -Math.sin(f) * Math.cos(t) }
    const uy = options.y ?? { x: Math.sin(f), y: Math.cos(f) * Math.cos(t) }
    const uz = options.z ?? { x: 0, y: Math.sin(t) }
    const snap = (v: number) => Math.round(v * unit * 1e9) / 1e9 || 0 // no −0
    this.x = point(snap(ux.x), snap(flip * ux.y))
    this.y = point(snap(uy.x), snap(flip * uy.y))
    this.z = point(snap(uz.x), snap(flip * uz.y))
    this.unit = unit
    this.frame = options.frame ?? 'screen'
  }

  /** The 2D image of a 3D point. */
  point(x: number, y: number, z: number): Point
  point(p: Point3): Point
  point(a: number | Point3, b?: number, c?: number): Point {
    const [x, y, z] = typeof a === 'number' ? [a, b ?? 0, c ?? 0] : xyz(a)
    return point(
      x * this.x.x + y * this.y.x + z * this.z.x,
      x * this.x.y + y * this.y.y + z * this.z.y
    )
  }

  /** The three coordinate axes from the origin, `length` units long. */
  axes(length = 1, origin: Point3 = [0, 0, 0]): { x: Line; y: Line; z: Line } {
    const o = this.point(origin)
    const [ox, oy, oz] = xyz(origin)
    return {
      x: new Line(o, this.point(ox + length, oy, oz)),
      y: new Line(o, this.point(ox, oy + length, oz)),
      z: new Line(o, this.point(ox, oy, oz + length)),
    }
  }
}

/** A view: tdplot's `\tdplotsetmaincoords{theta}{phi}`, or explicit `x`/`y`/`z` images. */
export function projection(options: ProjectionOptions = {}): Projection {
  return new Projection(options)
}

/** `\tdplotsetmaincoords{theta}{phi}` at `unit` px per unit. */
export function tdplot(theta: number, phi: number, unit = 1, frame: 'screen' | 'math' = 'screen'): Projection {
  return new Projection({ theta, phi, unit, frame })
}
