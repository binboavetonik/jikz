/**
 * IR → a live `Picture`.
 *
 * This is not a second product. It is the oracle: for every corpus
 * entry, the SVG this produces and the SVG produced by *running the
 * emitted TypeScript* must be byte-identical. That property is what
 * catches printer drift the moment it appears, and it is why the IR
 * exists (plan §2, §7).
 *
 * It also backs the docs-site playground, which costs nothing extra.
 */
import { picture, point, allShapes, type Picture } from 'jikz'
import type { IrItem } from './types'

export function interpret(items: readonly IrItem[]): Picture<typeof allShapes> {
  const pic = picture({ shapes: allShapes })
  for (const item of items) {
    if (item.kind !== 'pen') continue
    const pen = pic.pen()
    for (const s of item.segments) {
      if (s.op === 'moveTo') pen.moveTo(point(s.x, s.y))
      else pen.lineTo(point(s.x, s.y))
    }
  }
  return pic
}
