#!/usr/bin/env node
/**
 * Post-build fix-up for the emitted declarations in dist/.
 *
 * vite-plugin-dts writes one .d.ts per source file with the source's
 * extensionless relative specifiers (`from './core/Point'`). That is
 * fine for `moduleResolution: bundler` but fails under Node16/NodeNext
 * ESM resolution, which requires explicit extensions. This script:
 *
 *   1. rewrites every relative specifier in dist/**\/*.d.ts to `.js`
 *      (or `/index.js` when the target is a directory), and
 *   2. writes a `.d.cts` twin of every declaration file with `.cjs`
 *      specifiers, so the `require` export condition gets CommonJS-
 *      shaped types instead of the ESM `.d.ts` (the package is
 *      `"type": "module"`, so a bare `.d.ts` is ESM-typed).
 *
 * Per-file output (not a rolled-up bundle) is deliberate: it mirrors
 * the per-module ES build, so a consumer's bundler can drop the
 * modules they never import. Module-augmentation specifiers, should
 * any return, are rewritten here too.
 *
 * Verified by `npm run check:pkg` (publint + arethetypeswrong).
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs'
import { join, dirname, resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIST = resolve(dirname(fileURLToPath(import.meta.url)), '../dist')

/** Every *.d.ts under dist (not .d.cts, not maps). */
function declarationFiles(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...declarationFiles(full))
    else if (entry.endsWith('.d.ts')) out.push(full)
  }
  return out
}

/**
 * Matches the string literal of a relative module specifier in the
 * three forms TypeScript emits in declarations:
 *   from './x'            (import / export ... from)
 *   import('./x')         (inline type import)
 *   declare module './x'  (augmentation)
 * Only relative specifiers are touched — `./x`, `../x`, and the bare
 * directory forms `.` and `..` that TypeScript emits for an inline type
 * import of an index module (`import('..').ShapeKind`). Bare package
 * specifiers such as 'katex' are left alone.
 */
const SPECIFIER_RE =
  /((?:\bfrom\s*|\bimport\s*\(\s*|\bdeclare\s+module\s+)['"])(\.\.?(?:\/[^'"]*)?)(['"])/g

/** Resolve an extensionless relative specifier to a file or directory target. */
function withExtension(fromFile, spec, ext) {
  if (/\.(js|cjs|mjs|d\.ts|d\.cts|json)$/.test(spec)) return spec
  const abs = resolve(dirname(fromFile), spec)
  if (existsSync(abs + '.d.ts')) return spec + ext
  if (existsSync(join(abs, 'index.d.ts'))) return spec.replace(/\/$/, '') + '/index' + ext
  // '.' and '..' resolve to their own index, same as a trailing-slash form.
  throw new Error(
    `postbuild-dts: cannot resolve '${spec}' from ${relative(DIST, fromFile)} ` +
      `(neither ${spec}.d.ts nor ${spec}/index.d.ts exists in dist/)`
  )
}

function rewrite(file, source, ext) {
  return source.replace(SPECIFIER_RE, (_m, open, spec, close) => open + withExtension(file, spec, ext) + close)
}

const files = declarationFiles(DIST)
if (files.length === 0) {
  console.error('postbuild-dts: no .d.ts files found in dist/ — run vite build first')
  process.exit(1)
}

let rewritten = 0
for (const file of files) {
  const original = readFileSync(file, 'utf8')
  const esm = rewrite(file, original, '.js')
  const cjs = rewrite(file, original, '.cjs')
  if (esm !== original) {
    writeFileSync(file, esm)
    rewritten++
  }
  writeFileSync(file.replace(/\.d\.ts$/, '.d.cts'), cjs)
}
console.log(`postbuild-dts: ${files.length} declaration files, ${rewritten} specifier sets rewritten, ${files.length} .d.cts twins written`)
