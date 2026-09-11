import { JSDOM } from 'jsdom'
const dom = new JSDOM('<!doctype html><html><body></body></html>')
globalThis.document = dom.window.document as unknown as Document
// @ts-expect-error jsdom global
globalThis.window = dom.window

import renderOrbit from './examples/earth-orbit'
import renderEuler from './examples/euler-line'

for (const [name, render] of [['orbit', renderOrbit], ['euler', renderEuler]] as const) {
  const c = dom.window.document.createElement('div')
  render(c as unknown as HTMLElement)
  console.log(`==== ${name} ====`)
  // print circles and texts with coords
  const svg = c.innerHTML
  for (const m of svg.matchAll(/<circle[^>]*>/g)) console.log(m[0])
  for (const m of svg.matchAll(/<text[^>]*>[^<]*<\/text>/g)) console.log(m[0])
  // path-only dots (points drawn as paths) — print paths too
  for (const m of svg.matchAll(/<path[^>]*stroke-width="3"[^>]*>/g)) console.log('DOT:', m[0])
}
