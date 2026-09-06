// @vitest-environment jsdom
/**
 * Snapshot suite for the example gallery — the guarantee that docs and
 * demos can never drift from the library: every module in examples/ is
 * rendered into a jsdom container and its output snapshotted.
 *
 * Text measurement uses jikz's deterministic font-metrics fallback
 * (jsdom has no canvas backend), so snapshots are stable across machines.
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
