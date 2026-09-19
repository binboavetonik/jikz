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

## Status: M6

The statement parser is ours and complete for the plan's §4 grammar:
all path operations, the coordinate forms (cartesian with units,
polar, named with anchors, `|-`/`-|`, `++`, calc `($…$)`), inline
`node`/`coordinate`/`edge`, scopes, `\foreach` (lists, `...` ranges
with a step, `/`-tuples, `count=`). Statements it cannot parse keep
their source and name the construct.

The key registry (`keys.ts`) maps the §4 key list one to one onto the
typed options: paint (colours through `color()`, lengths through
`length()`, thickness, dashes incl. `dash pattern`, opacity, caps and
joins, `rounded corners`, `double`, `even odd rule`, `help lines`),
arrows (`->`, `<->`, `-stealth`, `{Stealth[…]}`, `arrows=`, `>=`),
routing (`bend`, `out`/`in`, `looseness`, `loop`), nodes (shapes,
sizes, seps, `text width`/`align`, `anchor`, `rotate`, `font`,
`text=`, `xshift`/`yshift`, `above=2pt`, `right=of`, `label=`, `pin=`,
the quotes syntax, `pos`/`midway`), shading (`\shade`, `top color` …
`ball color`, `shading angle`), `pattern=`, `path fading`, and scope
keys (`shift`/`rotate`/`scale`, `node distance`, `>=`).

Styles are TikZ's: `\tikzset{name/.style={…}}` (with `#1`),
`/.append style`, `\tikzstyle`, and `every node`/`every path`/`every
label`/`every edge` — expanded inline when used, scoped to the scope
that set them, and kept per picture across template calls. Unknown
keys throw with the nearest known key as a hint.

The DSL surface: `tikz(pic)` binds a template to a picture or scope;
each call returns the names it registered. `tikzPicture` builds a
whole picture from an environment (its options apply) or a bare body.
`\clip` (rectangle, circle, polygon) clips the rest of the body it is
in — for a template call, the rest of that call. `+(…)` works wherever
the pen's position is known without drawing (not after an arc), and
`plot coordinates {…}` is a polyline (`-- plot` joins it).

Eject: `toTypeScript(text)` prints the statements a template stands
for (or a whole module with `shape: 'module'`), TikZ lengths as
`cm(2)`/`pt(4)` calls. `parser/corpus/expected/*.ts` is what each
corpus file ejects to; those files are typechecked with the parser,
so the ejected code is proven to compile against the typed API.

Arrow tips lower to `pic.edge()` on a single-segment path and on
`edge` items; the pen has no tips yet. Not lowered yet, by name:
`plot[smooth]`/function plots, `pic`, decorations, `/.code` handlers,
`\clip` with options, pgfmath expressions (by design — the DSL has
`${}`). Scope `scale` is a group transform in jikz, so it scales
strokes too, where TikZ scales coordinates only.

Docs: `docs/reference/tikz.md` is the reference page, the support
matrix (`docs/concepts/tikz-support.md`) has a "TikZ notation"
column, and `docs/playground.md` is the playground — TikZ on the
left, the picture or the ejected TypeScript on the right, running
`parser/src` against the live library.

`parser/corpus/*.tex` is the fidelity suite (`fidelity.test.ts`):
every file lowers without a gap (except `unsupported.tex`, whose gaps
are the point), runs as a template, and ejects to its expected file;
the oracle runs every statement through both back ends; and
`conformance.test.ts` diffs the statement split against
`@tikz-editor/lezer-tikz` (devDependency only), with differences
listed there with a reason each.

    npx vitest run parser
    npx tsc -p tsconfig.parser.json

The plan, including the M0 evidence behind each decision, is
`implementation-plans/2026-09-15-tikz-parser-plan.md`.
