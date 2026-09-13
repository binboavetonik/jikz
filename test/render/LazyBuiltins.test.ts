/**
 * Arrow tips and decorations still live in global tables that fill on
 * first use, not at import (see the tree-shaking guard in
 * test/build/tree-shaking.test.ts for why). This pins the observable
 * contract: every lookup sees the built-ins without any prior call.
 *
 * Shapes no longer need this — they are values in a set, so there is no
 * table to fill and nothing to register. See ShapeKind.test.ts.
 */
import { describe, it, expect } from 'vitest'
import {
  hasArrowTip,
  getArrowTip,
  registeredArrowTips,
  hasDecoration,
  registeredDecorations,
} from '../../src/index'

describe('lazy built-in registration', () => {
  it('arrow tips and decorations are visible from the first lookup', () => {
    expect(hasArrowTip('stealth')).toBe(true)
    expect(getArrowTip('to')).toBeDefined()
    expect(registeredArrowTips()).toContain('roundCap')
    expect(hasDecoration('snake')).toBe(true)
    expect(registeredDecorations()).toEqual(
      expect.arrayContaining(['snake', 'zigzag', 'coil', 'bumps', 'saw', 'random', 'brace']),
    )
  })
})
