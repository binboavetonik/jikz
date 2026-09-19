/**
 * The corpus as jikz's TikZ-fidelity suite (plan M5).
 *
 * Every corpus file must lower without a gap (except `unsupported.tex`,
 * whose gaps are the point), run as a template without throwing, and
 * eject to the TypeScript in `parser/corpus/expected/`. Those files
 * are typechecked with the parser (`tsconfig.parser.json` includes
 * them), so the ejected code is proven to compile against the typed
 * API on every run — not just to print.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { convert, tikzPicture } from '../src/index'

const CORPUS = join(__dirname, '..', 'corpus')
const files = readdirSync(CORPUS).filter((f) => f.endsWith('.tex')).sort()

describe('fidelity: the corpus lowers whole and ejects to compiling TypeScript', () => {
  for (const file of files) {
    const tex = readFileSync(join(CORPUS, file), 'utf8')
    const expectsGaps = file === 'unsupported.tex'

    it(`${file} has no gaps${expectsGaps ? ' but the named ones' : ''}`, () => {
      const result = convert(tex, { from: 'jikz' })
      expect(result.refused).toBeUndefined()
      if (!expectsGaps) expect(result.diagnostics).toEqual([])
      else expect(result.diagnostics.length).toBeGreaterThan(0)
    })

    if (!expectsGaps) {
      it(`${file} runs as a template`, () => {
        expect(() => tikzPicture.source(tex).toSVG({ width: 400, height: 400 })).not.toThrow()
      })
    }

    it(`${file} ejects as expected`, async () => {
      const { code } = convert(tex, { from: 'jikz' })
      await expect(code).toMatchFileSnapshot(join(CORPUS, 'expected', file.replace(/\.tex$/, '.ts')))
    })
  }
})
