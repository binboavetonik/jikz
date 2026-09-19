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

**TikZ's notation as a jikz feature.** A tagged template puts TikZ
statements into a jikz picture — TikZ where it is denser (paths,
coordinates, calc, option lists), JavaScript where TikZ is weakest
(data, loops, composition, types), one registry and one frame:

    const T = tikz(pic)
    T`\draw[thick, ->] (0,0) -- (2,1) arc (0:90:1) node[right] {$P$};`
    pic.edge('P', 'A')            // same names, same picture

A statement either lowers to what the typed API can express or throws
a `JikzError` naming the construct — nothing is silently dropped, and
there is no conversion ceiling because a syntax is not a compatibility
promise. `${}` is the expression language, so pgfmath is not on the
path. The typed API stays primary: strings lose its compile-time names.

The file converter is the secondary route, **eject**: the same
lowering printed as readable TypeScript, for the day a figure
prototyped in strings should become typed code. Its M0-measured yield
(10-15% of wild TikZ clean, 20-25% with gaps, ~40% out for reasons
unrelated to parsing) is that route's number, not the product's.

Zero runtime dependencies, like jikz: the statement parser is ours,
written from the TikZ manual and source. `@tikz-editor/lezer-tikz` is
a dev-only conformance oracle — the corpus is parsed by both and the
structures diffed — and ships nowhere.

Reframed 2026-09-19; the plan's §0 has the decisions, architecture and
milestones.

## Shape

    template / .tex ──▶ (precheck) ──▶ scan + parse ──▶ lower ──▶ IR
                            │              (AST)     (keys,      │
                            │                        frame     ┌─┴──────────┐
                       refuses the                   units)  interpret()  emit()
                       whole file                            onto the     TS source
                       (3D, pgfplots)                        caller's     — eject —
                                                             container

`interpret` is the product (`tikz(pic)` ends there); `emit` is the
eject path. The oracle test asserts they render byte-identical SVG for
every corpus statement, so printer drift fails on the commit that
causes it.

Files, in pipeline order: `scan.ts` (cursor over TeX's three bracket
kinds), `parse.ts` (recursive descent, statements and path items,
every §14 coordinate form incl. calc), `ast.ts`, `keys.ts` (TikZ keys
→ typed options, one to one), `lower.ts` (AST → IR, foreach expansion,
the `dsl`/`file` gap policy), `ir.ts`, `interpret.ts`, `emit.ts`,
`dsl.ts` (`tikz(pic)`), `precheck.ts` (file mode only).

## Status: M2

The statement parser is ours and complete for the plan's §4 grammar:
all path operations, the coordinate forms (cartesian with units,
polar, named with anchors, `|-`/`-|`, `++`, calc `($…$)`), inline
`node`/`coordinate`, scopes, `\foreach` (lists, `...` ranges with a
step, `/`-tuples, `count=`). Statements it cannot parse keep their
source and name the construct.

Lowering covers the core key set (paint, thickness, dashes, opacity,
arrows incl. `{Stealth[…]}`, `bend`/`out`/`in`, node geometry and
placement incl. `right=of`, `label=`, quotes, `pos`/`midway`, scope
`shift`/`rotate`/`scale`). Arrow tips lower to `pic.edge()` on a
single-segment path; the pen has no tips yet. Not lowered yet, by
name: `+(…)`, `edge`, `plot`, `\shade`, `\clip`, `\tikzset`
styles (M3), `pic`, decorations, pgfmath expressions (by design — the
DSL has `${}`).

`parser/corpus/*.tex` is the fidelity suite: the oracle runs every
statement through both back ends, and `conformance.test.ts` diffs the
statement split against `@tikz-editor/lezer-tikz` (devDependency
only). Differences are listed there with a reason each.

    npx vitest run parser
    npx tsc -p tsconfig.parser.json

The plan, including the M0 evidence behind each decision, is
`implementation-plans/2026-09-15-tikz-parser-plan.md`.
