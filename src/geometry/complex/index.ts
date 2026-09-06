// Complex node shapes (Star, Cloud, Callout, Cylinder, …).
// ShapeOptions/DEFAULT_SHAPE_OPTIONS live in ../Shape; import from
// there directly rather than through this barrel.

// The 4 basic shapes have NO node-level wrappers: geometry primitives
// (Circle, Rectangle, Ellipse, Diamond) implement the Shape interface
// directly — use circle()/rect()/ellipse()/diamond() from '../Circle' et al.

// Quadrilaterals
export { Trapezium, trapezium } from './Trapezium'
export type { TrapeziumOptions } from './Trapezium'
export { Parallelogram, parallelogram } from './Parallelogram'
export type { ParallelogramOptions } from './Parallelogram'

// Polygons
export {
  RegularPolygon,
  regularPolygon,
  pentagon,
  hexagon,
  octagon,
} from './RegularPolygon'
export type { RegularPolygonOptions } from './RegularPolygon'

export { Star, star } from './Star'
export type { StarOptions } from './Star'

export { IsoscelesTriangle, isoscelesTriangle } from './IsoscelesTriangle'
export type { IsoscelesTriangleOptions } from './IsoscelesTriangle'

// 3D-like shapes
export { Cylinder, cylinder } from './Cylinder'
export type { CylinderOptions } from './Cylinder'

// Arrow shapes
export { SingleArrow, singleArrow } from './SingleArrow'
export type { SingleArrowOptions, ArrowDirection } from './SingleArrow'
export { DoubleArrow, doubleArrow } from './DoubleArrow'
export type { DoubleArrowOptions, DoubleArrowDirection } from './DoubleArrow'

// Callout/Speech bubble
export { Callout, callout } from './Callout'
export type { CalloutOptions, CalloutPointerPosition } from './Callout'

// Symbol shapes
export { Cloud, cloud } from './Cloud'
export type { CloudOptions } from './Cloud'
export { Signal, signal } from './Signal'
export type { SignalOptions, SignalDirection } from './Signal'
export { Tape, tape } from './Tape'
export type { TapeOptions } from './Tape'
export { Starburst, starburst } from './Starburst'
export type { StarburstOptions } from './Starburst'

// Additional geometric shapes
export { Semicircle, semicircle } from './Semicircle'
export type { SemicircleOptions } from './Semicircle'
export { Kite, kite } from './Kite'
export type { KiteOptions } from './Kite'
export { Dart, dart } from './Dart'
export type { DartOptions } from './Dart'
export { CircularSector, circularSector } from './CircularSector'
export type { CircularSectorOptions } from './CircularSector'

// Misc shapes
export { RoundedRectangle, roundedRectangle } from './RoundedRectangle'
export type { RoundedRectangleOptions } from './RoundedRectangle'
export { ChamferedRectangle, chamferedRectangle } from './ChamferedRectangle'
export type { ChamferedRectangleOptions } from './ChamferedRectangle'
export { CrossOut, crossOut } from './CrossOut'
export type { CrossOutOptions } from './CrossOut'
export { StrikeOut, strikeOut } from './StrikeOut'
export type { StrikeOutOptions } from './StrikeOut'

// Additional symbol shapes
export { ForbiddenSign, forbiddenSign } from './ForbiddenSign'
export type { ForbiddenSignOptions } from './ForbiddenSign'
export { MagnifyingGlass, magnifyingGlass } from './MagnifyingGlass'
export type { MagnifyingGlassOptions } from './MagnifyingGlass'
export { MagneticTape, magneticTape } from './MagneticTape'
export type { MagneticTapeOptions } from './MagneticTape'

// Additional callout shapes
export { EllipseCallout, ellipseCallout } from './EllipseCallout'
export type { EllipseCalloutOptions, EllipseCalloutPointerPosition } from './EllipseCallout'
export { CloudCallout, cloudCallout } from './CloudCallout'
export type { CloudCalloutOptions } from './CloudCallout'

// Arrow box
export { ArrowBox, arrowBox } from './ArrowBox'
export type { ArrowBoxOptions, ArrowBoxArrow } from './ArrowBox'

// Multipart shapes
export { CircleSplit, circleSplit } from './CircleSplit'
export type { CircleSplitOptions } from './CircleSplit'
export { RectangleSplit, rectangleSplit } from './RectangleSplit'
export type { RectangleSplitOptions, SplitDirection } from './RectangleSplit'
