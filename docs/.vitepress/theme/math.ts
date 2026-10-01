// The gallery's math renderer. jikz never reads a global `katex` —
// loading KaTeX on the page is not enough, it has to be handed over —
// and the gallery renders examples it does not build, so the
// process-wide default is the seam: one call, every `$...$` label on
// the page goes through KaTeX.
//
// KaTeX rather than MathJax here because this is a live document with
// its stylesheet and fonts; the cookbook's standalone thumbnails use
// MathJax's SVG output instead (scripts/mathjax-node.ts).
import katex from 'katex'
import { katexAdapter, setDefaultMathRenderer } from 'jikz'

export function installMath(): void {
  setDefaultMathRenderer(katexAdapter(katex))
}
