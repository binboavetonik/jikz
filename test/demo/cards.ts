/**
 * Shared demo-card extraction for the demo-source tests: reads
 * demo/index.html and returns each card's id + raw template-literal
 * code. Used by demo-sources.test.ts (syntax + dist exports) and
 * demo-types.test.ts (semantic typecheck against src).
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..')
export const DEMO_HTML = join(ROOT, 'demo/index.html')
export const DIST_BUNDLE = join(ROOT, 'dist/jikz.js')

export interface DemoCard {
  id: string
  /** Raw template-literal content (may contain \` and \${ escapes). */
  code: string
}

/**
 * Extract every demo card's id + code from the page. The code template
 * literal is read honoring backslash escapes (\` and \${), which naive
 * regexes choke on.
 */
export function extractDemoCards(): DemoCard[] {
  const html = readFileSync(DEMO_HTML, 'utf8')
  const script = html.match(/<script type="module">([\s\S]*?)<\/script>/)
  if (!script) throw new Error('demo/index.html: module script not found')

  const re = /id:\s*'([^']+)'[\s\S]*?code:\s*\n`((?:[^`\\]|\\[\s\S])*)`,/g
  const cards: DemoCard[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(script[1]!)) !== null) {
    cards.push({ id: m[1]!, code: m[2]! })
  }
  return cards
}

/** Undo the outer template literal's escaping (\`, \${, \\). */
export function unescapeTemplate(raw: string): string {
  return raw.replace(/\\([`$\\])/g, '$1')
}

/** Named imports from 'jikz' in a card's source. */
export function jikzImports(code: string): string[] {
  const names: string[] = []
  const re = /import\s*\{([^}]+)\}\s*from\s*'jikz'/g
  let m: RegExpExecArray | null
  while ((m = re.exec(code)) !== null) {
    for (const part of m[1]!.split(',')) {
      const name = part.trim()
      if (name) names.push(name)
    }
  }
  return names
}
