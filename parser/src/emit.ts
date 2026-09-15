/**
 * IR → TypeScript source. The shipped product (plan §6).
 *
 * Two rules carry most of the value:
 *
 * 1. **Every statement keeps its source line as a comment.** A
 *    migration tool is read by a human diffing against the original,
 *    which makes this the highest-value formatting decision here.
 * 2. **Deterministic output.** Fixed printer, fixed indentation, no
 *    formatter dependency — the corpus tests diff this text.
 */
import type { IrItem } from './types'

export interface EmitOptions {
  /** Module specifier for the jikz import. */
  from?: string
}

export function emit(items: readonly IrItem[], options: EmitOptions = {}): string {
  const from = options.from ?? '@ozan.e/jikz'
  const lines: string[] = [
    `import { picture, point, allShapes } from '${from}'`,
    '',
    'export function build() {',
    '  const pic = picture({ shapes: allShapes })',
  ]

  for (const item of items) {
    lines.push('')
    lines.push(`  // ${item.source}`)
    if (item.kind === 'skipped') {
      // Decision 2: the statement survives as a comment, so the file
      // still compiles and the gap is visible where it happened.
      lines.push(`  // TODO(jikz-tikz): ${item.reason}`)
      continue
    }
    const chain = item.segments
      .map((s) => `.${s.op}(point(${s.x}, ${s.y}))`)
      .join('')
    lines.push(`  pic.pen()${chain}`)
  }

  lines.push('')
  lines.push('  return pic')
  lines.push('}')
  lines.push('')
  return lines.join('\n')
}
