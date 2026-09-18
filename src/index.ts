// Core
export { Point, point, polar, origin } from './core/Point'
export { JikzError, warn, setWarningHandler } from './core/errors'
export type { JikzErrorCode, WarningHandler } from './core/errors'
export { cm, mm, inch, pt, bp, length, PX_PER_CM, PX_PER_MM, PX_PER_INCH, PX_PER_PT, PX_PER_BP } from './core/units'
export { color, mix, parseColor, toHex, defineColor, xcolor } from './core/color'
export type { RGB } from './core/color'
export { Transform, transform, fromMatrix } from './core/Transform'

// Types
export type { PointLike, Styleable, Matrix, AngleOptions } from './core/types'

// Utils
export {
  EPSILON,
  PIXEL_EPSILON,
  degToRad,
  radToDeg,
  normalizeAngle,
  approxEqual,
  clamp,
  lerp,
} from './utils/math'

// Text measurement (canvas in browser, font-metrics table in Node)
export {
  measureText,
  setTextMeasurementBackend,
  getTextMeasurementBackend,
  LINE_HEIGHT,
} from './text/measureText'
export type {
  TextMeasureOptions,
  TextMetrics,
  TextMeasurementBackend,
} from './text/measureText'
export { placeText, estimateLabelSize } from './text/placeText'
export { toLabel, labelList } from './text/Label'
export type { LabelSpec } from './text/Label'
export type { TextPlacement } from './text/placeText'

// Geometry
export {
  // Line
  Line,
  line,
  lineFromAngle,
  horizontalLine,
  verticalLine,
  // Circle
  Circle,
  circle,
  circleFromCenterAndPoint,
  circleFromDiameter,
  circleThrough,
  circleEnclosing2,
  circleEnclosing3,
  // Arc
  Arc,
  arc,
  arcThrough,
  arcFromBulge,
  arcFromRadius,
  // Rectangle
  Rectangle,
  rect,
  rectFromCenter,
  rectFromCorners,
  square,
  rectFit,
  rectFromBounds,
  // Polygon
  Polygon,
  polygon,
  regularPolygon,
  equilateralTriangle,
  regularSquare,
  pentagon,
  hexagon,
  star,
  // Triangle
  Triangle,
  triangle,
  rightTriangle,
  isoscelesTriangle,
  equilateral,
  // Intersections
  intersect,
  intersectLineLine,
  intersectSegmentSegment,
  intersectLineCircle,
  intersectSegmentCircle,
  intersectCircleCircle,
  intersectLineArc,
  intersectSegmentArc,
  intersectArcArc,
  intersectLineRect,
  intersectSegmentRect,
  intersectCircleRect,
  // Ellipse (conic section)
  Ellipse,
  ellipse,
  ellipseFromAxes,
  ellipseFromFoci,
  ellipseInRect,
  // Parabola (conic section)
  Parabola,
  parabola,
  parabolaFromFocus,
  parabolaThrough,
  parabolaBend,
  parabolaFromCoefficient,
  // Hyperbola (conic section)
  Hyperbola,
  hyperbola,
  hyperbolaFromFoci,
  hyperbolaFromFociAndPoint,
  hyperbolaFromEccentricity,
  rectangularHyperbola,
  hyperbolaFromAsymptote,
  // Function plotting
  Plot,
  plot,
  plotParametric,
  plotPolar,
  plotFromCoords,
  plotFromPoints,
  plotSin,
  plotCos,
  plotPolynomial,
  plotExp,
  plotGaussian,
  plotCircle,
  plotLissajous,
  plotSpiral,
  plotRose,
  plotCardioid,
  // Plot marks (scatter markers)
  plotMarkPath,
  plotMarkFilled,
  PLOT_MARK_NAMES,
  // Vertex-driven base for custom shapes
  AnchoredPolygon,
  rayEdgeIntersection,
  pointInPolygon,
  polygonBounds,
  // Shape kinds and sets
  PortedShape,
  intrinsicSize,
  defineShape,
  isShapeKind,
  basicShapes,
  complexShapes,
  allShapes,
  // Geometric rotation decorator
  Rotated,
  rotated,
} from './geometry'

