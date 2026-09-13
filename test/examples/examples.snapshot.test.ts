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

/** Any number carrying more decimals than a drawing could mean. */
const LONG_DECIMAL = /-?\d+\.\d{7,}/g

/**
 * Round long decimals before snapshotting.
 *
 * `Math.sin`/`cos`/`pow` are not required to be correctly rounded, so
 * the plot and parametric demos land on different last bits depending on
 * the platform's V8 build — this suite used to pass on the machine that
 * generated the snapshots and fail everywhere else (six examples, all of
 * them math-driven, on the first CI run). Six decimals is orders of
 * magnitude finer than any change a reader would call a change, so the
 * drift guarantee survives while the machine dependence goes.
 */
function stableFloats(html: string): string {
  return html.replace(LONG_DECIMAL, (n) => Number(n).toFixed(6))
}

describe('examples', () => {
  for (const demo of demos) {
    it(demo.id, () => {
      const container = document.createElement('div')
      demo.render(container)
      expect(stableFloats(container.innerHTML)).toMatchSnapshot()
    })
  }
})
