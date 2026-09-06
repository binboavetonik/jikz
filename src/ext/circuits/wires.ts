import type { Picture, PictureEndpoint } from '../../picture/Picture'
import type { EdgeOptions } from '../../node/Edge'
import type { PointLike } from '../../core/types'
import { circle, type Circle } from '../../geometry/Circle'

/**
 * A filled dot marking a junction where wires meet (circuitikz `-*`).
 * Draw it filled: `pic.fill(junctionDot(p))`. Radius 2 reads well at
 * default symbol sizes.
 */
export function junctionDot(center: PointLike, radius = 2): Circle {
  return circle(center, radius)
}

/**
 * Draw a wire through a chain of endpoints — node names, `"name.port"`
 * specs, raw points — as consecutive straight edges with arrows
 * OFF (jikz edges default to a stealth arrowhead, which is wrong for
 * wires).
 *
 * @example
 * ```ts
 * wire(pic, ['V1.out', 'R1.in'])
 * wire(pic, ['R1.out', point(160, 50), 'C1.in'])  // routed via a corner
 * ```
 */
export function wire(
  pic: Picture,
  points: readonly PictureEndpoint[],
  options: EdgeOptions = {}
): Picture {
  for (let i = 0; i + 1 < points.length; i++) {
    pic.edge(points[i]!, points[i + 1]!, {
      arrowStart: 'none',
      arrowEnd: 'none',
      ...options,
    })
  }
  return pic
}
