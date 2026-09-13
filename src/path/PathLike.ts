/**
 * {@link Path} acceptance widening for guide-taking APIs (markPath,
 * textAlongPath): anything with an SVG outline — Arc, Circle, shapes —
 * converts exactly through the `pathFromSVG` parser. Kept in its own
 * module so Path.ts and svgPath.ts stay acyclic.
 */
import { Path } from './Path'
import { pathFromSVG } from './svgPath'

/** A path, or anything with an SVG outline (`toSVGPath()`). */
export type PathLike = Path | { toSVGPath(): string }

/** Normalize a {@link PathLike} to a Path (identities pass through). */
export function toPath(guide: PathLike): Path {
  return guide instanceof Path ? guide : pathFromSVG(guide.toSVGPath())
}
