/**
 * A catcode-lite scanner — TeX-ish, deliberately not TeX.
 *
 * It knows control sequences, grouping, brackets, numbers and the few
 * path operators M1 needs. It does not expand macros, track catcodes
 * or read the preamble; the plan's decision 3 is what keeps that out.
 */

export type TokenKind =
  | 'command'  // \draw
  | 'number'
  | 'word'
  | '(' | ')' | '[' | ']' | '{' | '}'
  | ',' | ';' | ':'
  | '--'

export interface Token {
  readonly kind: TokenKind
  readonly value: string
  readonly line: number
}

const PUNCT: Record<string, TokenKind> = {
  '(': '(', ')': ')', '[': '[', ']': ']', '{': '{', '}': '}',
  ',': ',', ';': ';', ':': ':',
}

export function tokenize(source: string): Token[] {
  const out: Token[] = []
  let i = 0
  let line = 1

  while (i < source.length) {
    const c = source[i]!

    if (c === '\n') { line++; i++; continue }
    if (/\s/.test(c)) { i++; continue }

    // Comment to end of line (`\%` is a literal percent, not a comment).
    if (c === '%' && source[i - 1] !== '\\') {
      while (i < source.length && source[i] !== '\n') i++
      continue
    }

    // Control sequence: \draw, \begin, \\ …
    if (c === '\\') {
      const m = /^\\([a-zA-Z@]+|.)/.exec(source.slice(i))!
      out.push({ kind: 'command', value: m[1]!, line })
      i += m[0].length
      continue
    }

    // `--` before a lone `-`, so a path operator never scans as a sign.
    if (c === '-' && source[i + 1] === '-') {
      out.push({ kind: '--', value: '--', line })
      i += 2
      continue
    }

    if (/[-+.\d]/.test(c)) {
      const m = /^[-+]?(?:\d+\.?\d*|\.\d+)/.exec(source.slice(i))
      if (m) {
        out.push({ kind: 'number', value: m[0], line })
        i += m[0].length
        continue
      }
    }

    const punct = PUNCT[c]
    if (punct) {
      out.push({ kind: punct, value: c, line })
      i++
      continue
    }

    const word = /^[a-zA-Z][a-zA-Z0-9 ]*/.exec(source.slice(i))
    if (word) {
      out.push({ kind: 'word', value: word[0].trim(), line })
      i += word[0].length
      continue
    }

    // Unknown character: emit as a word so the statement is recorded
    // as unsupported rather than silently vanishing.
    out.push({ kind: 'word', value: c, line })
    i++
  }

  return out
}