export type {
  IntersectionResult,
  IntersectableShape,
  PlotOptions,
  ParametricPlotOptions,
  PolarPlotOptions,
  PlotMark,
  PlotMarkSpec,
  // Shape kinds and sets (what `picture({ shapes })` takes)
  ShapeKind,
  ShapeSet,
  ShapeOptionsOf,
} from './geometry'

// Node system
export {
  // Anchor utilities
  parseAnchorSpec,
  anchorOnRect,
  anchorOnCircle,
  anchorOnEllipse,
  anchorOnDiamond,
  oppositeAnchor,
  isTextAnchor,
  AnchorError,
  ANCHOR_ANGLES,
  // Shapes — the 4 basics (Circle/Rectangle/Ellipse/Diamond) are
  // geometry primitives implementing Shape directly; import their
  // factories (circle/rect/ellipse/diamond) from './geometry' above.
  // regularPolygon/pentagon/hexagon/star/isoscelesTriangle factories
  // belong to geometry's vertex layer — the complex node shapes are
  // available as classes, or by name from `allShapes` ('star', …).
  Trapezium,
  trapezium,
  Parallelogram,
  parallelogram,
  RegularPolygon,
  octagon,
  Star,
  IsoscelesTriangle,
  Cylinder,
  cylinder,
  // Arrow shapes
  SingleArrow,
  singleArrow,
  DoubleArrow,
  doubleArrow,
  // Callout
  Callout,
  callout,
  // Symbol shapes
  Cloud,
  cloud,
  Signal,
  signal,
  Tape,
  tape,
  Starburst,
  starburst,
  // Additional geometric shapes
  Semicircle,
  semicircle,
  Kite,
  kite,
  Dart,
  dart,
  CircularSector,
  circularSector,
  // Misc shapes
  RoundedRectangle,
  roundedRectangle,
  ChamferedRectangle,
  chamferedRectangle,
  CrossOut,
  crossOut,
  StrikeOut,
  strikeOut,
  // Additional symbol shapes
  ForbiddenSign,
  forbiddenSign,
  MagnifyingGlass,
  magnifyingGlass,
  MagneticTape,
  magneticTape,
  // Additional callout shapes
  EllipseCallout,
  ellipseCallout,
  CloudCallout,
  cloudCallout,
  // Arrow box
  ArrowBox,
  arrowBox,
  // Multipart shapes
  CircleSplit,
  circleSplit,
  RectangleSplit,
  rectangleSplit,
  DEFAULT_SHAPE_OPTIONS,
  // Node
  Node,
  node,
  rectNode,
  circleNode,
  ellipseNode,
  diamondNode,
  DEFAULT_LABEL_DISTANCE,
  DEFAULT_LABEL_FONT_SIZE,
  DEFAULT_PIN_DISTANCE,
  DEFAULT_PIN_EDGE_STYLE,
  readableAngle,
  // Edge
  Edge,
  edge,
  arrow,
  biEdge,
  bentEdge,
  toEdge,
  bendLeft,
  bendRight,
  loopEdge,
  // Positioning
  DEFAULT_NODE_DISTANCE,
  calculateRelativePosition,
  nodeAt,
  nodeAbove,
  nodeBelow,
  nodeLeft,
  nodeRight,
  nodeAboveLeft,
  nodeAboveRight,
  nodeBelowLeft,
  nodeBelowRight,
  nodeRow,
  nodeColumn,
  nodeGrid,
  nodeCircle,
  // Routers
  straightRouter,
  orthogonalRouter,
  busRouter,
} from './node'

