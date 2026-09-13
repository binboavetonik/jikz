# Security policy

## Scope

jikz turns program input into SVG markup. The parts that matter for
security are the string paths:

- **Text and attribute escaping.** Node text, labels, class names and
  style values are escaped in `SVGBuilder` before they reach the output
  (`&`, `<`, `>`, `"`). A regression here is a security bug.
- **Style parsing.** `parseStyleString` and `mergeStyles` must not allow
  prototype pollution through keys such as `__proto__`.
- **Raw fragments.** `registerPattern`, `registerArrowTip` and the
  KaTeX adapter accept SVG or HTML fragments that are emitted verbatim.
  They are trusted by design: only pass fragments you control, never
  user input.
- **Rendering math.** With a math renderer injected, `$...$` in text is
  handed to KaTeX and its HTML output is embedded in a `foreignObject`.
  KaTeX's own `trust` and `strict` options apply; jikz does not add any.

Denial of service through pathological input (extremely large graphs,
deep trees) is a robustness concern rather than a security one, and is
tracked as ordinary bugs.

## Supported versions

Only the latest published minor receives fixes. Pre-1.0, that is the
latest `0.x`.

## Reporting a vulnerability

Please do **not** open a public issue for a suspected vulnerability.
Email erdemirozan@gmail.com with:

- a minimal reproduction (the input and the SVG or behaviour it
  produces),
- the version of jikz and, if relevant, of KaTeX,
- how you think it could be exploited.

You should get an acknowledgement within a week. Fixes ship as a patch
release with a changelog entry crediting the reporter unless you prefer
otherwise.
