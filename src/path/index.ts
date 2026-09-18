// Path builder
export {
  Path,
  path,
  pathFrom,
  rectPath,
  circlePath,
  ellipsePath,
  polygonPath,
  polylinePath,
} from './Path'

export type { PathSegment, PathSegmentType, PathOptions } from './Path'

export { pathFromSVG, parsePathData } from './svgPath'

// Guide acceptance: Path or anything with an SVG outline
export { toPath } from './PathLike'
export type { PathLike } from './PathLike'

// Markings along a path (TikZ decorations.markings)
export { MarkedPath, markPath } from './MarkedPath'
export type {
  MarkingSpec,
  MarkSpec,
  CustomMarkArtwork,
  ResolvedPathMark,
} from './MarkedPath'

// Text along a path (TikZ decorations.text)
export { TextPath, textAlongPath } from './TextPath'
export type { TextPathOptions } from './TextPath'

export { bezierControlPoints } from './bezier'
export type { BezierRouteOptions } from './bezier'

// Path data transforms
export { rotatePathData } from './rotatePath'

// Path operations and decorations
export {
  // Decorations
  arrowDecoration,
  stealthDecoration,
  tickDecoration,
  barDecoration,
  circleDecoration,
  squareDecoration,
  decoration,
  // Dash patterns
  DASH_PATTERNS,
  dashPatternToSVG,
  // Path operations
  offsetPath,
  doublePath,
  subdividePath,
  smoothPath,
  subPath,
  roundCorners,
  joinPaths,
  // Brace/bracket
  bracePath,
  bracketPath,
} from './PathOperations'

export type {
  DecorationType,
  DecorationPosition,
  DecorationOptions,
  DashPattern,
} from './PathOperations'

// Path decorations (snake, zigzag, coil, etc.)
export {
  snakePath,
  zigzagPath,
  coilPath,
  bumpsPath,
  sawPath,
  randomPath,
  braceDecorationPath,
  decoratePath,
  registerDecoration,
  hasDecoration,
  registeredDecorations,
} from './PathDecorations'

export type {
  DecorationFn,
  DecorationOptions as PathDecorationOptions,
  CoilOptions,
  BumpsOptions,
  RandomOptions,
  BraceOptions,
  PathDecorationType,
} from './PathDecorations'
