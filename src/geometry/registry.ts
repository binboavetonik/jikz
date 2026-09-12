import type { Shape, ShapeOptions } from './Shape'
import { Circle } from './Circle'
import { Rectangle } from './Rectangle'
import { Ellipse } from './Ellipse'
import { Diamond } from './Diamond'
import {
  trapezium,
  parallelogram,
  regularPolygon,
  star,
  isoscelesTriangle,
  cylinder,
  singleArrow,
  doubleArrow,
  callout,
  cloud,
  signal,
  tape,
  starburst,
  semicircle,
  kite,
  dart,
  circularSector,
  roundedRectangle,
  chamferedRectangle,
  crossOut,
  strikeOut,
  forbiddenSign,
  magnifyingGlass,
  magneticTape,
  ellipseCallout,
  cloudCallout,
  arrowBox,
  circleSplit,
  rectangleSplit,
} from './complex'

/**
 * Factory for a named shape. Receives the standard {@link ShapeOptions}
 * bag; shape-specific options flow through structurally at runtime —
 * factories narrow internally.
 */
export type ShapeFactory = (options: ShapeOptions) => Shape

/**
 * Optional metadata for a registered shape.
 */
export interface ShapeRegistrationOptions {
  /**
   * Whether `Node` may auto-size this shape to fit its text when no
   * explicit width/height is given (default: true). Domain shapes with
   * an intrinsic size — circuit symbols, icons — should set this to
   * false so text never squeezes the symbol; their factory then applies
   * its own default dimensions.
   */
  textAutoSize?: boolean
}

interface ShapeRegistration {
  factory: ShapeFactory
  textAutoSize: boolean
}

const registry = new Map<string, ShapeRegistration>()

/**
 * Register a shape factory under a name, making it available everywhere
 * built-in shape names are accepted (`node({ shape: 'my shape' })`,
 * `Picture.node`, layout builders). Later registrations replace earlier
 * ones under the same name (TikZ-style redefinition).
 *
 * This is the RUNTIME half of registration. For the compile-time half —
 * IDE autocomplete and typo checking of the name — augment the
 * `ShapeRegistry` interface (see `node/Node`) alongside:
 *
 * @example
 * ```ts
 * registerShape('house', (o) => new House(o))
 * declare module '@ozan.e/jikz' {
 *   interface ShapeRegistry { house: {} }
 * }
 * picture().node('H', { shape: 'house', at: point(50, 50), width: 60 })
 * ```
 *
 * Without the augmentation the name is a compile error; pass a
 * pre-constructed instance instead (`node({ shape: new House({...}) })`).
 */
export function registerShape(
  name: string,
  factory: ShapeFactory,
  options: ShapeRegistrationOptions = {}
): void {
  registry.set(name, {
    factory,
    textAutoSize: options.textAutoSize ?? true,
  })
}

/**
 * Whether a shape factory is registered under `name`.
 */
export function hasShape(name: string): boolean {
  return registry.has(name)
}

/**
 * Whether `Node` should auto-size the named shape to fit its text (see
 * {@link ShapeRegistrationOptions.textAutoSize}). Defaults to true —
 * including for unregistered names, preserving legacy behavior.
 */
export function shapeTextAutoSize(name: string): boolean {
  return registry.get(name)?.textAutoSize ?? true
}

/**
 * All registered shape names (built-ins plus user registrations).
 */
export function registeredShapeNames(): readonly string[] {
  return Array.from(registry.keys())
}

/**
 * Build a shape by name. Throws with the list of known names when the
 * name is not registered — mirroring `Picture`'s unknown-node error.
 */
export function createShape<T extends ShapeOptions>(
  name: string,
  options: T = {} as T
): Shape {
  const factory = registry.get(name)
  if (!factory) {
    const known = registeredShapeNames().map((n) => `"${n}"`).join(', ')
    throw new Error(`Unknown shape type: "${name}" (known: ${known}).`)
  }
  return factory.factory(options)
}