export type {
  CardinalAnchor,
  TextAnchor,
  StandardAnchor,
  AnchorSpec,
  Anchorable,
  Shape,
  ShapeOptionsFor,
  ShapeSpec,
  ShapeOptions,
  TrapeziumOptions,
  ParallelogramOptions,
  RegularPolygonOptions,
  StarOptions,
  IsoscelesTriangleOptions,
  CylinderOptions,
  SingleArrowOptions,
  ArrowDirection,
  DoubleArrowOptions,
  DoubleArrowDirection,
  CalloutOptions,
  CalloutPointerPosition,
  CloudOptions,
  SignalOptions,
  SignalDirection,
  TapeOptions,
  StarburstOptions,
  // Additional geometric shape options
  SemicircleOptions,
  KiteOptions,
  DartOptions,
  CircularSectorOptions,
  // Misc shape options
  RoundedRectangleOptions,
  ChamferedRectangleOptions,
  CrossOutOptions,
  StrikeOutOptions,
  // Additional symbol shape options
  ForbiddenSignOptions,
  MagnifyingGlassOptions,
  MagneticTapeOptions,
  // Additional callout shape options
  EllipseCalloutOptions,
  EllipseCalloutPointerPosition,
  CloudCalloutOptions,
  // Arrow box options
  ArrowBoxOptions,
  ArrowBoxArrow,
  // Multipart shape options
  CircleSplitOptions,
  RectangleSplitOptions,
  SplitDirection,
  NodeOptions,
  Label,
  TextStyle,
  Pin,
  ArrowTip,
  ArrowTipSpec,
  ArrowSpec,
  EdgeRouting,
  EdgeRouter,
  EdgeAnchorSpec,
  EdgeOptions,
  PositionDirection,
  PositionOptions,
} from './node'

// Path builder
export {
  // Path class and factories
  Path,
  path,
  pathFrom,
  rectPath,
  circlePath,
  ellipsePath,
  polygonPath,
  polylinePath,
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
  roundCorners,
  shortenPath,
  // Brace/bracket
  bracePath,
  bracketPath,
  // Path decorations (snake, zigzag, coil, etc.)
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
  // Markings along a path (TikZ decorations.markings)
  MarkedPath,
  markPath,
  // Text along a path (TikZ decorations.text)
  TextPath,
  textAlongPath,
  // Path data transforms
  rotatePathData,
  // SVG path import (parsePathData / pathFromSVG)
  pathFromSVG,
  parsePathData,
  // Guide acceptance for markPath / textAlongPath
  toPath,
  // Bézier control points (TikZ out/in/bend/looseness)
  bezierControlPoints,
} from './path'

export type {
  PathSegment,
  PathSegmentType,
  PathOptions,
  DecorationType,
  DecorationPosition,
  DecorationOptions,
  DashPattern,
  PathDecorationOptions,
  CoilOptions,
  BumpsOptions,
  RandomOptions,
  BraceOptions,
  PathDecorationType,
  BezierRouteOptions,
  PathLike,
  MarkingSpec,
  MarkSpec,
  CustomMarkArtwork,
  ResolvedPathMark,
  TextPathOptions,
} from './path'

// Renderer
export {
  // Type guards
  isPoint,
  isPath,
  isMarkedPath,
  isTextPath,
  isLine,
  isCircle,
  isArc,
  isEllipse,
  isRectangle,
  isPolygon,
  isNode,
  isEdge,
  isPaintable,
  // Style mapping (user-facing; the pattern/gradient/shadow registry
  // internals stay private to the render package)
  DEFAULT_STYLE,
  STYLE_PRESETS,
  DASH_PATTERN_NAMES,
  mergeStyles,
  applyPreset,
  applyPresets,
  parseStyleString,
  resolveStyle,
  styleList,
  registerStyle,
  hasStyle,
  registeredStyleNames,
  styleToSVGAttributes,
  styleToCSSString,
  // Layers
  DEFAULT_LAYERS,
  // SVG Renderer + builder substrate
  SVGRenderer,
  createSVGRenderer,
  SVGBuilder,
  createSVGBuilder,
  // Pan/zoom interaction for mounted pictures
  attachPanZoom,
  PANZOOM_VIEWPORT_CLASS,
  IDENTITY_TRANSFORM,
  meetFit,
  screenToScene,
  sceneToScreen,
  clampScale,
  zoomAtScreenPoint,
  panByScreenDelta,
  // Renderer collaborators
  DefsManager,
  LayerStack,
  katexAdapter,
  mathjaxAdapter,
  resolveMathRenderer,
  setDefaultMathRenderer,
  getDefaultMathRenderer,
  // Arrow tip + pattern registries
  registerArrowTip,
  getArrowTip,
  hasArrowTip,
  registeredArrowTips,
  resolveArrowTipKind,
  definePattern,
  fillPatterns,
  // Shadings (TikZ \shade)
  axisShading,
  radialShading,
  ballShading,
  resolveShading,
} from './render'

