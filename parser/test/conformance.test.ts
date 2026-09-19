/**
 * Conformance against `@tikz-editor/lezer-tikz` — a devDependency
 * only (plan §0, "Zero dependencies"). Both parsers split every corpus
 * file into statements; the boundaries must agree exactly, and the
 * kinds must agree or the difference must be explained here.
 *
 * The grammar is not the source of truth for our parser — the manual
 * and `tikz.code.tex` are — but a second implementation that was read
 * from the same sources is the cheapest check that we split the same.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { parser as lezer } from '@tikz-editor/lezer-tikz'
import type { SyntaxNode } from '@lezer/common'
import { parse, type Statement } from '../src/index'

const CORPUS = join(__dirname, '..', 'corpus')

type Kind = 'path' | 'scope' | 'foreach' | 'tikzset' | 'other'
interface Entry {
  readonly kind: Kind
  readonly text: string
  readonly body?: Entry[]
}

/**
 * Kind disagreements that are by design, keyed by statement text. Each
 * says which side calls it what, and why that is fine.
 */
const EXPLAINED: Record<string, string> = {
  '\\draw (0,0) -- (2*\\x, 1);': 'lezer: path; ours: unsupported — pgfmath expressions in coordinates are refused by design',
  '\\node at (1,2,3) {3d};': 'lezer: path; ours: unsupported — 3D coordinates are refused',
}

// ── ours ──

function ours(statements: readonly Statement[]): Entry[] {
  return statements.map((s) => {
    const kind: Kind =
      s.kind === 'path' ? 'path' : s.kind === 'scope' ? 'scope' : s.kind === 'foreach' ? 'foreach' : s.kind === 'tikzset' ? 'tikzset' : 'other'
    return { kind, text: s.source.trim(), ...(s.kind === 'scope' ? { body: ours(s.body) } : {}) }
  })
}

// ── theirs ──

const LEZER_KINDS: Record<string, Kind> = {
  PathStatement: 'path',
  NodePathStatement: 'path',
  PicPathStatement: 'path',
  ScopeStatement: 'scope',
  ForeachStatement: 'foreach',
  StyleDefinitionStatement: 'tikzset',
  TikzSetStatement: 'tikzset',
  TikzStyleStatement: 'tikzset',
}

function theirs(src: string): Entry[] {
  const tree = lezer.parse(src)
  let root: SyntaxNode = tree.topNode
  // A whole file: descend into the first tikzpicture environment.
  const env = root.getChild('TikzEnvironment') ?? root.getChildren('BodyItem').map((b) => b.getChild('Statement')?.getChild('TikzEnvironment')).find(Boolean)
  if (env) root = env
  return collect(root, src)
}

function collect(node: SyntaxNode, src: string): Entry[] {
  const out: Entry[] = []
  // An environment the grammar does not model (`pgfonlayer`, …) comes
  // back as `\begin{X}`, its statements, `\end{X}` — three siblings.
  // Ours skips it whole, so fold those into one entry here.
  let folding: string | undefined
  for (const item of node.getChildren('BodyItem')) {
    const statement = item.getChild('Statement')
    if (!statement) continue
    const text = src.slice(statement.from, statement.to).trim()
    if (folding !== undefined) {
      if (text.startsWith(`\\end{${folding}}`)) folding = undefined
      continue
    }
    const begin = /^\\begin\{([a-zA-Z*]+)\}/.exec(text)
    if (begin && begin[1] !== 'scope') {
      folding = begin[1]
      out.push({ kind: 'other', text })
      continue
    }
    const inner = statement.firstChild
    const name = inner?.name ?? statement.name
    const kind = LEZER_KINDS[name] ?? 'other'
    out.push({
      kind,
      text,
      ...(inner && kind === 'scope' ? { body: collect(inner, src) } : {}),
    })
  }
  return out
}

// ── the diff ──

function flatten(entries: Entry[], depth = 0): { kind: Kind; text: string; depth: number }[] {
  return entries.flatMap((e) => [
    { kind: e.kind, text: e.text.split('\n')[0]!, depth },
    ...(e.body ? flatten(e.body, depth + 1) : []),
  ])
}

describe('conformance: statement boundaries agree with lezer-tikz', () => {
  for (const file of readdirSync(CORPUS).filter((f) => f.endsWith('.tex')).sort()) {
    it(file, () => {
      const src = readFileSync(join(CORPUS, file), 'utf8')
      const mine = flatten(ours(parse(src).body))
      const ref = flatten(theirs(src))

      // Boundaries: same statements, same first lines, same nesting.
      expect(mine.map((e) => `${'  '.repeat(e.depth)}${e.text}`)).toEqual(ref.map((e) => `${'  '.repeat(e.depth)}${e.text}`))

      // Kinds: equal, or explained.
      const unexplained = mine
        .map((m, i) => ({ m, r: ref[i]! }))
        .filter(({ m, r }) => m.kind !== r.kind && EXPLAINED[m.text] === undefined)
        .map(({ m, r }) => `${m.text}: ours=${m.kind} lezer=${r.kind}`)
      expect(unexplained).toEqual([])
    })
  }

  it('explains only differences that exist', () => {
    const seen = new Set<string>()
    for (const file of readdirSync(CORPUS).filter((f) => f.endsWith('.tex'))) {
      const src = readFileSync(join(CORPUS, file), 'utf8')
      const mine = flatten(ours(parse(src).body))
      const ref = flatten(theirs(src))
      mine.forEach((m, i) => {
        if (m.kind !== ref[i]?.kind) seen.add(m.text)
      })
    }
    expect([...Object.keys(EXPLAINED)].filter((k) => !seen.has(k))).toEqual([])
  })
})
