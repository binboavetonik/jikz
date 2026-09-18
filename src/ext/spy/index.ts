/**
 * Magnifying-glass insets — jikz's analogue of TikZ's `spy` library.
 *
 * `\spy [circle, magnification=3, size=2cm] on (p) in node at (q);`
 * shows everything drawn so far around `p`, magnified, inside a lens
 * at `q`. The mechanism here is the picture's own item list: the
 * items already in the picture are replayed into a scope that is
 * clipped to the lens and transformed to scale about `p` onto `q`.
 * Two outlines and a connecting line follow TikZ's `spy using
 * outlines` and `connect spies`.
 *
 * ```ts
 * import { spy } from '@ozan.e/jikz/spy'
 *
 * // … draw the picture …
 * spy(pic, { on: point(120, 80), in: point(300, 60), magnification: 3, size: 80 })
 * ```
 *
 * Call it after the content it should magnify: it copies what is in
 * the picture at that moment, as TikZ's spy scope replays what was
 * drawn inside it.
 */
import { point } from '../../core/Point'
import type { PointLike } from '../../core/types'
import { Transform } from '../../core/Transform'
import { Circle } from '../../geometry/Circle'
import { Rectangle } from '../../geometry/Rectangle'
import { Line } from '../../geometry/Line'
import type { ShapeSet } from '../../geometry/ShapeKind'
import type { ItemContainer, PictureItem } from '../../picture/Container'
import type { StyleSpec } from '../../render/StyleMapper'

export interface SpyOptions {
  /** The point being magnified (TikZ `on`), in the picture's frame. */
  on: PointLike
  /** Where the lens sits (TikZ `in node at`), in the picture's frame. */
  in: PointLike
  /** TikZ `magnification`. Default 3. */
  magnification?: number
  /** Lens diameter (or side), px (TikZ `size`). Default 80. */
  size?: number
  /** Lens shape (TikZ `circle` / `rectangle`). Default `'circle'`. */
  shape?: 'circle' | 'rectangle'
  /** Draw the line between the two outlines (TikZ `connect spies`). Default true. */
  connect?: boolean
  /** Style of the outline around the magnified region (TikZ `every spy on node`, `very thin, draw`). */
  onStyle?: StyleSpec
  /** Style of the lens outline (TikZ `every spy in node`, `thick, draw`). */
  inStyle?: StyleSpec
  /** Style of the connecting line (TikZ `thin`). */
  connectionStyle?: StyleSpec
}

/** TikZ `every spy on node`: `very thin, draw`. */
export const SPY_ON_STYLE: Readonly<StyleSpec> = Object.freeze({ stroke: '#000000', strokeWidth: 0.2 })
/** TikZ `every spy in node`: `thick, draw`. */
export const SPY_IN_STYLE: Readonly<StyleSpec> = Object.freeze({ stroke: '#000000', strokeWidth: 0.8 })
/** TikZ `spy connection path`: `thin`. */
export const SPY_CONNECTION_STYLE: Readonly<StyleSpec> = Object.freeze({ stroke: '#000000', strokeWidth: 0.4 })

/**
 * Magnify the picture around `on` into a lens at `in`. Everything in
 * `pic` at the moment of the call is replayed, clipped and scaled.
 */
export function spy<S extends ShapeSet>(pic: ItemContainer<S>, options: SpyOptions): void {
  const m = options.magnification ?? 3
  const size = options.size ?? 80
  const p = pic.point(options.on)
  const q = pic.point(options.in)
  const lens = options.shape === 'rectangle' ? new Rectangle(q.x - size / 2, q.y - size / 2, size, size) : new Circle(q, size / 2)
  const region =
    options.shape === 'rectangle'
      ? new Rectangle(p.x - size / (2 * m), p.y - size / (2 * m), size / m, size / m)
      : new Circle(p, size / (2 * m))

  // Snapshot before adding anything of our own.
  const snapshot: PictureItem[] = [...pic.items]

  // The lens: the same items, scaled about `on` onto `in`. A scope's
  // clip is in the scope's own coordinates (SVG applies a transformed
  // group's clip-path inside its transform), so the clip is the small
  // region around `on` — the transform carries it onto the lens.
  pic.scope(
    { clip: region, transform: Transform.translation(q.x, q.y).scale(m).translate(-p.x, -p.y) },
    (inside) => {
      inside.include(snapshot)
    }
  )

  // Outlines and connection, in screen space (bypassing the frame).
  const outlines: PictureItem[] = [
    { kind: 'bare', obj: region, mode: 'draw', options: { style: options.onStyle ?? SPY_ON_STYLE } },
    { kind: 'bare', obj: lens, mode: 'draw', options: { style: options.inStyle ?? SPY_IN_STYLE } },
  ]
  if (options.connect !== false && !p.equals(q)) {
    const from = region.anchor(p.angleTo(q))
    const to = lens.anchor(q.angleTo(p))
    outlines.unshift({
      kind: 'bare',
      obj: new Line(from, to),
      mode: 'draw',
      options: { style: options.connectionStyle ?? SPY_CONNECTION_STYLE },
    })
  }
  pic.include(outlines)
}

export { point }
