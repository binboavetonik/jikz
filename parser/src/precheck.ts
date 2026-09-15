/**
 * The hopeless-file pre-check — plan §5.1, decision 4.
 *
 * Some files describe work jikz cannot draw at all: 3D scenes,
 * pgfplots axes, circuitikz components, page-relative overlays. For
 * those, decision 2's per-statement commenting is actively harmful —
 * it would convert the 2D half of a 3D scene into a confident-looking
 * wrong picture, the worst output this tool can produce. So the whole
 * file is refused, by name, before a tokenizer ever runs.
 *
 * M0 hit four of these five markers in twenty sampled files.
 */

export interface PrecheckRefusal {
  readonly marker: string
  readonly reason: string
  readonly line: number
}

const MARKERS: readonly { readonly pattern: RegExp; readonly marker: string; readonly reason: string }[] = [
  {
    pattern: /\\tdplot|tdplot_main_coords|\\tdplotsetmaincoords/,
    marker: 'tikz-3dplot',
    reason: 'jikz draws in 2D; tikz-3dplot scenes have no 2D equivalent',
  },
  {
    pattern: /\b(?:xyz|xyz spherical|canvas|xy) cs:/,
    marker: '3D coordinate system',
    reason: 'jikz draws in 2D; 3D coordinate systems have no 2D equivalent',
  },
  {
    pattern: /\\begin\{axis\}|\\addplot|\\pgfplotsset/,
    marker: 'pgfplots',
    reason: 'pgfplots is a separate package; port the data to ext/dataviz instead',
  },
  {
    pattern: /\\begin\{circuitikz\}/,
    marker: 'circuitikz',
    reason: "circuitikz's to[R, l=…] component syntax is a separate language; ext/circuits is the jikz analogue",
  },
  {
    pattern: /remember picture|\boverlay\b/,
    marker: 'remember picture / overlay',
    reason: 'page-relative positioning has no meaning in a standalone SVG',
  },
]

/**
 * Returns the refusal, or `undefined` when the file is worth parsing.
 * Only the first marker is reported: one clear reason beats a list.
 */
export function precheck(source: string): PrecheckRefusal | undefined {
  const lines = source.split('\n')
  for (const { pattern, marker, reason } of MARKERS) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!
      // A commented-out marker is not a marker.
      if (stripComment(line).match(pattern)) {
        return { marker, reason, line: i + 1 }
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
