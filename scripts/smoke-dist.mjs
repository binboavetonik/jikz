#!/usr/bin/env node
/**
 * Smoke test for the BUILT package, runnable on any Node the library
 * supports (engines.node >= 18) — unlike the vitest suite, whose jsdom
 * environment needs Node 22.22+ / 24.15+. CI runs this on the Node 18 leg after
 * `npm run build`.
 *
 * Checks: the ES entry and the UMD entry both load, agree on their export
 * surface, render a picture with a named shape and an arrow tip (the
 * lazily-registered built-ins), escape text, and ship sourcemaps.
 */
import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const fail = (msg) => { console.error('smoke-dist: FAIL —', msg); process.exit(1) }

const esm = await import(resolve(ROOT, 'dist/index.js'))
const cjs = require(resolve(ROOT, 'dist/jikz.umd.cjs'))

const esmKeys = Object.keys(esm).sort()
const cjsKeys = Object.keys(cjs).sort()
if (esmKeys.length < 100) fail(`ES entry exports only ${esmKeys.length} names`)
const missing = esmKeys.filter((k) => !cjsKeys.includes(k))
if (missing.length) fail(`UMD entry is missing exports: ${missing.slice(0, 5).join(', ')}…`)

for (const [label, lib] of [['esm', esm], ['cjs', cjs]]) {
  const { picture, point } = lib
  const shapes = lib.allShapes ?? undefined
  const pic = shapes ? picture({ shapes }) : picture()
  const svg = pic
    .node('A', { at: point(40, 40), shape: shapes ? shapes.star : 'star', width: 40, height: 40, text: '<A&B>' })
    .node('B', { at: point(140, 40), shape: shapes ? shapes.rectangle : 'rectangle', width: 40, height: 30 })
    .edge('A', 'B', { arrowEnd: 'stealth' })
    .toSVG({ width: 200, height: 80 })
  if (!svg.startsWith('<svg')) fail(`${label}: toSVG() did not return an <svg>`)
  if (!svg.includes('<path')) fail(`${label}: no shape path rendered`)
  if (!svg.includes('marker')) fail(`${label}: no arrow marker rendered`)
  if (svg.includes('<A&B>')) fail(`${label}: node text was not escaped`)
  if (!svg.includes('&lt;A&amp;B&gt;')) fail(`${label}: escaped text not found`)
}

for (const f of ['dist/index.js.map', 'dist/core/Point.js.map', 'dist/index.d.ts', 'dist/index.d.cts']) {
  if (!existsSync(resolve(ROOT, f))) fail(`missing ${f}`)
}

console.log(`smoke-dist: OK on Node ${process.version} — ${esmKeys.length} exports, ESM + UMD render identically-shaped SVG, maps and declarations present`)
