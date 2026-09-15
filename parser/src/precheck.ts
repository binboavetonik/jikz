/**
 * The hopeless-file pre-check — plan §5.1, decision 4.
 *
 * Some files describe work the converter will not attempt. For those,
 * decision 2's per-statement commenting is actively harmful: it would
 * convert the 2D half of a 3D scene into a confident-looking wrong
 * picture, the worst output this tool can produce. So the whole file
 * is refused, by name, before a tokenizer ever runs.
 *
 * **Two categories, one behaviour.** Both refuse the file and emit
 * nothing; they differ in what they promise:
 *
 * - `cannot` — jikz has no model for this, and a parser cannot supply
 *   one. Depth-sorted surface meshes; page-relative positioning.
 * - `not-yet` — jikz can already draw it; the parser cannot yet read
 *   it. 3D *projection*, pgfplots axes, circuitikz bipoles. Each has
 *   a home in the library and a line in the roadmap.
 *
 * The distinction is not cosmetic. Three of the five markers here were
 * originally filed as "cannot", which told readers "never" about work
 * that is merely unbuilt — and would have quietly justified never
 * building it.
 */

export type RefusalCategory = 'cannot' | 'not-yet'

export interface PrecheckRefusal {
  readonly marker: string
  readonly category: RefusalCategory
  readonly reason: string
  readonly line: number
}

interface Marker {
  readonly pattern: RegExp
  readonly marker: string
  readonly category: RefusalCategory
  readonly reason: string
}

/**
 * Order is significant: the first match wins, so every `cannot` sits
 * ahead of every `not-yet`. A spherical surface plot also matches the
 * 3D-projection pattern, and it must report the harder truth.
 */
const MARKERS: readonly Marker[] = [
  {
    pattern: /\\tdplotsphericalsurfaceplot|\\addplot3|shader\s*=|\[\s*surf\b/,
    marker: 'surface plot',
    category: 'cannot',
    reason:
      'a parametric surface mesh needs per-face fill and depth ordering, which jikz has no model for',
  },
  {
    pattern: /remember picture|\boverlay\b/,
    marker: 'remember picture / overlay',
    category: 'cannot',
    reason: 'page-relative positioning has no meaning in a standalone SVG',
  },
  {
    pattern: /\\tdplot|tdplot_main_coords|\b(?:xyz|xyz spherical|canvas|xy) cs:/,
    marker: '3D projection',
    category: 'not-yet',
    reason:
      'TikZ 3D is a projection, not a renderer — jikz can draw the projected result once ext/projection lands; the parser has no projection stage yet',
  },
  {
    pattern: /\\begin\{axis\}|\\addplot|\\pgfplotsset/,
    marker: 'pgfplots',
    category: 'not-yet',
    reason:
      'pgfplots axes map onto ext/dataviz (chart/axes/legend); the parser has no axis grammar yet',
  },
  {
    pattern: /\\begin\{circuitikz\}/,
    marker: 'circuitikz',
    category: 'not-yet',
    reason:
      "circuitikz's to[…] bipole syntax maps onto ext/circuits; the parser has no bipole grammar yet, and ext/circuits carries seven components to circuitikz's hundreds",
  },
]

/**
 * Returns the refusal, or `undefined` when the file is worth parsing.
 * Only the first marker is reported: one clear reason beats a list.
 */
export function precheck(source: string): PrecheckRefusal | undefined {
  const lines = source.split('\n')
  for (const { pattern, marker, category, reason } of MARKERS) {
    for (let i = 0; i < lines.length; i++) {
      // A commented-out marker is not a marker.
      if (stripComment(lines[i]!).match(pattern)) {
        return { marker, category, reason, line: i + 1 }
      }
    }
  }
  return undefined
}

/** Drop a trailing `%` comment, honouring `\%`. */
export function stripComment(line: string): string {
  const at = line.search(/(?<!\\)%/)
  return at === -1 ? line : line.slice(0, at)
}
