// @vitest-environment jsdom
/**
 * Snapshot suite for the example gallery — the guarantee that docs and
 * demos can never drift from the library: every module in examples/ is
 * rendered into a jsdom container and its output snapshotted.
 *
 * Text measurement uses jikz's deterministic font-metrics fallback
 * (jsdom has no canvas backend), so snapshots are stable across machines.
 *
 * These used to be rounded here before snapshotting, because
 * `Math.sin`/`cos`/`pow` are not correctly rounded and the last bits
 * differ per engine. The renderer now rounds coordinates on the way out,
 * so the raw output is already machine-independent and the helper is gone.
 */
import { describe, expect, it } from 'vitest'
import { demos } from '../../examples/manifest'

describe('examples', () => {
  for (const demo of demos) {
    it(demo.id, () => {
      const container = document.createElement('div')
      demo.render(container)
      expect(container.innerHTML).toMatchSnapshot()
    })
  }
})
