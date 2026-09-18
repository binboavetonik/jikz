/**
 * The public API, as one deterministic text file — `api-report/jikz.api.md`.
 *
 * Every export of the root entry and of each subpath is listed with
 * its kind and its declaration text (signatures for functions and
 * methods, members for classes and interfaces, the alias for types).
 * CI runs `--check`, which regenerates the report and fails when it
 * differs from the committed one — so an accidental export, removal or
 * signature change fails the build the way a snapshot does for output.
 * `--update` accepts a change on purpose.
 *
 *   npx vite-node scripts/api-report.ts            # print
 *   npx vite-node scripts/api-report.ts --check    # CI gate
 *   npx vite-node scripts/api-report.ts --update   # rewrite the file
 */
import ts from 'typescript'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SUBPATHS } from './aliases'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const REPORT = resolve(ROOT, 'api-report/jikz.api.md')

const ENTRIES: Record<string, string> = {
  '@ozan.e/jikz': 'src/index.ts',
  ...Object.fromEntries(Object.entries(SUBPATHS).map(([sub, file]) => [`@ozan.e/jikz/${sub}`, file])),
}

const program = ts.createProgram(
  Object.values(ENTRIES).map((f) => resolve(ROOT, f)),
  {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    strict: true,
    noEmit: true,
    skipLibCheck: true,
  }
)
const checker = program.getTypeChecker()
const FLAGS = ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope

/** One line of declaration text, whitespace collapsed, comments dropped. */
function declText(node: ts.Node): string {
  const printer = ts.createPrinter({ removeComments: true })
  return printer
    .printNode(ts.EmitHint.Unspecified, node, node.getSourceFile())
    .replace(/\s+/g, ' ')
    .trim()
}

/** The same declaration with its body dropped — the signature is what the report records. */
function withoutBody(node: ts.Node): ts.Node {
  const f = ts.factory
  if (ts.isFunctionDeclaration(node)) {
    return f.updateFunctionDeclaration(node, node.modifiers, node.asteriskToken, node.name, node.typeParameters, node.parameters, node.type, undefined)
  }
  if (ts.isMethodDeclaration(node)) {
    return f.updateMethodDeclaration(node, node.modifiers, node.asteriskToken, node.name, node.questionToken, node.typeParameters, node.parameters, node.type, undefined)
  }
  if (ts.isConstructorDeclaration(node)) {
    return f.updateConstructorDeclaration(node, node.modifiers, node.parameters, undefined)
  }
  if (ts.isGetAccessorDeclaration(node)) {
    return f.updateGetAccessorDeclaration(node, node.modifiers, node.name, node.parameters, node.type, undefined)
  }
  if (ts.isSetAccessorDeclaration(node)) {
    return f.updateSetAccessorDeclaration(node, node.modifiers, node.name, node.parameters, undefined)
  }
  return node
}

/** Member lines of a class or interface (public, non-private-hash). */
function memberLines(decl: ts.ClassDeclaration | ts.InterfaceDeclaration): string[] {
  const out: string[] = []
  for (const m of decl.members) {
    if (ts.isClassElement(m) && ts.getCombinedModifierFlags(m) & ts.ModifierFlags.Private) continue
    // Overload signatures are listed; the implementation signature of an
    // overloaded member is not (it is not callable as written).
    if ((ts.isMethodDeclaration(m) || ts.isConstructorDeclaration(m)) && m.body) {
      const name = ts.isConstructorDeclaration(m) ? 'constructor' : m.name.getText()
      const overloads = decl.members.filter(
        (o) => (ts.isMethodDeclaration(o) || ts.isConstructorDeclaration(o)) && !o.body &&
          (ts.isConstructorDeclaration(o) ? 'constructor' : o.name.getText()) === name
      )
      if (overloads.length > 0) continue
    }
    const text = declText(withoutBody(m)).replace(/;$/, '')
    if (text) out.push(`  ${text}`)
  }
  return out
}