// ─────────────────────────────────────────────────────────────────────────────
// Built-in registrations
//
// The 4 basic shapes adapt geometry primitives to the ShapeOptions bag
// (center + width/height); the complex shapes already take ShapeOptions
// supersets. Registering here — rather than switching in Node — is what
// makes the set open: users add entries with registerShape().
// ─────────────────────────────────────────────────────────────────────────────

registerShape('rectangle', (o) => {
  const c = o.center ?? { x: 0, y: 0 }
  const w = o.width ?? 0
  const h = o.height ?? 0
  return new Rectangle(c.x - w / 2, c.y - h / 2, w, h)
})
registerShape('circle', (o) =>
  new Circle(o.center ?? { x: 0, y: 0 }, Math.max(o.width ?? 0, o.height ?? 0) / 2)
)
registerShape('ellipse', (o) =>
  new Ellipse(o.center ?? { x: 0, y: 0 }, (o.width ?? 0) / 2, (o.height ?? 0) / 2)
)
registerShape('diamond', (o) =>
  new Diamond(o.center ?? { x: 0, y: 0 }, o.width ?? 0, o.height ?? 0)
)

registerShape('trapezium', (o) => trapezium(o as Parameters<typeof trapezium>[0]))
registerShape('parallelogram', (o) => parallelogram(o as Parameters<typeof parallelogram>[0]))
registerShape('regular polygon', (o) => regularPolygon(o as Parameters<typeof regularPolygon>[0]))
registerShape('star', (o) => star(o as Parameters<typeof star>[0]))
registerShape('isosceles triangle', (o) => isoscelesTriangle(o as Parameters<typeof isoscelesTriangle>[0]))
registerShape('cylinder', (o) => cylinder(o as Parameters<typeof cylinder>[0]))
registerShape('single arrow', (o) => singleArrow(o as Parameters<typeof singleArrow>[0]))
registerShape('double arrow', (o) => doubleArrow(o as Parameters<typeof doubleArrow>[0]))
registerShape('callout', (o) => callout(o as Parameters<typeof callout>[0]))
registerShape('cloud', (o) => cloud(o as Parameters<typeof cloud>[0]))
registerShape('signal', (o) => signal(o as Parameters<typeof signal>[0]))
registerShape('tape', (o) => tape(o as Parameters<typeof tape>[0]))
registerShape('starburst', (o) => starburst(o as Parameters<typeof starburst>[0]))
registerShape('semicircle', (o) => semicircle(o as Parameters<typeof semicircle>[0]))
registerShape('kite', (o) => kite(o as Parameters<typeof kite>[0]))
registerShape('dart', (o) => dart(o as Parameters<typeof dart>[0]))
registerShape('circular sector', (o) => circularSector(o as Parameters<typeof circularSector>[0]))
registerShape('rounded rectangle', (o) => roundedRectangle(o as Parameters<typeof roundedRectangle>[0]))
registerShape('chamfered rectangle', (o) => chamferedRectangle(o as Parameters<typeof chamferedRectangle>[0]))
registerShape('cross out', (o) => crossOut(o as Parameters<typeof crossOut>[0]))
registerShape('strike out', (o) => strikeOut(o as Parameters<typeof strikeOut>[0]))
registerShape('forbidden sign', (o) => forbiddenSign(o as Parameters<typeof forbiddenSign>[0]))
registerShape('magnifying glass', (o) => magnifyingGlass(o as Parameters<typeof magnifyingGlass>[0]))
registerShape('magnetic tape', (o) => magneticTape(o as Parameters<typeof magneticTape>[0]))
registerShape('ellipse callout', (o) => ellipseCallout(o as Parameters<typeof ellipseCallout>[0]))
registerShape('cloud callout', (o) => cloudCallout(o as Parameters<typeof cloudCallout>[0]))
registerShape('arrow box', (o) => arrowBox(o as Parameters<typeof arrowBox>[0]))
registerShape('circle split', (o) => circleSplit(o as Parameters<typeof circleSplit>[0]))
registerShape('rectangle split', (o) => rectangleSplit(o as Parameters<typeof rectangleSplit>[0]))
