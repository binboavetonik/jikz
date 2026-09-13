/**
 * The whole built-in catalogue in one set — the TikZ-flavoured
 * convenience for `picture({ shapes: allShapes })`.
 *
 * Kept in its own module so importing `basicShapes` alone does not drag
 * the complex catalogue into a bundle: a module that merged them would
 * have to evaluate both.
 */
import { basicShapes } from './basic'
import { complexShapes } from './complex'

/** Every built-in shape: the primitives plus the complex catalogue. */
export const allShapes = { ...basicShapes, ...complexShapes } as const
