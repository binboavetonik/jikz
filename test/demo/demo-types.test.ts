/**
 * Demo-source TYPE tests.
 *
 * demo-sources.test.ts proves every card PARSES and its imports exist;
 * this suite proves each card TYPE-CHECKS against src/ — so the code a
 * user reads in the Code tab compiles against the library's public
 * API. Cards are written as runnable JS (no annotations), so the
 * program runs with noImplicitAny off and only high-signal diagnostic
 * codes are reported:
 *
 *   2304 cannot find name        — typo'd identifier / missing import
 *   2339 property does not exist — pic.nod(...), foo.cetner, …
 *   2551/2552 property missing (with suggestion) on unions/modules
 *   2305 module has no exported member — bad named import
 *   2307 cannot find module
 *
 * Assignability (2322/2345) and excess-key (2353) diagnostics are NOT
 * reported: the cards' JS idioms (widened mixed arrays, destructured
 * tuples) trip them without indicating a real API misuse.
 */
import { describe, it, expect } from 'vitest'
import ts from 'typescript'
import { join } from 'node:path'
import { extractDemoCards, unescapeTemplate, ROOT } from './cards'

const REPORT_CODES = new Set([2304, 2339, 2551, 2552, 2305, 2307])

/** Cards reference the page's CDN-loaded KaTeX global. */
const PREAMBLE = "declare const katex: any\n"

function checkCards(): Map<string, string[]> {
  const cards = extractDemoCards()
  const options: ts.CompilerOptions = {
    strict: true,
    noImplicitAny: false,
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    lib: ['lib.es2020.d.ts', 'lib.dom.d.ts'],
    noEmit: true,
    skipLibCheck: true,
    baseUrl: ROOT,
    paths: { jikz: ['src/index.ts'] },
  }

  const fileNameFor = (id: string) => join(ROOT, `__card__${id}.ts`)
  const sources = new Map(
    cards.map((c) => [fileNameFor(c.id), PREAMBLE + unescapeTemplate(c.code)])
  )

  const host = ts.createCompilerHost(options)
  const origGetSourceFile = host.getSourceFile.bind(host)
  host.getSourceFile = (name, lang, onError, shouldCreateNewSourceFile) => {
    const src = sources.get(name)
    if (src !== undefined) {
      return ts.createSourceFile(name, src, lang, true)
    }
    return origGetSourceFile(name, lang, onError, shouldCreateNewSourceFile)
  }
  const origFileExists = host.fileExists.bind(host)
  host.fileExists = (name) => sources.has(name) || origFileExists(name)
  const origReadFile = host.readFile.bind(host)
  host.readFile = (name) => sources.get(name) ?? origReadFile(name)

  const program = ts.createProgram([...sources.keys()], options, host)

  const failures = new Map<string, string[]>()
  for (const [file, card] of [...sources.keys()].map((f, i) => [f, cards[i]!] as const)) {
    const sf = program.getSourceFile(file)!
    const diags = program
      .getSemanticDiagnostics(sf)
      .filter((d) => REPORT_CODES.has(d.code))
    if (diags.length > 0) {
      failures.set(
        card.id,
        diags.map((d) => {
          const pos = sf.getLineAndCharacterOfPosition(d.start ?? 0)
          return `line ${pos.line + 1}: ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`
        })
      )
    }
  }
  return failures
}

describe('demo card sources type-check against src', () => {
  it('no unknown names, properties, or imports in any card', () => {
    const failures = checkCards()
    const report = [...failures.entries()]
      .map(([id, msgs]) => `  ${id}:\n    ${msgs.join('\n    ')}`)
      .join('\n')
    expect(
      failures.size,
      `demo cards with type errors:\n${report}`
    ).toBe(0)
  })
})
