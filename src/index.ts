// Core
export { Point, point, polar, origin } from './core/Point'
export { Transform, transform, fromMatrix } from './core/Transform'

// Types
export type { PointLike, Styleable, Matrix, AngleOptions } from './core/types'

// Utils
export {
  EPSILON,
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
  // Shape registry
  registerShape,
  createShape,
  hasShape,
  registeredShapeNames,
  shapeTextAutoSize,
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
  // available as classes or by registry name ('star', …).
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
  SHAPE_TYPES,
  // Node
  Node,
  node,
  rectNode,
  circleNode,
  ellipseNode,
  diamondNode,
  DEFAULT_LABEL_DISTANCE,
  DEFAULT_LABEL_FONT_SIZE,
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
} from './node'

export type {
  CardinalAnchor,
  TextAnchor,
  StandardAnchor,
  AnchorSpec,
  Anchorable,
  Shape,
  ShapeType,
  ShapeRegistry,
  ShapeOptionsFor,
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
  NodeLabel,
  ArrowTip,
  EdgeRouting,
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
  // Path data transforms
  rotatePathData,
  // SVG path import (parsePathData / pathFromSVG)
  pathFromSVG,
  parsePathData,
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
} from './path'

// Renderer
export {
  // Type guards
  isPoint,
  isPath,
  isLine,
  isCircle,
  isArc,
  isEllipse,
  isRectangle,
  isPolygon,
  isNode,
  isEdge,
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
  registerStyle,
  hasStyle,
  registeredStyleNames,
  styleToSVGAttributes,
  styleToCSSString,
  // Named preset objects for the array form of `style`
  // ([thick, dashed, red] — TikZ's option list, typed)
  ultraThin,
  veryThin,
  thin,
  semithick,
  thick,
  veryThick,
  ultraThick,
  solid,
  dashed,
  dotted,
  dashdotted,
  denselyDashed,
  looselyDashed,
  denselyDotted,
  looselyDotted,
  red,
  blue,
  green,
  orange,
  purple,
  black,
  gray,
  white,
  fillRed,
  fillBlue,
  fillGreen,
  fillOrange,
  fillPurple,
  fillGray,
  fillWhite,
  fillOnly,
  patternHorizontalLines,
  patternVerticalLines,
  patternNorthEastLines,
  patternNorthWestLines,
  patternGrid,
  patternCrosshatch,
  patternDots,
  patternCrosshatchDots,
  patternFivepointedStars,
  patternSixpointedStars,
  patternBricks,
  patternCheckerboard,
  shadow,
  shadowSm,
  shadowLg,
  rounded,
  roundedSm,
  roundedLg,
  roundedXl,
  roundedFull,
  double,
  PRESET_OBJECTS,
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
  resolveMathRenderer,
  // Arrow tip + pattern registries
  registerArrowTip,
  getArrowTip,
  hasArrowTip,
  registeredArrowTips,
  resolveArrowTipKind,
  registerPattern,
  getPatternDefinition,
  registeredPatternNames,
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
export { Pen } from './picture'
export type { PenOptions, PenHost, PenPoint, ToOptions } from './picture'
export type {
  PictureEndpoint,
  PictureItem,
  PathMode,
  PictureRenderer,
  PictureOptions,
  PictureTextOptions,
  PictureViewBox,
  MountOptions,
  DrawOptions,
  ShadeOptions,
  DrawLabel,
  ScopeOptions,
  GroupRenderOptions,
  ContainerRoot,
} from './picture'

export type {
  Renderer,
  Renderable,
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
  StyleRecipe,
  DashPatternName,
  KaTeXOptions,
  SVGRendererOptions,
  MathRenderer,
  MathRendererOptions,
  KaTeXLike,
  ArrowTipDefinition,
  ArrowTipArtwork,
  FillPatternName,
  FillPatternSpec,
  PatternDefinition,
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

// ─────────────────────────────────────────────────────────────────────────────
// Extensions (domain vocabularies on the public seams — opt-in registration)
// ─────────────────────────────────────────────────────────────────────────────

export {
  registerCircuits,
  circuitsRegistered,
  CIRCUIT_SHAPES,
  circuit,
  CircuitSymbol,
  TwoTerminalSymbol,
  symbolSize,
  twoTerminalPorts,
  TWO_TERMINAL_PORTS,
  OPAMP_PORTS,
  GROUND_PORTS,
  CIRCUIT_PORTS,
  junctionDot,
  wire,
  Resistor,
  resistor,
  RESISTOR_DEFAULT_WIDTH,
  RESISTOR_DEFAULT_HEIGHT,
  Capacitor,
  capacitor,
  Inductor,
  inductor,
  Diode,
  diode,
  Switch,
  createSwitch,
  VoltageSource,
  CurrentSource,
  voltageSource,
  currentSource,
  Ground,
  ground,
  OpAmp,
  opAmp,
} from './ext/circuits'

export type {
  CircuitShapeName,
  CircuitBuilder,
  TwoTerminalPort,
  OpAmpPort,
  GroundPort,
  CircuitPort,
  ResistorOptions,
  ResistorVariant,
  CapacitorOptions,
  CapacitorVariant,
  InductorOptions,
  DiodeOptions,
  DiodeVariant,
  SwitchOptions,
  SwitchVariant,
  SourceOptions,
  GroundOptions,
  OpAmpOptions,
} from './ext/circuits'

// Logic gates (TikZ shapes.gates.logic) — opt-in registration

export {
  registerGates,
  gatesRegistered,
  GATE_SHAPES,
  GATE_PORTS,
  gates,
  LogicGate,
  gate,
  andGate,
  nandGate,
  orGate,
  norGate,
  xorGate,
  xnorGate,
  notGate,
  bufferGate,
  GATE_DEFAULT_WIDTH,
  GATE_DEFAULT_HEIGHT,
} from './ext/gates'

export type {
  GateShapeName,
  GatePort,
  GateBuilder,
  GateKind,
  GateVariant,
  LogicGateOptions,
} from './ext/gates'
