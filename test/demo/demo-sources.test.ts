/**
 * Demo-source integrity tests.
 *
 * demo/index.html executes each card's `code` string as a real ES
 * module in the browser. Two failure classes these tests guard:
 *
 *  1. SYNTAX: a card whose code doesn't parse as an ES module breaks
 *     its own blob import in the browser (and only shows up when that
 *     card is opened).
 *
 *  2. STALE DIST: served statically (no Vite), the page falls back to
 *     ../dist/jikz.js. If dist predates a public API a card uses, the
 *     card fails at link time with
 *       SyntaxError: does not provide an export named '…'
 *     — the browser reports missing named exports as SyntaxError.
 *     This test requires every card's jikz imports to exist in the
 *     built bundle. Skipped when dist/ hasn't been built (CI).
 *
 * Reported 2026-08-31: circuit cards failed on the statically-served
 * page because dist was built before registerCircuits existed.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import {
  extractDemoCards,
  unescapeTemplate,
  jikzImports,
  DIST_BUNDLE,
} from './cards'

/** Named exports of the built ES bundle (handles `x as y` aliases). */
function bundleExports(bundleSource: string): Set<string> {
  const names = new Set<string>()
  const re = /export\s*\{([\s\S]*?)\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(bundleSource)) !== null) {
    for (const part of m[1]!.split(',')) {
      const alias = part.trim().match(/\bas\s+(\w+)$/)
      const name = (alias ? alias[1] : part.trim())!
      if (name) names.add(name)
    }
  }
  return names
}

const cards = extractDemoCards()

describe('demo sources parse as ES modules', () => {
  it('extracts all cards from demo/index.html', () => {
    expect(cards.length).toBeGreaterThanOrEqual(43)
  })

  it.each(cards.map((c) => [c.id, c] as const))(
    '%s: no SyntaxError',
    async (_id, card) => {
      const src = unescapeTemplate(card.code)
      try {
        // The bare 'jikz' specifier cannot resolve from a data URL —
        // that fails with TypeError, which is fine here: this test only
        // cares about parse-time SyntaxError.
        await import(
          'data:text/javascript;base64,' + Buffer.from(src).toString('base64')
        )
      } catch (e) {
        if (e instanceof SyntaxError) {
          throw new Error(`demo card "${card.id}" has a syntax error: ${e.message}`)
        }
      }
    }
  )
})

describe('built bundle satisfies every demo card import', () => {
  it.skipIf(!existsSync(DIST_BUNDLE))(
    'dist/jikz.js exports every jikz name used by any demo card',
    () => {
      const exports = bundleExports(readFileSync(DIST_BUNDLE, 'utf8'))
      const missing: string[] = []
      for (const card of cards) {
        for (const name of jikzImports(card.code)) {
          if (!exports.has(name)) {
            missing.push(`${card.id}: ${name}`)
          }
        }
      }
      expect(
        missing,
        `dist/jikz.js is stale — these demo imports are missing from the bundle. Run \`npm run build\`.\n  ${missing.join('\n  ')}`
      ).toEqual([])
    }
  )
})
