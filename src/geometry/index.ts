// Geometry primitives
export { Line, line, lineFromAngle, horizontalLine, verticalLine } from './Line'
export {
  Circle,
  circle,
  circleFromCenterAndPoint,
  circleFromDiameter,
  circleThrough,
  circleEnclosing2,
  circleEnclosing3,
} from './Circle'
export { Arc, arc, arcThrough, arcFromBulge, arcFromRadius } from './Arc'
export {
  Rectangle,
  rect,
  rectFromCenter,
  rectFromCorners,
  square,
  rectFit,
  rectFromBounds,
} from './Rectangle'

// Conic sections
export {
  Ellipse,
  ellipse,
  ellipseFromAxes,
  ellipseFromFoci,
  ellipseInRect,
} from './Ellipse'
export {
  Parabola,
  parabola,
  parabolaFromFocus,
  parabolaThrough,
  parabolaBend,
  parabolaFromCoefficient,
} from './Parabola'
export {
  Hyperbola,
  hyperbola,
  hyperbolaFromFoci,
  hyperbolaFromFociAndPoint,
  hyperbolaFromEccentricity,
  rectangularHyperbola,
  hyperbolaFromAsymptote,
} from './Hyperbola'

// Function plotting
export {
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
} from './Plot'
export type { PlotOptions, ParametricPlotOptions, PolarPlotOptions } from './Plot'

// Polygons
export {
  Polygon,
  polygon,
  regularPolygon,
  equilateralTriangle,
  regularSquare,
  pentagon,
  hexagon,
  star,
} from './Polygon'

export {
  Triangle,
  triangle,
  rightTriangle,
  isoscelesTriangle,
  equilateral,
} from './Triangle'

// Intersection utilities
export {
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
} from './intersect'

export type { IntersectionResult, IntersectableShape } from './intersect'

// Shape contract + factory options
export type { Shape, ShapeOptions } from './Shape'
export { DEFAULT_SHAPE_OPTIONS } from './Shape'

// Vertex-driven base class for custom polygonal shapes
export { AnchoredPolygon, rayEdgeIntersection, pointInPolygon, polygonBounds } from './AnchoredPolygon'

// Shape registry (register your own shapes by name)
export { registerShape, createShape, hasShape, registeredShapeNames, shapeTextAutoSize } from './registry'
export type { ShapeFactory, ShapeRegistrationOptions } from './registry'

// Diamond (Polygon subclass)
export { Diamond, diamond } from './Diamond'

// Geometric rotation decorator
export { Rotated, rotated } from './Rotated'

// Complex shapes (Star, Cloud, Callout, Cylinder, arrows, splits, …)
export * from './complex'
