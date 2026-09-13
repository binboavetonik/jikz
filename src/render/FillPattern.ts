/**
 * Fill patterns as values.
 *
 * A pattern is a tile definition that knows its own name; the built-in
 * twelve live in `./patterns` and {@link definePattern} builds your
 * own. Nothing is registered globally, so a picture carries only the
 * tiles it actually fills with:
 *
 * ```ts
 * pic.filldraw(rect(0, 0, 60, 40), { style: { fillPattern: fillPatterns.dots } })
 * pic.filldraw(box, { style: { fillPattern: { pattern: fillPatterns.grid, color: '#2563eb' } } })
 * ```
 */

/** How to render one pattern tile. */
export interface PatternDefinition {
  width: number
  height: number
  defaultLineWidth: number
  createContent(color: string, lineWidth: number): string
}

/**
 * A fill pattern as a value: a {@link PatternDefinition} carrying the
 * name it reports in generated `<defs>` ids. Build one with
 * {@link definePattern}.
 */
export interface PatternKind extends PatternDefinition {
  readonly patternName: string
}

/** A pattern plus per-use customization. */
export interface FillPatternSpec {
  pattern: PatternKind
  color?: string
  backgroundColor?: string
  scale?: number
  lineWidth?: number
  rotation?: number
}

/**
 * Name a tile definition, making it usable as `style: { fillPattern }`.
 *
 * ```ts
 * const herringbone = definePattern('herringbone', {
 *   width: 16,
 *   height: 16,
 *   defaultLineWidth: 1.2,
 *   createContent: (color, lw) =>
 *     `<path d="M0 8 L8 0" stroke="${color}" stroke-width="${lw}" fill="none"/>`,
 * })
 * ```
 */
export function definePattern(
  patternName: string,
  definition: PatternDefinition
): PatternKind {
  return { ...definition, patternName }
}

/**
 * Normalize a pattern input — a kind, or a kind plus customization — to
 * a full {@link FillPatternSpec}.
 */
export function normalizePatternSpec(
  input: PatternKind | FillPatternSpec
): FillPatternSpec {
  return 'pattern' in input ? input : { pattern: input }
}

/**
 * Generate a deterministic pattern ID from a spec.
 * Same spec always produces the same ID, enabling dedup in `<defs>`.
 */
export function generatePatternId(spec: FillPatternSpec): string {
  const parts = ['jikz-pattern', spec.pattern.patternName.replace(/\s+/g, '-')]

  if (spec.color) {
    parts.push(`c${spec.color.replace('#', '')}`)
  }
  if (spec.backgroundColor) {
    parts.push(`bg${spec.backgroundColor.replace('#', '')}`)
  }
  if (spec.scale !== undefined && spec.scale !== 1) {
    parts.push(`s${spec.scale}`)
  }
  if (spec.lineWidth !== undefined) {
    parts.push(`lw${spec.lineWidth}`)
  }
  if (spec.rotation !== undefined && spec.rotation !== 0) {
    parts.push(`r${spec.rotation}`)
  }

  return parts.join('-')
}
