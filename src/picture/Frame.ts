/**
 * The coordinate frame a picture's statements are written in.
 *
 * jikz's geometry is SVG screen space: px, y down, clockwise angles.
 * TikZ's is a y-up plane in cm-ish units with counter-clockwise
 * angles. `picture({ frame: 'math', unit })` lets a picture be
 * written in the latter: every point, angle and numeric anchor that
 * enters through a picture verb (`node`, `edge`, `coordinate`,
 * `text`, `draw`, the pen) is mapped here, once, at insertion — so
 * the geometry the picture holds, and everything `resolve()` hands
 * back, is screen space as always. Nothing in rendering changes,
 * which is what keeps text upright and stroke widths in px.
 *
 * `unit` is px per coordinate unit and applies to coordinates only;
 * lengths given as options (`width`, `distance`, `innerSep`, …) stay
 * px, as TikZ keeps `line width` and `inner sep` in absolute units.
 */
import { Point, point } from '../core/Point'
import type { PointLike } from '../core/types'
import type { AnchorSpec } from '../core/Anchor'
import { JikzError } from '../core/errors'
import { Line } from '../geometry/Line'
import { Circle } from '../geometry/Circle'
import { Rectangle } from '../geometry/Rectangle'
import { Polygon } from '../geometry/Polygon'
import { Triangle } from '../geometry/Triangle'
import { Arc } from '../geometry/Arc'
import { Ellipse } from '../geometry/Ellipse'
import { Path, type PathSegment } from '../path/Path'
import type { Renderable } from '../render/Renderer'

export type FrameName = 'screen' | 'math'

export interface FrameOptions {
  /**
   * `'screen'` (default): px, y down, clockwise angles — SVG's frame.
   * `'math'`: y up, counter-clockwise angles, `A.90` is the top —
   * TikZ's frame. Mapped at insertion; see {@link Frame}.
   */
  frame?: FrameName
  /** Px per coordinate unit (default 1). TikZ's `1cm` is `cm(1)` ≈ 37.8. */
  unit?: number
}

/** A relative coordinate — TikZ `++(dx, dy)`. Build with {@link rel}. */
export interface RelativePoint {
  readonly rel: true
  readonly dx: number
  readonly dy: number
}

/** TikZ `++(dx, dy)`: a step from the pen's current position. */
export function rel(dx: number, dy: number): RelativePoint {
  return { rel: true, dx, dy }
}

export function isRelative(p: unknown): p is RelativePoint {
  return typeof p === 'object' && p !== null && (p as RelativePoint).rel === true
}

export class Frame {
  static readonly SCREEN = new Frame('screen', 1)

  readonly name: FrameName
  readonly unit: number
  private readonly flip: boolean

  constructor(name: FrameName = 'screen', unit = 1) {
    if (!(unit > 0)) throw new JikzError('invalid-argument', `Picture: unit must be > 0 (got ${unit}).`)
    this.name = name
    this.unit = unit
    this.flip = name === 'math'
  }

  static of(options: FrameOptions | undefined): Frame {
    if (!options?.frame && (options?.unit === undefined || options.unit === 1)) return Frame.SCREEN
    return new Frame(options.frame ?? 'screen', options.unit ?? 1)
  }

  /** Whether this frame's y axis points up (mapping negates y and angles). */
  get flipsY(): boolean {
    return this.flip
  }

  /** True for the screen frame at unit 1: every map is the identity. */
  get identity(): boolean {
    return !this.flip && this.unit === 1
  }

  /** A frame coordinate to screen px. */
  point(p: PointLike): Point {
    if (this.identity) return p instanceof Point ? p : point(p.x, p.y)
    return point(p.x * this.unit, (this.flip ? -p.y : p.y) * this.unit)
  }

  /** Screen px back to a frame coordinate — the inverse of {@link point}. */
  unmap(p: PointLike): Point {
    if (this.identity) return p instanceof Point ? p : point(p.x, p.y)
    return point(p.x / this.unit, (this.flip ? -p.y : p.y) / this.unit)
  }

  /** A frame displacement to a screen displacement (no origin). */
  vector(dx: number, dy: number): Point {
    return this.point({ x: dx, y: dy })
  }

  /** A frame length (coordinate units) to px. */
  length(v: number): number {
    return v * this.unit
  }

  /** A frame angle to a screen angle. */
  angle(a: number): number {
    return this.flip ? -a : a
  }

  /** An anchor spec: numeric angles are frame angles; names are convention-free. */
  anchor(spec: AnchorSpec): AnchorSpec {
    if (!this.flip) return spec
    if (typeof spec === 'number') return -spec
    const m = spec.trim().match(/^(-?\d+(?:\.\d+)?)\s*(?:deg)?$/)
    return m ? -parseFloat(m[1]!) : spec
  }

  /** Map the anchor part of a `"name.anchor"` spec. */
  anchorString(anchor: string): string {
    if (!this.flip) return anchor
    const mapped = this.anchor(anchor)
    return typeof mapped === 'number' ? String(mapped) : mapped
  }

  /**
   * A geometry object written in this frame, as its screen-space
   * twin. Points, lines, circles, rectangles, polygons, arcs,
   * ellipses and paths map; anything else (plots, conics, node
   * shapes, marked and text paths) throws — build those in px with
   * `pic.point()` and `pic.length()`.
   */
  renderable(obj: Renderable): Renderable {
    if (this.identity) return obj
    if (obj instanceof Point) return this.point(obj)
    if (obj instanceof Line) return new Line(this.point(obj.start), this.point(obj.end))
    if (obj instanceof Circle) return new Circle(this.point(obj.center), this.length(obj.radius))
    if (obj instanceof Rectangle) {
      const a = this.point({ x: obj.x, y: obj.y })
      const b = this.point({ x: obj.x + obj.width, y: obj.y + obj.height })
      return new Rectangle(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y))
    }
    if (obj instanceof Triangle) {
      return new Triangle(this.point(obj.A), this.point(obj.B), this.point(obj.C))
    }
    if (obj instanceof Polygon) return new Polygon(obj.vertices.map((v) => this.point(v)))
    if (obj instanceof Arc) {
      return new Arc(
        this.point(obj.center),
        this.length(obj.radius),
        this.angle(obj.startAngle),
        this.angle(obj.endAngle),
        this.flip ? !obj.clockwise : obj.clockwise
      )
    }
    if (obj instanceof Ellipse) {
      return new Ellipse(this.point(obj.center), this.length(obj.a), this.length(obj.b), this.angle(obj.rotation))
    }
    if (obj instanceof Path) return this.path(obj)
    const kind =
      (obj as { kind?: string; type?: string }).kind ??
      (obj as { type?: string }).type ??
      obj.constructor?.name ??
      'object'
    throw new JikzError(
      'unsupported',
      `Picture: a ${kind} cannot be mapped into the '${this.name}' frame — ` +
        `build it in screen px (pic.point(x, y), pic.length(v)) and draw that instead.`
    )
  }

  /** A path written in this frame, in screen space. */
  path(p: Path): Path {
    if (this.identity) return p
    const segments: PathSegment[] = p.segments.map((seg) => ({
      ...seg,
      points: seg.points.map((q) => this.point(q)),
      ...(seg.type === 'A'
        ? {
            rx: seg.rx !== undefined ? this.length(seg.rx) : seg.rx,
            ry: seg.ry !== undefined ? this.length(seg.ry) : seg.ry,
            rotation: seg.rotation !== undefined ? this.angle(seg.rotation) : seg.rotation,
            sweep: this.flip ? !seg.sweep : seg.sweep,
          }
        : {}),
    }))
    return new Path(segments)
  }
}
