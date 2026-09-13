/**
 * Shapes as values.
 *
 * A shape "kind" is a factory plus the one piece of metadata {@link Node}
 * needs to size it. Naming a shape is therefore just a key in an ordinary
 * object — a {@link ShapeSet} — instead of an entry in a global table:
 *
 * ```ts
 * const pic = picture({ shapes: { ...basicShapes, ...gateShapes } })
 * pic.node('A', { shape: 'circle' })        // resolved against the set
 * pic.node('B', { shape: basicShapes.circle })  // or handed over directly
 * ```
 *
 * Because the set is a value, TypeScript reads the names and the
 * per-name option types straight off it: no registry interface, no
 * declaration merging, and no way for two libraries to disagree about
 * what a name means.
 */
import type { Shape, ShapeOptions } from './Shape'

/**
 * A callable shape factory carrying its own metadata. Build one with
 * {@link defineShape} rather than by hand.
 */
export interface ShapeKind<O extends ShapeOptions = ShapeOptions> {
  (options: O): Shape
  /** Name used in error messages; the set key is what callers type. */
  readonly kindName: string
  /**
   * Whether {@link Node} may size this shape to fit its text. Domain
   * shapes with an intrinsic size (circuit symbols, logic gates) set
   * this false and apply their own defaults.
   */
  readonly textAutoSize: boolean
}

/** A named collection of shape kinds — what `picture({ shapes })` takes. */
export type ShapeSet = Record<string, ShapeKind<ShapeOptions>>

/** The options a set accepts for one of its names. */
export type ShapeOptionsOf<S extends ShapeSet, K extends keyof S> = Parameters<S[K]>[0]

/**
 * Any shape factory, whatever options it declares. The `never[]` rest
 * is the widest constraint that still lets {@link OptionsOf} read the
 * declared parameter back out.
 */
type ShapeFactory = (...args: never[]) => Shape

/**
 * The options a factory accepts, whether it declares them required
 * (`(o: StarOptions) => …`) or optional (`(o?: StarOptions) => …`).
 */
type OptionsOf<F extends ShapeFactory> =
  NonNullable<Parameters<F>[0]> extends ShapeOptions
    ? NonNullable<Parameters<F>[0]>
    : ShapeOptions

/**
 * Wrap a shape factory as a {@link ShapeKind}, carrying its name and
 * sizing behaviour. The factory's own parameter type becomes the kind's
 * `shapeOptions` type, so `{ points: 8 }` is checked against the
 * function that will receive it:
 *
 * ```ts
 * const houseShape = defineShape('house', (o: HouseOptions) => new House(o))
 * picture({ shapes: { house: houseShape } })
 *   .node('H', { shape: 'house', shapeOptions: { chimneys: 2 } })
 * ```
 *
 * @param kindName name for error messages
 * @param create the factory
 * @param options `textAutoSize: false` for shapes with an intrinsic
 *   size, which must never stretch to fit text
 */
export function defineShape<F extends ShapeFactory>(
  kindName: string,
  create: F,
  options: { textAutoSize?: boolean } = {}
): ShapeKind<OptionsOf<F>> {
  return Object.assign(create as (o: OptionsOf<F>) => Shape, {
    kindName,
    textAutoSize: options.textAutoSize ?? true,
  }) as ShapeKind<OptionsOf<F>>
}

/** Whether a shape spec is a kind (callable) rather than a built instance. */
export function isShapeKind(value: unknown): value is ShapeKind<ShapeOptions> {
  // A bare callable is not enough: Node reads `textAutoSize` off a kind,
  // and an arbitrary function passed as `shape` would silently disable
  // text sizing instead of failing. `kindName` is what defineShape stamps.
  return typeof value === 'function' && typeof (value as ShapeKind).kindName === 'string'
}
