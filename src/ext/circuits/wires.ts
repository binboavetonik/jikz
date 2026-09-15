import type { Picture, PictureEndpoint } from '../../picture/Picture'
import type { ShapeSet } from '../../geometry/ShapeKind'
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
 * An open terminal — circuitikz's `ocirc` pole, the `o` in `o-o`.
 * Where {@link junctionDot} is a *connection*, this is an accessible
 * terminal that nothing is connected to: the end of a lead a probe
 * would touch.
 *
 * Both return a plain {@link Circle}; what distinguishes them is how
 * you paint it, which is also what distinguishes them on paper:
 *
 * ```ts
 * pic.fill(junctionDot(p))    // ● wires meet here
 * pic.draw(openTerminal(p))   // ○ a terminal, open
 * ```
 *
 * Slightly larger than a junction dot by default, matching
 * circuitikz, where an open pole reads as a ring rather than a blob.
 */
export function openTerminal(center: PointLike, radius = 3): Circle {
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
export function wire<S extends ShapeSet>(
  pic: Picture<S>,
  points: readonly PictureEndpoint[],
  options: EdgeOptions = {}
): Picture<S> {
  for (let i = 0; i + 1 < points.length; i++) {
    pic.edge(points[i]!, points[i + 1]!, {
      arrowStart: 'none',
      arrowEnd: 'none',
      ...options,
    })
  }
  return pic
}
