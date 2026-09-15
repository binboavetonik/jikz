# jikz-tikz — TikZ subset → jikz

**Not published.** This directory is deliberately outside the
`@ozan.e/jikz` package (`files: ["dist", "src"]`), and outside its
semver promise. It lives in this repo for two reasons, both about
testing rather than packaging:

- the codegen emits calls against jikz's public API, so a rename here
  breaks it in the same CI run rather than after a version bump;
- the oracle has to run jikz, and from a separate repo it could only
  run the *published* one — never HEAD.

It graduates to a real package (`@ozan.e/jikz-tikz`, jikz as a peer)
at M3/M4, when paths, nodes and the key registry work. Not before:
restructuring to a workspace costs days and this may not survive M1.

## What it is

Port a 2D diagram, keep what maps, get told about the rest. The M0
spike measured roughly 10-15% of wild TikZ converting cleanly, another
20-25% usefully with gaps flagged, and ~40% out for reasons unrelated
to the parser — 3D, pgfplots, LaTeX inside nodes, animation.

It is a **migration tool**, not a renderer. You run it once and keep
the TypeScript.

## Shape

    source ──▶ precheck ──▶ tokenize ──▶ parse ──▶ lower ──▶ IR
                  │                        (AST)   (port)     │
                  │                                     ┌─────┴─────┐
             refuses the                            emit()     interpret()
             whole file                            TS source    Picture
             (3D, pgfplots)                        ── shipped ── oracle ──

`emit` is the product; `interpret` exists to prove it. The oracle test
asserts they render byte-identical SVG, so printer drift fails on the
commit that causes it — verified by breaking the printer on purpose.

## Status: M1

Grammar is `\draw (x,y) -- (x,y) [-- (x,y)]*;` plus the hopeless-file
pre-check. Everything else reports itself rather than vanishing.

Known stopgap: `parse` splits statements on `;`, which is wrong for a
`;` inside braces. M2 replaces it with a real path grammar.

    npx vitest run parser
    npx tsc -p tsconfig.parser.json

The plan, including the M0 evidence behind each decision, is
`implementation-plans/2026-09-15-tikz-parser-plan.md`.