// Picture — TikZ-style scope with a named-node registry and path-mode
// verbs (`path` / `draw` / `fill` / `filldraw`) that mirror `\path` /
// `\draw` / `\fill` / `\filldraw`. Terminate with `toSVG(viewBox)` for
// a string (Node + browser) or `mount(container, viewBox)` for live DOM.
export {
  Picture,
  picture,
  PATH_MODE_STYLE,
  mergePathMode,
  mergePathModeIn,
  ItemContainer,
  Scope,
  TransformedAnchorable,
} from './picture'
export { Pen, Frame, rel, isRelative } from './picture'
export type { FrameOptions, FrameName, RelativePoint } from './picture'
export type { PenOptions, PenHost, PenPoint, ToOptions, PenArcOptions, PenGridOptions, PenCircleOptions } from './picture'
export type { NodeOptionsFor, AddableItems, AddOptions, EveryOptions, PictureEdgeOptions, PlacementOptions, AliasOptions } from './picture'
export type {
  PictureEndpoint,
  PictureItem,
  PathMode,
  PictureRenderer,
  PictureOptions,
  PictureTextOptions,
  PictureViewBox,
  MountOptions,
  PanZoomAttach,
  PanZoomMount,
  DrawOptions,
  ShadeOptions,
  ScopeOptions,
  GroupRenderOptions,
  ContainerRoot,
} from './picture'

export type {
  Renderer,
  Renderable,
  Bounds,
  CustomRenderable,
  Paintable,
  PaintContext,
  RenderOptions,
  TextOptions,
  GroupOptions,
  SVGAnimation,
  Color,
  LineCap,
  LineJoin,
  RenderStyle,
  SVGAttributes,
  StylePreset,
  StyleSpec,
  StyleEntry,
  StyleRecipe,
  StyleLookup,
  DashPatternName,
  KaTeXOptions,
  SVGRendererOptions,
  MathRenderer,
  MathOutput,
  MathJaxLike,
  MathRendererOptions,
  KaTeXLike,
  ArrowTipDefinition,
  ArrowTipArtwork,
  FillPatternName,
  FillPatternSpec,
  PatternDefinition,
  PatternKind,
  // Gradients
  GradientStop,
  LinearGradientSpec,
  RadialGradientSpec,
  GradientSpec,
  // Shadings
  ShadingName,
  ShadingOptions,
  // Shadows
  DropShadowSpec,
  // Clipping and double lines
  ClipSpec,
  DoubleLineSpec,
  // Pan/zoom
  ViewTransform,
  ViewBoxRect,
  ViewportSize,
  PanZoomOptions,
  PanZoomController,
  // Layers
  LayerName,
  LayerConfig,
} from './render'

// Layout systems
export {
  // Chain
  chain,
  chainFrom,
  // Matrix
  matrix,
  matrixFromData,
  // Tree
  tree,
  treeFromSpec,
  // Layered
  layered,
  // Graph (force-directed / circular)
  graph,
} from './layout'

export type {
  // Shared
  LayoutGrowth,
  // Chain
  ChainDirection,
  ChainOptions,
  ChainResult,
  ChainBuilder,
  // Matrix
  MatrixOptions,
  MatrixResult,
  MatrixBuilder,
  // Tree
  TreeGrowth,
  TreeOptions,
  TreeNodeSpec,
  TreeResult,
  TreeNodeBuilder,
  TreeBuilder,
  // Layered
  LayeredOptions,
  LayeredNodeSpec,
  LayeredEdgeSpec,
  LayeredResult,
  LayeredBuilder,
  // Graph
  GraphBuilder,
  GraphNodeSpec,
  GraphEdgeSpec,
  GraphResult,
  ForceOptions,
  CircularOptions,
} from './layout'

// The extension vocabularies (circuits, gates, dataviz, petri) and the
// named style presets are NOT re-exported here. Import them from their
// own subpaths — `@ozan.e/jikz/circuits`, `/gates`, `/dataviz`,
// `/petri`, `/styles` — so the root stays the core vocabulary and short
// names like `red`, `double` or `wire` never collide with yours.
