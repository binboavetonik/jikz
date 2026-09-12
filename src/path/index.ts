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
