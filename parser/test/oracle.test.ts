/**
 * The oracle: interpreting the IR and *running the emitted TypeScript*
 * must produce byte-identical SVG.
 *
 * This is why the IR has two back ends rather than one (plan §2, §7).
 * The template is the product and the printer is the eject path, so
 * any drift between what the converter means and what it writes shows
 * up here, on the commit that causes it, rather than in someone's
 * diagram months later.
 */
import { describe, it, expect } from 'vitest'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { picture, allShapes, cm, type Picture } from 'jikz'
import { convert, interpret, type IrItem } from '../src/index'

const CORPUS = join(__dirname, '..', 'corpus')
const GENERATED = join(__dirname, '.generated')
mkdirSync(GENERATED, { recursive: true })
writeFileSync(join(GENERATED, '.gitignore'), '*\n')

/**
 * Run emitted code the way a user would: as a module. Vitest transforms
 * the TypeScript and resolves the `jikz` alias; the file lands in a
 * gitignored folder next to this test.
 */
let seq = 0
async function runEmitted(code: string): Promise<Picture<typeof allShapes>> {
  const file = join(GENERATED, `case-${++seq}.ts`)
  writeFileSync(file, code)
  const mod = (await import(/* @vite-ignore */ `${file}?t=${Date.now()}`)) as { build: () => Picture<typeof allShapes> }
  return mod.build()
}

function fresh(): Picture<typeof allShapes> {
  return picture({ shapes: allShapes, frame: 'math', unit: cm(1) })
}

/** Every statement of every corpus file, as one case per statement. */
function corpusStatements(): { name: string; tex: string }[] {
  const out: { name: string; tex: string }[] = []
  for (const file of readdirSync(CORPUS).filter((f) => f.endsWith('.tex')).sort()) {
    const text = readFileSync(join(CORPUS, file), 'utf8')
    if (file === 'structure.tex') {
      out.push({ name: `${file} (whole picture)`, tex: text })
      continue
    }
    const lines = text.split('\n').filter((l) => l.trim().length > 0 && !l.trim().startsWith('%'))
    // Declarations feed later lines: run each file cumulatively.
    for (let i = 0; i < lines.length; i++) {
      out.push({ name: `${file}:${i + 1} ${lines[i]!.trim()}`, tex: lines.slice(0, i + 1).join('\n') })
    }
  }
  return out
}

describe('oracle: interpreter and emitted code agree', () => {
  for (const { name, tex } of corpusStatements()) {
    it(name, async () => {
      const result = convert(tex, { from: 'jikz' })
      expect(result.refused, 'should not be refused').toBeUndefined()
      expect(result.ir).toBeDefined()

      const view = { width: 400, height: 400 }
      const pic = fresh()
      interpret(result.ir!, pic)
      const fromIr = pic.toSVG(view)
      const fromCode = (await runEmitted(result.code!)).toSVG(view)

      expect(fromCode).toBe(fromIr)
    })
  }
})

describe('the file mode keeps unsupported statements as comments', () => {
  it('names each gap, keeps the rest', () => {
    const tex = readFileSync(join(CORPUS, 'unsupported.tex'), 'utf8')
    const result = convert(tex, { from: 'jikz' })
    expect(result.refused).toBeUndefined()
    const kinds = result.ir!.map((i) => i.kind)
    expect(kinds.filter((k) => k === 'pen')).toHaveLength(6)
    expect(kinds.filter((k) => k === 'edge')).toHaveLength(1)
    expect(result.diagnostics.map((d) => d.reason)).toMatchInlineSnapshot(`
      [
        "\\def is not supported",
        ""2*\\x" is an expression — TikZ would evaluate it with pgfmath, which is not supported; write the value",
        "3D coordinate (1,2,3) is not supported",
        "pic "code" is not supported — only the angles library's "angle" and "right angle" are",
        "environment "pgfonlayer" is not supported",
      ]
    `)
    for (const d of result.diagnostics) expect(result.code).toContain(`// TODO(jikz-tikz): ${d.reason}`)
  })
})

describe('the IR keeps TikZ numbers in the frame', () => {
  const pen = (tex: string) => convert(tex).ir!.find((i): i is Extract<IrItem, { kind: 'pen' }> => i.kind === 'pen')!
  it('does not port coordinates — the math frame does', () => {
    const ops = pen(String.raw`\draw (1,2) -- (3,-4);`).ops
    expect(ops).toEqual([
      { op: 'moveTo', to: { kind: 'xy', x: 1, y: 2 } },
      { op: 'lineTo', to: { kind: 'xy', x: 3, y: -4 } },
    ])
  })
  it('converts unit lengths to frame units', () => {
    const ops = pen(String.raw`\draw (2cm,0) -- (1in,0);`).ops
    expect(ops[0]).toEqual({ op: 'moveTo', to: { kind: 'xy', x: 2, y: 0 } })
    expect((ops[1] as { to: { x: number } }).to.x).toBeCloseTo(2.54)
  })
  it('turns polar into cartesian without float noise', () => {
    const ops = pen(String.raw`\draw (90:1) -- ++(180:2);`).ops
    expect(ops).toEqual([
      { op: 'moveTo', to: { kind: 'xy', x: 0, y: 1 } },
      { op: 'lineTo', to: { kind: 'rel', dx: -2, dy: 0 } },
    ])
  })
})