function describe(symbol: ts.Symbol): string[] {
  const resolved = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol
  const decls = resolved.declarations ?? []
  const lines: string[] = []
  const seen = new Set<string>()
  for (const d of decls) {
    if (ts.isFunctionDeclaration(d)) {
      // Overloaded: the implementation signature is skipped, as in a .d.ts.
      if (d.body && decls.some((o) => ts.isFunctionDeclaration(o) && !o.body)) continue
      const sig = declText(withoutBody(d)).replace(/^export\s+(declare\s+)?function\s+\w+/, '')
      lines.push(`function ${symbol.name}${sig}`)
    } else if (ts.isClassDeclaration(d)) {
      const heritage = d.heritageClauses ? ' ' + d.heritageClauses.map((h) => declText(h)).join(' ') : ''
      lines.push(`class ${symbol.name}${d.typeParameters ? `<${d.typeParameters.map((t) => declText(t)).join(', ')}>` : ''}${heritage}`)
      lines.push(...memberLines(d))
    } else if (ts.isInterfaceDeclaration(d)) {
      const heritage = d.heritageClauses ? ' ' + d.heritageClauses.map((h) => declText(h)).join(' ') : ''
      lines.push(`interface ${symbol.name}${d.typeParameters ? `<${d.typeParameters.map((t) => declText(t)).join(', ')}>` : ''}${heritage}`)
      lines.push(...memberLines(d))
    } else if (ts.isTypeAliasDeclaration(d)) {
      lines.push(`type ${symbol.name}${d.typeParameters ? `<${d.typeParameters.map((t) => declText(t)).join(', ')}>` : ''} = ${declText(d.type)}`)
    } else if (ts.isVariableDeclaration(d)) {
      const type = checker.typeToString(checker.getTypeAtLocation(d), d, FLAGS)
      lines.push(`const ${symbol.name}: ${type}`)
    } else if (ts.isEnumDeclaration(d)) {
      lines.push(`enum ${symbol.name} { ${d.members.map((m) => declText(m)).join(', ')} }`)
    } else {
      const type = checker.typeToString(checker.getTypeOfSymbolAtLocation(resolved, d), d, FLAGS)
      lines.push(`${symbol.name}: ${type}`)
    }
  }
  return lines.filter((l) => (seen.has(l) ? false : (seen.add(l), true)))
}

function report(): string {
  const out: string[] = ['# API report — @ozan.e/jikz', '', 'Generated by `scripts/api-report.ts`; do not edit. `npm run api:update` after an intended change.', '']
  for (const [name, file] of Object.entries(ENTRIES)) {
    const sf = program.getSourceFile(resolve(ROOT, file))
    if (!sf) throw new Error(`missing entry ${file}`)
    const moduleSymbol = checker.getSymbolAtLocation(sf)
    if (!moduleSymbol) throw new Error(`no module symbol for ${file}`)
    const exports = checker.getExportsOfModule(moduleSymbol).sort((a, b) => a.name.localeCompare(b.name))
    out.push(`## ${name}`, '', `${exports.length} exports`, '', '```ts')
    for (const s of exports) out.push(...describe(s))
    out.push('```', '')
  }
  return out.join('\n')
}

const text = report()
const mode = process.argv[2]
if (mode === '--update') {
  mkdirSync(dirname(REPORT), { recursive: true })
  writeFileSync(REPORT, text)
  console.log(`api-report: wrote ${REPORT}`)
} else if (mode === '--check') {
  const current = existsSync(REPORT) ? readFileSync(REPORT, 'utf8') : ''
  if (current !== text) {
    const a = current.split('\n'), b = text.split('\n')
    const removed = a.filter((l) => !b.includes(l)).slice(0, 20)
    const added = b.filter((l) => !a.includes(l)).slice(0, 20)
    console.error('api-report: the public API changed. Review, then `npm run api:update`.')
    for (const l of removed) console.error(`  - ${l}`)
    for (const l of added) console.error(`  + ${l}`)
    process.exit(1)
  }
  console.log('api-report: OK, matches the committed report')
} else {
  process.stdout.write(text)
}
