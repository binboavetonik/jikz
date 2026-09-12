/**
 * Built-ins register on first use, not at import (see the tree-shaking
 * guard in test/build/tree-shaking.test.ts for why). These tests pin
 * the observable contract of that laziness:
 *
 *   - every lookup sees the built-ins without any prior call;
 *   - a user registration made BEFORE any lookup still wins over a
 *     built-in of the same name (built-ins register first, then the
 *     user's entry replaces it — the same order as import-time
 *     registration gave).
 *
 * Runs in its own file because it deliberately overrides a built-in
 * shape name, and vitest isolates module state per test file.
 */
import { describe, it, expect } from 'vitest'
import {
  registerShape,
  createShape,
  hasShape,
  registeredShapeNames,
  hasArrowTip,
  getArrowTip,
  registeredArrowTips,
  hasDecoration,
  registeredDecorations,
  circle,
  point,
} from '../../src/index'

describe('lazy built-in registration', () => {
  it('a user registration made before any lookup overrides the built-in', () => {
    // No registry function has been called yet in this module graph.
    const custom = circle(point(0, 0), 1)
    registerShape('star', () => custom)
    expect(createShape('star')).toBe(custom)
    // ...and the other built-ins were registered underneath it.
    expect(hasShape('cloud callout')).toBe(true)
    expect(registeredShapeNames()[0]).toBe('rectangle')
  })

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
