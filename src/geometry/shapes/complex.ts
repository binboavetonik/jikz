/**
 * The complex shape catalogue as kinds — TikZ's `shapes.geometric`,
 * `shapes.symbols`, `shapes.callouts`, `shapes.arrows` and
 * `shapes.multipart` equivalents.
 *
 * Each entry types its own options, so `shapeOptions` is checked per
 * name against the factory that will receive it.
 */
import {
  arrowBox,
  callout,
  chamferedRectangle,
  circleSplit,
  circularSector,
  cloud,
  cloudCallout,
  crossOut,
  cylinder,
  dart,
  doubleArrow,
  ellipseCallout,
  forbiddenSign,
  isoscelesTriangle,
  kite,
  magneticTape,
  magnifyingGlass,
  parallelogram,
  rectangleSplit,
  regularPolygon,
  roundedRectangle,
  semicircle,
  signal,
  singleArrow,
  star,
  starburst,
  strikeOut,
  tape,
  trapezium,
} from '../complex'
import { defineShape } from '../ShapeKind'

/** Every non-primitive built-in shape, keyed by its TikZ-style name. */
export const complexShapes = {
  trapezium: defineShape('trapezium', trapezium),
  parallelogram: defineShape('parallelogram', parallelogram),
  'regular polygon': defineShape('regular polygon', regularPolygon),
  star: defineShape('star', star),
  'isosceles triangle': defineShape('isosceles triangle', isoscelesTriangle),
  cylinder: defineShape('cylinder', cylinder),
  'single arrow': defineShape('single arrow', singleArrow),
  'double arrow': defineShape('double arrow', doubleArrow),
  callout: defineShape('callout', callout),
  cloud: defineShape('cloud', cloud),
  signal: defineShape('signal', signal),
  tape: defineShape('tape', tape),
  starburst: defineShape('starburst', starburst),
  semicircle: defineShape('semicircle', semicircle),
  kite: defineShape('kite', kite),
  dart: defineShape('dart', dart),
  'circular sector': defineShape('circular sector', circularSector),
  'rounded rectangle': defineShape('rounded rectangle', roundedRectangle),
  'chamfered rectangle': defineShape('chamfered rectangle', chamferedRectangle),
  'cross out': defineShape('cross out', crossOut),
  'strike out': defineShape('strike out', strikeOut),
  'forbidden sign': defineShape('forbidden sign', forbiddenSign),
  'magnifying glass': defineShape('magnifying glass', magnifyingGlass),
  'magnetic tape': defineShape('magnetic tape', magneticTape),
  'ellipse callout': defineShape('ellipse callout', ellipseCallout),
  'cloud callout': defineShape('cloud callout', cloudCallout),
  'arrow box': defineShape('arrow box', arrowBox),
  'circle split': defineShape('circle split', circleSplit),
  'rectangle split': defineShape('rectangle split', rectangleSplit),
} as const
