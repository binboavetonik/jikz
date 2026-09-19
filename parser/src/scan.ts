/**
 * A cursor over TikZ source. It knows TeX's three bracket kinds,
 * comments, control sequences and numbers with units — and nothing
 * about macro expansion or catcodes, which §0 keeps out.
 */
import type { Length, Position } from './ast'

export class ScanError extends Error {
  constructor(
    message: string,
    readonly at: Position
  ) {
    super(message)
    this.name = 'ScanError'
  }
}

const NUMBER = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/i

export class Scanner {
  pos = 0
  constructor(readonly src: string) {}

  get done(): boolean {
    this.skip()
    return this.pos >= this.src.length
  }

  position(at = this.pos): Position {
    let line = 1
    let last = -1
    for (let i = 0; i < at && i < this.src.length; i++) {
      if (this.src[i] === '\n') {
        line++
        last = i
      }
    }
    return { line, column: at - last }
  }

  error(message: string, at = this.pos): ScanError {
    return new ScanError(message, this.position(at))
  }

  /** Skip whitespace and `%` comments. */
  skip(): void {
    for (;;) {
      const c = this.src[this.pos]
      if (c === undefined) return
      if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
        this.pos++
      } else if (c === '%') {
        while (this.pos < this.src.length && this.src[this.pos] !== '\n') this.pos++
      } else {
        return
      }
    }
  }

  peek(n = 0): string {
    this.skip()
    return this.src[this.pos + n] ?? ''
  }

  /** Whether the upcoming text (after whitespace) is `s`. */
  at(s: string): boolean {
    this.skip()
    return this.src.startsWith(s, this.pos)
  }

  /** Whether the upcoming text matches `re` (anchored). */
  match(re: RegExp): RegExpExecArray | null {
    this.skip()
    const m = re.exec(this.src.slice(this.pos))
    return m && m.index === 0 ? m : null
  }

  eat(s: string): boolean {
    if (!this.at(s)) return false
    this.pos += s.length
    return true
  }

  expect(s: string, what = `"${s}"`): void {
    if (!this.eat(s)) throw this.error(`expected ${what}`)
  }

  /** A keyword: `s` followed by a non-letter. */
  keyword(s: string): boolean {
    this.skip()
    if (!this.src.startsWith(s, this.pos)) return false
    const next = this.src[this.pos + s.length] ?? ''
    if (/[a-zA-Z]/.test(next)) return false
    this.pos += s.length
    return true
  }

  /** A control sequence name after `\`, or undefined. */
  command(): string | undefined {
    this.skip()
    if (this.src[this.pos] !== '\\') return undefined
    const m = /^\\([a-zA-Z@]+|.)/.exec(this.src.slice(this.pos))
    if (!m) return undefined
    this.pos += m[0].length
    return m[1]!
  }

  peekCommand(): string | undefined {
    const save = this.pos
    const c = this.command()
    this.pos = save
    return c
  }

  number(): number | undefined {
    const m = this.match(NUMBER)
    if (!m) return undefined
    this.pos += m[0].length
    return Number(m[0])
  }

  /** A number with an optional unit. */
  length(): Length | undefined {
    const value = this.number()
    if (value === undefined) return undefined
    const m = /^\s*(cm|mm|pt|bp|in|em|ex|px|sp|dd|cc|pc)\b/.exec(this.src.slice(this.pos))
    if (m) {
      this.pos += m[0].length
      return { value, unit: m[1] }
    }
    return { value }
  }

  /** An identifier: letters, digits, spaces between words, `@`, `_`, `'`. */
  identifier(): string | undefined {
    const m = this.match(/^[a-zA-Z_@][a-zA-Z0-9_@']*(?:[ ]+[a-zA-Z_@][a-zA-Z0-9_@']*)*/)
    if (!m) return undefined
    this.pos += m[0].length
    return m[0]
  }

  /**
   * The raw text between `open` and its balanced `close`, with nested
   * brackets of all three kinds honoured. The cursor ends after `close`.
   */
  balanced(open: string, close: string): string {
    this.skip()
    if (this.src[this.pos] !== open) throw this.error(`expected "${open}"`)
    const start = ++this.pos
    let depth = 1
    const stack: string[] = [close]
    while (this.pos < this.src.length) {
      const c = this.src[this.pos]!
      if (c === '\\') {
        this.pos += 2
        continue
      }
      if (c === '%') {
        while (this.pos < this.src.length && this.src[this.pos] !== '\n') this.pos++
        continue
      }
      if (c === '{' || c === '[' || c === '(') {
        stack.push(c === '{' ? '}' : c === '[' ? ']' : ')')
        depth++
      } else if (c === stack[stack.length - 1]) {
        stack.pop()
        depth--
        if (depth === 0) {
          const text = this.src.slice(start, this.pos)
          this.pos++
          return text
        }
      }
      this.pos++
    }
    throw this.error(`unbalanced "${open}"`, start - 1)
  }

  /** Raw text up to (not including) the next top-level occurrence of `stop`. */
  until(stop: string): string {
    const start = this.pos
    let depth = 0
    while (this.pos < this.src.length) {
      const c = this.src[this.pos]!
      if (c === '\\') {
        this.pos += 2
        continue
      }
      if (c === '{' || c === '[' || c === '(') depth++
      else if (c === '}' || c === ']' || c === ')') depth--
      else if (depth === 0 && this.src.startsWith(stop, this.pos)) return this.src.slice(start, this.pos)
      this.pos++
    }
    return this.src.slice(start)
  }

  slice(from: number, to = this.pos): string {
    return this.src.slice(from, to).trim()
  }
}

/** Split `a, b={x,y}, c` on top-level commas. */
export function splitTopLevel(text: string, sep = ','): string[] {
  const out: string[] = []
  let depth = 0
  let start = 0
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!
    if (c === '\\') {
      i++
      continue
    }
    if (c === '"') inQuotes = !inQuotes
    if (inQuotes) continue
    if (c === '{' || c === '[' || c === '(') depth++
    else if (c === '}' || c === ']' || c === ')') depth--
    else if (depth === 0 && text.startsWith(sep, i)) {
      out.push(text.slice(start, i))
      start = i + sep.length
      i += sep.length - 1
    }
  }
  out.push(text.slice(start))
  return out.map((s) => s.trim()).filter((s) => s.length > 0)
}
