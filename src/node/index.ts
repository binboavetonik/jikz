// Anchor system
export {
  parseAnchorSpec,
  anchorOnRect,
  anchorOnCircle,
  anchorOnEllipse,
  anchorOnDiamond,
  oppositeAnchor,
  isTextAnchor,
  AnchorError,
  ANCHOR_ANGLES,
} from '../core/Anchor'

export type {
  CardinalAnchor,
  TextAnchor,
  StandardAnchor,
  AnchorSpec,
  Anchorable,
} from '../core/Anchor'

// Shapes
export type { Shape, ShapeOptions } from '../geometry/Shape'
export { DEFAULT_SHAPE_OPTIONS } from '../geometry/Shape'
export type { ShapeSpec, ShapeOptionsFor } from './Node'
export type { ShapeKind, ShapeSet, ShapeOptionsOf } from '../geometry/ShapeKind'
export { defineShape, isShapeKind } from '../geometry/ShapeKind'
export { basicShapes, complexShapes, allShapes } from '../geometry/shapes'
// The 4 basic shapes have no node-level wrappers: geometry primitives
// (Circle, Rectangle, Ellipse, Diamond) implement Shape directly —
// import circle/rect/ellipse/diamond from the geometry layer.
// Note: regularPolygon/pentagon/hexagon/star/isoscelesTriangle are
// owned by geometry's vertex factories, so the complex node versions
// are reached via class ({@link Star} et al.) or registry string.
export { Trapezium, trapezium } from '../geometry/complex'
export type { TrapeziumOptions } from '../geometry/complex'
export { Parallelogram, parallelogram } from '../geometry/complex'
export type { ParallelogramOptions } from '../geometry/complex'
export { RegularPolygon, octagon } from '../geometry/complex'
export type { RegularPolygonOptions } from '../geometry/complex'
export { Star } from '../geometry/complex'
export type { StarOptions } from '../geometry/complex'
export { IsoscelesTriangle } from '../geometry/complex'
export type { IsoscelesTriangleOptions } from '../geometry/complex'
export { Cylinder, cylinder } from '../geometry/complex'
export type { CylinderOptions } from '../geometry/complex'
// Arrow shapes
export { SingleArrow, singleArrow } from '../geometry/complex'
export type { SingleArrowOptions, ArrowDirection } from '../geometry/complex'
export { DoubleArrow, doubleArrow } from '../geometry/complex'
export type { DoubleArrowOptions, DoubleArrowDirection } from '../geometry/complex'
// Callout
export { Callout, callout } from '../geometry/complex'
export type { CalloutOptions, CalloutPointerPosition } from '../geometry/complex'
// Symbol shapes
export { Cloud, cloud } from '../geometry/complex'
export type { CloudOptions } from '../geometry/complex'
export { Signal, signal } from '../geometry/complex'
export type { SignalOptions, SignalDirection } from '../geometry/complex'
export { Tape, tape } from '../geometry/complex'
export type { TapeOptions } from '../geometry/complex'
export { Starburst, starburst } from '../geometry/complex'
export type { StarburstOptions } from '../geometry/complex'
// Additional geometric shapes
export { Semicircle, semicircle } from '../geometry/complex'
export type { SemicircleOptions } from '../geometry/complex'
export { Kite, kite } from '../geometry/complex'
export type { KiteOptions } from '../geometry/complex'
export { Dart, dart } from '../geometry/complex'
export type { DartOptions } from '../geometry/complex'
export { CircularSector, circularSector } from '../geometry/complex'
export type { CircularSectorOptions } from '../geometry/complex'
// Misc shapes
export { RoundedRectangle, roundedRectangle } from '../geometry/complex'
export type { RoundedRectangleOptions } from '../geometry/complex'
export { ChamferedRectangle, chamferedRectangle } from '../geometry/complex'
export type { ChamferedRectangleOptions } from '../geometry/complex'
export { CrossOut, crossOut } from '../geometry/complex'
export type { CrossOutOptions } from '../geometry/complex'
export { StrikeOut, strikeOut } from '../geometry/complex'
export type { StrikeOutOptions } from '../geometry/complex'
// Additional symbol shapes
export { ForbiddenSign, forbiddenSign } from '../geometry/complex'
export type { ForbiddenSignOptions } from '../geometry/complex'
export { MagnifyingGlass, magnifyingGlass } from '../geometry/complex'
export type { MagnifyingGlassOptions } from '../geometry/complex'
export { MagneticTape, magneticTape } from '../geometry/complex'
export type { MagneticTapeOptions } from '../geometry/complex'
// Additional callout shapes
export { EllipseCallout, ellipseCallout } from '../geometry/complex'
export type { EllipseCalloutOptions, EllipseCalloutPointerPosition } from '../geometry/complex'
export { CloudCallout, cloudCallout } from '../geometry/complex'
export type { CloudCalloutOptions } from '../geometry/complex'
// Arrow box
export { ArrowBox, arrowBox } from '../geometry/complex'
export type { ArrowBoxOptions, ArrowBoxArrow } from '../geometry/complex'
// Multipart shapes
export { CircleSplit, circleSplit } from '../geometry/complex'
export type { CircleSplitOptions } from '../geometry/complex'
export { RectangleSplit, rectangleSplit } from '../geometry/complex'
export type { RectangleSplitOptions, SplitDirection } from '../geometry/complex'

// Node
export {
  Node,
  node,
  rectNode,
  circleNode,
  ellipseNode,
  diamondNode,
  DEFAULT_LABEL_DISTANCE,
  DEFAULT_LABEL_FONT_SIZE,
} from './Node'
export type { NodeLabel, NodeOptions } from './Node'

// Edge
export {
  Edge,
  edge,
  arrow,
  biEdge,
  bentEdge,
  toEdge,
  bendLeft,
  bendRight,
  loopEdge,
} from './Edge'
export type { ArrowTip, EdgeRouting, EdgeAnchorSpec, EdgeOptions } from './Edge'

// Positioning (TikZ positioning library style)
export {
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
} from './Positioning'
export type { PositionDirection, PositionOptions } from './Positioning'
