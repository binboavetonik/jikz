/**
 * Every `@ozan.e/jikz/<subpath>` the docs or README mention must be a
 * real entry in package.json `exports` — a doc that names a path the
 * package does not serve is a broken install instruction.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..')

function walk(d: string): string[] {
  return readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? ['api', 'cookbook', '.vitepress', 'public'].includes(e.name) ? [] : walk(join(d, e.name))
      : e.name.endsWith('.md') ? [join(d, e.name)] : []
  )
}

describe('documented subpaths exist', () => {
  it('package.json exports every @ozan.e/jikz/<subpath> the docs mention', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as { exports: Record<string, unknown> }
    const files = [...walk(join(ROOT, 'docs')), join(ROOT, 'README.md'), join(ROOT, 'CHANGELOG.md')]
    const mentioned = new Set<string>()
    for (const f of files) {
      for (const m of readFileSync(f, 'utf8').matchAll(/@ozan\.e\/jikz\/([a-z-]+)/g)) mentioned.add(`./${m[1]}`)
    }
    expect(mentioned.size).toBeGreaterThan(0)
    const missing = [...mentioned].filter((sub) => !(sub in pkg.exports))
    expect(missing).toEqual([])
  })
})
