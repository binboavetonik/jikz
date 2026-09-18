/**
 * Greedy word wrap for node text — TikZ `text width`. Each `\n`
 * paragraph is filled word by word up to `maxWidth`; a word wider
 * than the box gets a line of its own rather than being split.
 */
import { measureText, type TextMeasureOptions } from './measureText'

export function wrapText(text: string, maxWidth: number, font: TextMeasureOptions = {}): string[] {
  const out: string[] = []
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(/\s+/).filter((w) => w.length > 0)
    if (words.length === 0) {
      out.push('')
      continue
    }
    let line = ''
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word
      if (line && measureText(candidate, font).width > maxWidth) {
        out.push(line)
        line = word
      } else {
        line = candidate
      }
    }
    out.push(line)
  }
  return out
}
