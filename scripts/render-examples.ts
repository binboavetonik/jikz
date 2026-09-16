/**
 * Shared headless renderer for `examples/` — jsdom plus the library's
 * own string pipeline, the same path `toSVG()` takes in Node.
 *
 * Every tool that needs example output goes through here so they all
 * render the same way: the cookbook generator, the layout checker and
 * the preview-sheet builder. Nothing downstream edits an SVG by hand —
 * the only input is `examples/*.ts`.
 */
import { JSDOM } from 'jsdom'
import { demos, type Demo } from '../examples/manifest'
import { setDefaultMathRenderer } from '../src/index'
import { nodeMathJax } from './mathjax-node'

export interface RenderedExample {
  demo: Demo
  /** The container's innerHTML — one `<svg>` per picture the example mounts. */
  html: string
  /** The live container, for tools that want to query the rendered tree. */
  container: HTMLElement
}

/**
 * Render every example (or just the named ids) into detached jsdom
 * containers. Throws with the example's id if it paints no SVG, so a
 * broken example fails the command that called us rather than writing
 * an empty file.
 */
export function renderExamples(ids: readonly string[] = []): RenderedExample[] {
  const dom = new JSDOM('<!doctype html><html><body></body></html>')
  // The library checks for a DOM via the globals — install jsdom's.
  globalThis.document = dom.window.document as unknown as Document
  globalThis.window = dom.window as unknown as Window & typeof globalThis

  // Examples build their own pictures, so `picture({ mathRenderer })`
  // cannot reach them from out here — this is exactly the case the
  // process-wide default exists for. MathJax rather than KaTeX because
  // the output of these tools is standalone `.svg`; see mathjax-node.ts.
  setDefaultMathRenderer(nodeMathJax())

  const wanted = ids.length ? new Set(ids) : undefined
  const out: RenderedExample[] = []
  for (const demo of demos) {
    if (wanted && !wanted.has(demo.id)) continue
    const container = dom.window.document.createElement('div')
    demo.render(container)
    const html = container.innerHTML
    if (!html.includes('<svg')) {
      throw new Error(`${demo.id}: render produced no SVG`)
    }
    out.push({ demo, html, container: container as unknown as HTMLElement })
  }
  if (wanted) {
    for (const id of wanted) {
      if (!out.some((r) => r.demo.id === id)) {
        throw new Error(`no example with id "${id}"`)
      }
    }
  }
  return out
}
