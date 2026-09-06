import type { SVGBuilder } from './SVGBuilder'

/**
 * Idempotent `<defs>` bookkeeping for a renderer.
 *
 * Markers, patterns, gradients, shadows, and clip paths all need the
 * same mechanism: derive a stable id, build the def exactly once, and
 * hand back `url(#id)` references. Previously each concern kept its own
 * `Set<string>` in SVGRenderer; DefsManager centralizes the bookkeeping
 * so the renderer (and future backends) just describe *what* to build.
 *
 * Ids must be unique per logical def — callers embed distinguishing
 * attributes (color, spec hash) in the id they pass in.
 */
export class DefsManager {
  private readonly defined = new Set<string>()

  constructor(private readonly root: SVGBuilder) {}

  /**
   * Ensure the def with the given id exists, building it once via
   * `build` (which receives the root's `<defs>` container). Returns the
   * `url(#id)` reference either way.
   */
  ensure(id: string, build: (defs: SVGBuilder) => void): string {
    if (!this.defined.has(id)) {
      build(this.root.defs())
      this.defined.add(id)
    }
    return `url(#${id})`
  }

  /**
   * Whether a def with this id has been built.
   */
  has(id: string): boolean {
    return this.defined.has(id)
  }

  /**
   * Forget all built defs (does not remove them from the builder —
   * pair with `SVGBuilder.clear()` for a full reset).
   */
  clear(): void {
    this.defined.clear()
  }
}
