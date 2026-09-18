import { Path } from './Path'
import { Point } from '../core/Point'
import { pathFromSVG } from './svgPath'

/**
 * A guide for the path decorations (`markPath`, `textAlongPath`,
 * `shapesAlongPath`, `footprints`): a {@link Path}, anything with an
 * SVG outline, or a line (two points).
 */
export type PathLike =
  | Path
  | { toSVGPath(): string }
  | { start: { x: number; y: number }; end: { x: number; y: number } }

/** The guide as a {@link Path}. */
export function toPath(guide: PathLike): Path {
  if (guide instanceof Path) return guide
  if ('toSVGPath' in guide) return pathFromSVG(guide.toSVGPath())
  return new Path([
    { type: 'M', points: [new Point(guide.start.x, guide.start.y)] },
    { type: 'L', points: [new Point(guide.end.x, guide.end.y)] },
  ])
}
