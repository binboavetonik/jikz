/**
 * The `jikz` import aliases the examples, tests and docs site use to
 * reach the LIVE source — one per package subpath, mirroring
 * package.json `exports`. Shared by vite.config.ts, vitest.config.ts
 * and docs/.vitepress/config.mts so the three cannot drift.
 */
import { resolve } from 'node:path'

export const SUBPATHS: Record<string, string> = {
  circuits: 'src/ext/circuits/index.ts',
  gates: 'src/ext/gates/index.ts',
  dataviz: 'src/ext/dataviz/index.ts',
  petri: 'src/ext/petri/index.ts',
  angles: 'src/ext/angles/index.ts',
  automata: 'src/ext/automata/index.ts',
  er: 'src/ext/er/index.ts',
  turtle: 'src/ext/turtle/index.ts',
  spy: 'src/ext/spy/index.ts',
  projection: 'src/ext/projection/index.ts',
  mindmap: 'src/ext/mindmap/index.ts',
  layout: 'src/layout/index.ts',
  styles: 'src/render/presets.ts',
}

/** Vite/Vitest `resolve.alias` entries, most specific first. */
export function jikzAliases(root: string): { find: RegExp; replacement: string }[] {
  return [
    ...Object.entries(SUBPATHS).map(([sub, file]) => ({
      find: new RegExp(`^jikz/${sub}$`),
      replacement: resolve(root, file),
    })),
    { find: /^jikz$/, replacement: resolve(root, 'src/index.ts') },
  ]
}
