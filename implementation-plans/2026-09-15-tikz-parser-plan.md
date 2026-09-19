# TikZ parser — plan

Status: PLAN, **reframed 2026-09-19** (§0 supersedes §1, §2, §6, §8's
milestones, §9 and §10; the rest stands as evidence). Written
2026-09-15 as the item deferred in `2026-09-11-tikz-parity-evaluation.md`
§5. Ships as `@ozan.e/jikz-tikz`; nothing in the core roadmap blocks
it or is blocked by it.

## 0. Reframing (2026-09-19): TikZ's notation as a jikz feature

### What changed since the plan was written

Two things, and together they move the product.

The API review (`2026-09-18-api-review-and-roadmap.md`, all four
phases now on `master`) gave jikz a **math frame** (`picture({ frame:
'math', unit: cm(1) })`), the pen's TikZ path operations (`arc`,
`rectangle`, `circle`, `grid`, `rel()`), parameterised arrow tips,
`color()`, `length()`, `every`, style names as strings, `right=of`
placement, pins, and a projection stage. Section 3's coordinate
contract — negate angles, swap arc endpoints, rewrite `(A.45)` to
`'A.-45'`, evaluate colours at convert time — is now a pass-through:
TikZ's numbers are jikz's numbers. Lowering became nearly one to one.

And the lezer spike (below) found that "paste TikZ, get SVG" already
exists under MIT (`@tikz-editor/core`, 112k lines), which is why this
plan demoted the interpreter to an oracle. That was right about the
*file* converter. It was wrong about where the interpreter is valuable.

### The product

**A tagged template that puts TikZ statements into a jikz picture.**
TikZ's notation exactly where it is denser than method chains —
paths, coordinates, calc, option lists — and JavaScript exactly where
TikZ is weakest — data, loops, composition, types — sharing one
registry, one style system, one frame:

```ts
import { picture, cm, allShapes } from '@ozan.e/jikz'
import { tikz } from '@ozan.e/jikz-tikz'

const pic = picture({ frame: 'math', unit: cm(1), shapes: allShapes })
const T = tikz(pic)                                   // bound to this picture

T`\draw[thick, ->] (0,0) -- (2,1) arc (0:90:1) node[right] {$P$};`
for (const [i, name] of ['A', 'B', 'C'].entries()) {
  T`\node[circle, draw, fill=blue!20] (${name}) at (${i * 2}, 0) {${name}};`
}
pic.edge('A', 'C', { bendAngle: 30, label: 'from JS' })   // same names, same picture
```

Three claims, each of which the old framing could not make:

1. **No conversion ceiling.** A syntax is not a compatibility promise.
   The M0 ceiling (~35% of wild TikZ converts) was about *files*; a
   statement either lowers to what jikz can express or throws a
   `JikzError` naming the construct. Nothing is silently dropped.
2. **No pgfmath.** `${}` interpolation is the expression language.
   The one deficiency the lezer grammar declares (`pgfmath_expression:
   none`) is not on this product's critical path at all.
3. **A line no competitor has.** `tikz-editor` renders TikZ to its own
   SVG; TikZJax runs TeX. Neither puts a `\draw` into a picture you
   then address by name from JavaScript, style with `every`, lay out
   with `tree()`, or fit, mount and pan.

The file converter survives as **eject**: `toTypeScript(source)`
prints the same IR as readable jikz code, for the day a figure
prototyped in TikZ strings should become typed code. Same lowering,
same oracle, secondary billing.

### The decisions, restated

1. **Scope: statements, not documents.** `\draw`, `\fill`,
   `\filldraw`, `\path`, `\shade`, `\clip`, `\node`, `\coordinate`,
   `\begin{scope}…\end{scope}`, `\foreach` (TikZ list syntax; bodies
   are statements), plus the path and coordinate grammar of §4 and the
   key registry of §4. `\begin{tikzpicture}[opts] … \end{tikzpicture}`
   is accepted as a body via `tikzPicture` (a whole picture from one
   template, math frame and `cm(1)` by default). Preamble, macros,
   `\pgfmathsetmacro`, pgfplots, 3D coordinate systems: out, by name.
2. **Unknown means throw, in the DSL.** Decision 2 (comment out,
   continue) was right for a migration you run once and read; it is
   wrong for code that runs. An unknown statement, operation or key
   throws `JikzError` — `unsupported` with the construct and the
   statement's line and column, `unknown-name` for a key, listing the
   keys the registry knows. `eject` keeps decision 2, since its output
   is read by a person.
3. **The DSL never grows its own vocabulary.** Everything it accepts
   lowers to a call the typed API already exposes, and the reference
   for what a key means is the typed option it becomes. The typed API
   is the primary route and the docs say so: strings lose the
   compile-time names (shapes, ports, placement keys) three phases of
   the review built. The DSL is for the dense parts.
4. **Coordinates are the picture's frame.** In a `frame: 'math'`
   picture a statement's numbers are TikZ's; in the default screen
   frame they are px, y down, and the docs say that too. Interpolated
   `Point`s are frame coordinates; interpolated numbers are numbers;
   interpolated strings are TikZ source.

### Zero dependencies — the front end is ours after all

`@tikz-editor/lezer-tikz` is on npm (published 2026-06, three months
before this note), so the spike's vendoring question is moot. It does
not change the answer, because jikz's zero-runtime-dependency line is
worth more than the grammar: a `jikz-tikz` carrying `@lezer/lr` and
`@lezer/common` (152 KB) would break that promise in the one package
meant to be the on-ramp, and its tables would be coupled to a
generator version and to one upstream author's schedule.

The spike's "the path grammar is the hard part" was about *documents*:
macros with arity, preamble, `\pgfmathsetmacro`, resynchronising at
`\begin{tikzpicture}` after swallowing a preamble. §0's scope is
*statements*, whose syntax is regular — `\cmd[opts] path;`, path items
that are coordinates, operators, `node{}`s and option lists, and a
bounded set of coordinate forms. That is a recursive-descent parser of
about 600 lines: a tokenizer that knows TeX's braces, brackets and
`;`; an option-list parser (balanced braces, `key=value`, the quotes
syntax `"text"`); a coordinate parser (cartesian, polar, named with
anchor, `|-`/`-|`, relative `++`/`+`, calc `($…$)` with `!t!`, `!d!`,
`!(P)!`, `!θ:`); path items; `\node`/`\coordinate`; `scope` and
`\foreach`. **Written from the TikZ manual and `tikz.code.tex`, not
from the Lezer grammar**, so provenance stays clean and the parser
owes nothing to anyone.

**`lezer-tikz` becomes a dev-only conformance oracle.** A
devDependency, never shipped: a test parses every corpus statement
with both and diffs the statement structure ours produces against
its tree. That buys the breadth of a 996-line grammar as a *test* —
which is exactly what the spike showed it is good at — and ships none
of it. It is the pattern the repo already uses for MathJax in the
cookbook build: heavy tools at dev time, nothing in `dist/`. If ours
and theirs disagree, the corpus entry decides, by hand.

### Architecture

    template literal ──▶ tokenize ──▶ parse ──▶ lower() ──▶ IR ──▶ interpret()  ── the product ──▶ picture items
         ${} slots       (ours)      (ours)    + key registry    │
                                                                 └──▶ emit()  ── eject ──▶ TypeScript
    .tex file ──▶ pictureBody() ──▶ precheck ──▶ (the same pipeline, decision 2 in force)
    corpus ──▶ ours ⟷ lezer-tikz (devDependency)  ── conformance test, not shipped

`interpret()` stops building its own picture and takes the caller's
container (`ItemContainer`): it calls `pen()`, `node()`, `edge()`,
`scope()`, `coordinate()`, `text()` on it, so a statement lands in
whatever registry and frame the caller has. The oracle property (§7)
is unchanged — interpreting a corpus entry into a fresh picture and
running the ejected TypeScript must give byte-identical SVG — and it
now guards the product rather than a by-product.

Interpolation is resolved before parsing: each `${}` becomes a
placeholder token the grammar sees as a number, a coordinate or an
identifier, and `lower()` substitutes the value. Numbers and `Point`s
are typed slots; strings are spliced as source (and parsed), which is
the escape hatch and is documented as one.

### Milestones, replacing §8's M1–M7

- **M1 — done.** Skeleton, IR, the two back ends, the oracle, the
  pre-check.
- **M2 — done (2026-09-19).** The statement parser, ours: `scan.ts`
  + `parse.ts`, recursive descent over the §4 grammar — every segment
  type, `arc`/`circle`/`rectangle`/`ellipse`/`grid`/`parabola`/
  `sin`/`cos`, `cycle`, `++`/`+`, inline `node{}`/`coordinate`, all
  coordinate forms including calc, scopes, `\foreach`. `\node` and
  `\coordinate` parse as `\path node …` (as in `tikz.code.tex`).
  Statement extent is consumed, not pre-split, so `;` in braces is
  text. `@tikz-editor/lezer-tikz` is a devDependency and
  `conformance.test.ts` diffs the statement split over the corpus:
  boundaries must agree exactly, kind differences are explained per
  entry (three: `\pic`, pgfmath expressions, 3D — all refused by
  design). Pulled forward from M3/M4/M5 because the oracle needed
  them to run: the IR in frame coordinates, a first key registry
  (`keys.ts`), `interpret(ir, host)` onto a caller's container,
  `emit` against `picture({ frame: 'math', unit: cm(1) })`, `tikz(pic)`
  with `${}` and the line:column error policy, `\foreach` expansion.
  Arrow tips on a single-segment path lower to `pic.edge()` (the pen
  has no tips). Found and fixed in core: `Pen.coordinate` mapped its
  point through the frame twice in a math-frame picture.
- **M3 — done (2026-09-19).** The key registry over the new API,
  one to one: colours through `color()`, lengths through `length()`,
  `->`/`{Stealth[…]}`/`arrows=`/`>=` through the tip specs, `bend`/
  `out`/`in`/`loop`, the node geometry and placement keys incl.
  `right=of` with `node distance`, `label=`/`pin=`/quotes with `label
  distance`, `text width`/`align`, `midway`/`pos`, `opacity`,
  `double`/`double distance`, `pattern`/`pattern color`, `rounded
  corners`, `path fading`, `shorten`, `dash pattern`, `even odd
  rule`, `help lines`, shading (`\shade`, `top color` … `ball color`,
  `shading angle` → `gradient`), `shift`/`rotate`/`scale` on scopes,
  `xshift`/`yshift` and `above=<len>` on nodes. `\tikzset` is TikZ's:
  `/.style` with `#1`, `/.append style`, `\tikzstyle`, and `every
  node`/`path`/`label`/`edge`, expanded inline when used and scoped
  like TikZ scopes them (a `TikzState` per picture for the DSL).
  `\begin{tikzpicture}[opts]` lowers as a scope. `edge` items lower
  to `pic.edge()` from the coordinate before them, with `loop`.
  Unknown keys throw with the nearest known key. Not `picture({
  styles })`: expansion needs no jikz feature and reads like TikZ in
  the ejected code.
- **M4 — done (2026-09-19).** The DSL surface: `tikz(pic)` (from
  M2) now returns `{ names }` — the names the call registered, in
  order; `tikzPicture` (template or `.source(text, { unit })`) builds
  a whole picture, applying the environment's options and the
  pre-check. The gaps closed by name: `+(…)` via pen-position
  tracking in the lowering (known after coordinates, `cycle` and
  most operations; not after an arc), `plot coordinates {…}` as a
  polyline with `-- plot` joining (per `tikz.code.tex`), and `\clip`
  for rectangle, circle and polygon shapes, lowered to a scope with
  `clip: frame.renderable(shape)` around the rest of the body. Not
  the type-level names contract: `pic.edge()` takes strings, so the
  runtime list is the useful part.
- **M5 — done (2026-09-19).** Eject: `toTypeScript(text, { shape,
  host, from, unit })` and `toTypeScript.template`, printing the §6
  shape — a module with `build()`, or just the statements to paste
  where a template call was. TikZ lengths travel through the IR as
  written (`{ $len: '2cm' }`) so the printer says `cm(2)` and the
  interpreter computes px; both still agree byte for byte. The corpus
  is the fidelity suite: `fidelity.test.ts` requires every file to
  lower without a gap, run as a template, and eject to
  `corpus/expected/*.ts` — files `tsconfig.parser.json` typechecks,
  so the ejected code is proven to compile against the typed API, not
  just to print. Found on the way: `>=` is legal in any option list
  (read before `->`, as TikZ reads it at draw time), `step` belongs
  on the path for `grid`, and `Frame.renderable` now keeps its
  argument's type so an ejected clip typechecks.
- **M6 — docs and playground.** A reference page on `@ozan.e/jikz`'s
  site, the support matrix gaining a "DSL" column, and the playground
  (TikZ on the left; the picture and the ejected code on the right).
- **Post-v1, in order.** Trees (`child{}`, on `tree()`), pics
  (`angle`, `right angle` → `ext/angles`; `\usetikzlibrary` selects
  ext shape sets and helpers), decorations keys (`snake`, `zigzag`,
  `markings`, `footprints`, `shapes` → the path decorations), then
  the pgfmath evaluator — only when the migration path earns it,
  since the DSL never needs it — and circuitikz bipoles.

### Definition of done, replacing §9

1. `@ozan.e/jikz-tikz` exporting `tikz`, `tikzPicture`,
   `toTypeScript` and `convert` (file mode), with jikz as its only
   peer and **no runtime dependencies**, like jikz itself.
2. Every statement in §0's scope lowers to a typed-API call, and a
   test per key asserts the option it becomes.
3. Every refusal in §5 and every unknown construct throws a
   `JikzError` whose message names the construct and the position;
   each has a test.
4. Oracle equivalence green across the corpus, in both modes.
5. A docs page whose first line is the §0 claim — TikZ's notation,
   JavaScript's data, one picture — and whose second is the caveat:
   the typed API is primary; strings lose its names.
6. The playground on the docs site.

### Risks, replacing §10

- **Two vocabularies drifting.** The DSL must not accept anything the
  typed API cannot express, or mean anything differently. The test in
  done-item 2 is the guard, and the API report (`api:check`) catches
  a typed change that the registry then has to follow.
- **Strings hide type errors until runtime.** Mitigated by the error
  policy (position, known names) and by the return value carrying
  registered names; not eliminated. The docs sell the DSL as the
  dense-notation route, not the default.
- **Our parser lags the grammar it is measured against.** Accepted:
  the conformance test says where, per corpus entry, and §0's scope
  bounds what "lagging" can mean. The alternative — shipping
  `@lezer/lr` — was rejected to keep both packages at zero runtime
  dependencies; `lezer-tikz` stays a devDependency only.
- **Provenance.** The parser is written from the TikZ manual and
  source, not from the Lezer grammar; the conformance test reads that
  grammar's *output*, never its rules.
- **Scope creep toward "real TikZ."** Decision 1 and 3 above, stated
  on the docs page from day one. The pre-check's "cannot" list is the
  public boundary.
- **The file converter's yield.** Unchanged at ~35%; it is secondary
  billing now, so that number stops being the product's number.

## 1. The four decisions

*Superseded by §0 (2026-09-19); kept as the record of the migration-tool framing.*

1. **Scope: core drawing + control flow.** Coordinates, path verbs,
   `\node`, `\coordinate`, edges and routing, styles, arrow tips —
   plus `\foreach`, `scope`, **pgfmath expressions** (promoted after
   M0 measured them at 7/20 across both corpora — see §8) and an
   **xcolor evaluator** (promoted after the Daniell Cell port needed
   six colour computations in one small figure — see §4).
   Layout libraries (trees, matrix, chains), decorations, `plot`,
   `intersections` and the ext shape packs are **out of v1**. Trees
   were considered for promotion and rejected on evidence: 2/20
   overall, 0/10 in the corpus that matches the target population.
2. **Unconvertible statements are commented out, not fatal.** Emit the
   original TikZ as a comment with a `TODO(jikz-tikz)` marker, convert
   everything else, print a summary, exit non-zero. Output always
   compiles. The user gets a partial diagram plus an explicit list of
   what needs hand-porting.
3. **`\foreach` yes, `\def`/`\newcommand` no.** Refuse user-defined
   macros loudly and by name. This is the line between a bounded
   project and owning TeX's expansion semantics. M0 found real body
   macros in only 3/20, and in every Stack Exchange case the file was
   already out of scope for another reason — so the boundary costs
   little and buys a bounded project.
4. **Refuse the whole file when it is 3D or pgfplots.** Added after
   M0: 4/20 of the corpus, and jikz is permanently 2D
   (`2026-09-13-extension-roadmap.md`, "Out of scope (confirmed)").
   This one is not decision 2's per-statement commenting — it is a
   pre-check on the whole file, because converting the 2D half of a 3D
   scene yields a confident-looking wrong picture, which is the worst
   output this tool can produce. See §5.1.

## 2. Architecture: one front end, two back ends

*Superseded by §0's architecture: the interpreter is the product, the emitter is eject.*

    .tex source
        │  tokenizer          (catcode-lite: TeX-ish, not TeX)
        ▼
      tokens
        │  grammar            (path statements, nodes, key-values)
        ▼
       AST                    (faithful to the source, no jikz in it)
        │  lowering           (coordinate port, key registry)
        ▼
       IR                     (a jikz program: verbs + options)
        ├──────────────► TS printer   ── the shipped product
        └──────────────► interpreter  ── builds a live Picture

Both back ends are required, and that is the point. The interpreter is
not a second product — it is the **test oracle**: for every corpus
entry, `interpret(ir)` and `eval(print(ir))` must render byte-identical
SVG. Anything else means the printer and the semantics have drifted.
It is also the playground ("paste TikZ, see SVG"), which is good
marketing that costs nothing extra.

The IR exists so neither back end parses and neither re-derives
semantics. Lowering happens once.

## 3. The coordinate contract

*Largely moot since the math frame: in a `frame: 'math'` picture the table below is a pass-through. Kept for the screen-frame case and as the record.*

**Settled by measurement, not preference.** The tempting design —
keep TikZ's numbers literally and wrap the picture in a y-flipping
transform — does not work. A flip emits `matrix(1 0 0 -1 0 0)` around
the whole scene, `<text>` included, so every glyph renders
upside-down. Verified 2026-09-15 against
`picture({ transform: Transform.scaling(1, -1) })`.

So the parser ports coordinates **at parse time**, which means it
automates the rewrites `docs/concepts/coordinate-system.md` already
documents by hand:

| TikZ | emitted |
|---|---|
| `(x,y)` | `point(x*S, -y*S)` |
| `(θ:r)` polar | `polar(-θ, r*S)` |
| `arc(α:β:r)` | `arc(c, r*S, -α, -β, true)` — negate, swap, sweep |
| `(A.45)` numeric anchor | `'A.-45'` |
| `(A.north)`, `(A.ne)` | unchanged — named anchors are convention-free |

`S` is px per TikZ unit, default `37.8` (1cm at 96dpi), overridable
with `--unit`. Explicit lengths (`2cm`, `10pt`, `3mm`, `1in`) convert
through a table; note PGF's `pt` is TeX's (1/72.27in), not CSS's.

Negative y needs no compensating offset: `toSVG({ fit: true })` sizes
the viewBox from content, so the generated code simply uses `fit`.

**Prefer named anchors in output.** They are identical in both
systems, so they survive a reader's review; numeric anchors are the
only place a reader has to trust the negation.

## 4. What v1 converts

### Statements
| TikZ | jikz target |
|---|---|
| `\begin{tikzpicture}[opts]…\end{tikzpicture}` | `picture({ shapes, … })` |
| `\draw`, `\fill`, `\filldraw`, `\path` | `pic.pen(…)` chain, or `pic.draw/fill/filldraw(shape)` for a single primitive |
| `\node[opts] (n) at (p) {text};` | `pic.node('n', {…})` |
| `\coordinate (P) at (p);` | `pic.coordinate('P', p)` |
| `node[opts]{t}` inside a path | `.label('t', {…})` on the pen |
| `coordinate (P)` inside a path | `.coordinate('P')` |
| `\begin{scope}[opts]…\end{scope}` | `pic.scope({…}, s => {…})` |
| `\foreach \x in {…}` | `for (const x of […])` / `for (let x = …)` |
| `\usetikzlibrary{…}` | selects the shape set; otherwise recorded and ignored |

### Path segments (one `\draw …;` → one pen chain)
`--`, `.. controls … ..`, `|-`, `-|`, `-- cycle`, mid-path `(p)` moves,
`circle`, `rectangle`, `ellipse`, `arc`, `++(…)` and `+(…)` relative
coordinates.

### Coordinates
Cartesian, polar, named, `(A |- B)` / `(A -| B)`, and the calc forms
`($(A)!0.5!(B)$)` and `($(A)!2cm!(B)$)` → `toward` /
`towardByDistance`.

### pgfmath expressions (promoted into v1 by M0)

A **bounded expression evaluator**, not a macro expander — the
distinction is the whole reason this is affordable. Grammar:

- literals with units, `+ - * /`, unary minus, parentheses;
- `\foreach` variables (`\x`) and `\the`-free scalars;
- functions: `sin cos tan asin acos atan sqrt abs round floor ceil
  min max mod veclen pow` (degrees, as pgfmath uses);
- constants `pi`, `e`.

Anything outside that set — `ifthenelse`, `rnd`, `scalar`, array or
string functions, `\pgfmathsetmacro` chains that define reusable
values — falls to decision 2. Expressions evaluate at **convert
time**, so the emitted TypeScript contains the resulting number, not a
runtime math call. A `\foreach`-dependent expression instead emits the
JS arithmetic inside the generated loop.

### xcolor (promoted into v1 by the Daniell Cell port)

Not in the original plan, and not optional: hand-converting one small
texample figure (`daniells-pile`, 23 statements) needed **six** colour
computations before anything could be drawn. Colours are not a long
tail — nearly every real figure mixes at least one.

- **`name!p`** — `blue!60` is 60% blue over white. **`name!p!other`** —
  `black!25!red` is the same mix against `other` rather than white.
- **Named colours**: the 19 xcolor base names, plus `\colorlet`
  aliases resolved at convert time.
- **`\definecolor{name}{model}{spec}`** for `rgb`, `RGB`, `gray`,
  `HTML` and `cmyk` — the Daniell figure defines its copper electrode
  as `{cmyk}{0,0.9,0.9,0.2}`, which is not an exotic choice.
- **`\colorlet{name}{expr}`**, which is just an alias plus a mix.

All of it evaluates at convert time to a hex literal, so the emitted
TypeScript carries `'#6666ff'`, never a colour expression. A name the
evaluator cannot resolve falls to decision 2 — better a commented
statement than a silently black one.

Out of v1: `\colorbox`, colour series, blend modes, and the `wheel`/
`shading` models.

### Keys
The registry is the bulk of the work, and it is a table, not a
grammar. v1 covers: `draw`, `fill`, colours and `color`, `thick`/
`thin`/`line width`, `dashed`/`dotted`/`densely …`/`loosely …`,
`->`/`<-`/`<->` and named tips, `bend left/right`, `out`/`in`/
`looseness`/`loop`, `minimum size`/`width`/`height`, `inner sep`/
`outer sep`, `anchor`, positional `above`/`below`/`left`/`right` and
their compounds, `rotate`, shape keys (`circle`, `rectangle`,
`ellipse`, …), `label=`, `midway`/`near start`/`near end`/`pos=`,
`opacity`/`fill opacity`, `double`, `pattern`, `scale`.

Unknown keys take decision 2: commented, reported, non-fatal.

## 5. What v1 refuses, and how

Refusal is a feature. Each of these produces a named error with the
source line, not a guess:

- `\def`, `\newcommand`, `\renewcommand`, `\pgfmathsetmacro` — **the
  boundary.** "jikz-tikz does not expand user macros; inline it or
  port this statement by hand."
- pgfmath beyond the §4 set — `ifthenelse`, `rnd`, string and array
  functions, `\pgfmathsetmacro` used to define reusable values.
- `plot`, `decorate`/`decoration=`, `name intersections`, tree `child`
  syntax, `\matrix`, chains — all have jikz homes, all are post-v1
  grammar. Trees are the first of these to land, but on their own
  merits rather than on M0's evidence, which did not support them.
- `pgfonlayer`, `\pgfdeclare*`, raw `\pgf…` primitives.
- Anything TeX-structural: `\begin{document}`, preamble, `\input`.

### 5.1 The whole-file pre-check

Before parsing, scan for markers of work the converter will not
attempt and refuse the **file**, naming the reason. This runs *before*
decision 2 and overrides it: a partial conversion here is actively
misleading rather than merely incomplete. M0 hit four of these markers
in twenty files.

**Two categories, one behaviour.** Both refuse and emit nothing; they
differ in what they promise.

| marker | category | why |
|---|---|---|
| `\tdplotsphericalsurfaceplot`, `\addplot3`, `shader=`, `[surf` | **cannot** | a parametric mesh needs per-face fill and depth ordering; jikz has no model for it |
| `remember picture`, `overlay` | **cannot** | page-relative positioning has no meaning in a standalone SVG |
| `\tdplot…`, `xyz cs:`, `xyz spherical cs:` | **not-yet** | 3D *projection* — see below |
| `\begin{axis}`, `\addplot`, `\pgfplotsset` | **not-yet** | pgfplots axes map onto `ext/dataviz` |
| `\begin{circuitikz}` | **not-yet** | circuitikz bipoles map onto `ext/circuits` |

Order is significant — first match wins, so every `cannot` sits ahead
of every `not-yet`. A spherical surface plot also matches the
projection pattern and must report the harder truth.

**Why the split exists.** Three of these five were originally filed as
"cannot", which told the reader *never* about work that is merely
unbuilt — and would have quietly justified never building it. A
refusal that names where the work would live is a roadmap entry; one
that doesn't is a dead end.

#### The three "not-yet"s, and what each would cost

**3D projection — small, and worth doing for jikz's own sake.** TikZ's
3D is a *projection, not a renderer*: no z-buffer, no hidden-surface
removal, you order the drawing yourself. `\tdplotsetmaincoords{60}{110}`
is a rotation matrix and `xyz cs:` is a linear combination of three
unit vectors, so the whole thing is `project(x, y, z) → Point` — a
couple hundred lines that disturb nothing, because you project first
and then draw with the existing 2D anchors and edges. Evidence that
this is the common case: of M0's four 3D refusals, `114158` uses
`xyz spherical cs:` with `\foreach` and `\filldraw` and **nothing
else** — a projection stage converts it completely. Added to
`2026-09-13-extension-roadmap.md` as `ext/projection`.

**circuitikz — gated on components, not on grammar.** The mapping is
mechanical: `to[R, l=$R_s$]` gives position (segment midpoint), angle
(the segment), shape (`R` → resistor) and a label (`l=` above, `l_=`
below), which is what `circuit.resistor({ at, rotate })` plus `wire()`
want. Two costs. The `to[…]` bipole idiom is a *parallel path
grammar* — components live on segments rather than at coordinates,
with poles (`*-`, `o-`), current arrows (`i=`) and three label
positions. Coverage is the second cost, though **less of one than
first recorded here**: this document originally said `ext/circuits`
carried seven shapes and no voltage source, which was wrong — a grep
that only matched single-line `defineShape` entries had truncated the
multi-line ones. It carried nine, sources included, and now carries
sixteen (2026-09-15: battery, bulb, three meters, ac/dc supplies).
M0's one circuitikz sample needs `R`, `L`, `V`, `open` and `short`, of
which only `open` needed deciding, and it needed no symbol either
(below). So the bipole grammar, not the symbol set, is the work.

**`open` resolves to a pen move, not a component.** Settled by reading
`pgfcircbipoles.tex`: `open` declares an *empty* drawing body, and the
comment on its size keys says why it has a size at all — "necessary
for curly voltages". It draws nothing, and exists to reserve a box for
a voltage annotation to hang off.

So when the bipole grammar lands, `to[open]` lowers to an `IrSegment`
with `op: 'moveTo'` — the run continues at the far coordinate with no
ink between. Already representable; the IR carries both ops today, so
this costs no new IR and no new shape. `short` is likewise a plain
`lineTo`, not a component. `ext/circuits` gained `openTerminal()` for
circuitikz's `o` pole, which is what actually gets drawn at an open
pair.

**And what `open` really points at is annotations.** `v=`, `i=`,
`l=`, `f=` — voltage, current, label, flow. jikz has no concept of
any of them, and "voltage" alone appears 119 times in
`pgfcircbipoles.tex`. That is the item that unblocks circuitikz
porting, far more than symbol coverage did. It wants its own design
pass; the pieces exist (`bracePath` for curly voltages, arrow tips,
`markPath`, edge `labelPos`/`labelOffset`), and what is missing is
something shaped like `voltage(from, to, { label, polarity })` that
offsets perpendicular to the segment and picks a side.

**pgfplots — largest, defer.** `ext/dataviz` already has the concepts
(`chart()`, `axes()`, `legend()`, Heckbert ticks), so a 2D
`\begin{axis}` + `\addplot coordinates{…}` subset is plausible. The
difficulty is not drawing: pgfplots' option surface is enormous, and
`\addplot table` reads external files a converter will not have.

## 6. Codegen shape

*Now the eject path (§0, M5). The rules stand.*

    import { picture, point, allShapes } from '@ozan.e/jikz'

    export function build() {
      const pic = picture({ shapes: allShapes })
      // \draw[thick] (0,0) -- (2,1) node[right] {B};
      pic.pen({ style: { strokeWidth: 2 } })
        .moveTo(0, 0)
        .lineTo(75.6, -37.8).label('B', { at: 'east' })
      return pic
    }

Rules:
- **Every statement keeps its source line as a comment.** A migration
  tool is read by a human comparing against the original; this is the
  single highest-value formatting decision.
- Emit only the imports actually used.
- No prettier dependency — a fixed printer with fixed indentation.
  Deterministic output matters more than taste, because the corpus
  tests diff it.
- `--emit=module` (default, the shape above) or `--emit=example`
  (`export default function render(container)`, matching `examples/`).

## 7. Testing

Three layers, in descending strength:

1. **Oracle equivalence.** For every corpus entry: interpreter SVG ===
   `eval(printed TS)` SVG, byte for byte. Catches printer bugs the
   moment they appear.
2. **Golden corpus.** `test/corpus/<name>.tex` + `.expected.ts` +
   `.expected.svg`. Start from `examples/` entries with a known TikZ
   original (`unit-circle-derivative.ts` ports a Beamer slide
   line-for-line; `petri-net`, `dfa-acceptor`, `angle-marking` were
   hand-ported). Known-correct on both sides.
3. **Refusal tests.** Every item in §5 has a test asserting the error
   names the construct and the line. Refusals are behaviour.

## 8. Milestones

*M0 and the spikes below are evidence and stand. M1–M7 as listed are superseded by §0's milestones.*

- **M0 — spike. ✅ done 2026-09-15**, against two corpora. Ten
  texample.net entries and ten tex.stackexchange answers, both sampled
  deterministically, every flag hand-verified. Results and the three
  scope changes they forced are below.
### M0 results (run 2026-09-15)

**Corpus.** texample.net's full listing (416 entries), sampled
deterministically 1-in-41 for ten, no cherry-picking. Source extracted
from each page and scanned, then every flag verified by hand — the
regex counts were misleading in both directions.

**Verdicts, per file:**

| example | v1? | what stops it |
|---|---|---|
| `daniells-pile` | ✅ | — plain paths, `to[controls=…]`, nodes, `fill opacity` |
| `ac-drive-components` | ⬜ | chains library (`start chain`, `on chain`, `join`) |
| `merge-sort-recursion-tree` | ⬜ | `child {node …}` tree syntax throughout |
| `feynman-diagram` | ⬜ | `decorations.pathmorphing` + trees |
| `calendar-circles` | ❌ | calendar library, radial shading, `\advance`/`\multiply` TeX register math |
| `perpendicular-bissector` | ❌ | 39 pgfmath expressions; the author calls it "an artisanal way of computing points" |
| `rectangle-node-with-diagonal-fill` | ❌ | defines a custom pgf shape with `\def\pgf@…` and `\pgfpoint` internals |
| `sine-and-cosine-functions-animation` | ❌ | `\newcounter` animation frames + pgfmath |
| `induction-machine` | — | circuitikz, not tikzpicture — different package |
| `tikz-listings` | — | `remember picture` overlay on a code listing — unportable by nature |

✅ converts under v1 · ⬜ converts one tier up · ❌ out regardless ·
— outside the target population

**The threshold held, but a different one tripped.** The stated gate
was "if user macros appear in more than ~2 of 10, revisit decision 3."
A regex said 5 of 10; by hand it is **1** — two were
`\renewcommand{\familydefault}` preamble font settings a parser never
sees, two were LaTeX counters, and only
`rectangle-node-with-diagonal-fill` defines macros in the body, and
those are raw pgf internals rather than ordinary `\newcommand`.
**Decision 3 stands: user macros are not the blocker.**

What blocks instead, in order:

1. **pgfmath — 3 of 10.** Real arithmetic in coordinates. This is the
   ceiling, and it is a *bounded* problem: an expression parser
   (`+ - * /`, `sqrt`, `sin`, `cos`, parens, `\x`-style variables) is a
   weekend, not a TeX expander. **Recommend promoting into v1.** It
   unlocks a third of this corpus and composes with `\foreach`, which
   is where such expressions almost always appear.
2. **Tree/`child` syntax — 2 of 10.** The most common single
   out-of-v1 construct after math, and `tree()` already exists in
   jikz. **Recommend making it the first post-v1 addition**, ahead of
   chains and matrix.
3. **Decorations — 1 of 10.** `snakePath`/`coilPath` exist; the
   grammar does not. Leave post-v1 as planned.

**Confidence: low-to-moderate, and biased high on difficulty.**
texample.net is a *showcase* gallery — 3D scenes, fractals, animations,
custom pgf shapes. It over-represents ambitious work and
under-represents the lecture-note and StackExchange-answer diagram that
is the actual paste-into-jikz population. Two of ten were not even
TikZ pictures. Read 1-in-10 as a floor on a hostile corpus, not as the
expected hit rate. **Before scope is frozen, re-run this against a
second corpus drawn from tex.stackexchange answers**, which matches the
target population far better.

### M0, second corpus — tex.stackexchange (run 2026-09-15)

**Corpus.** Stack Exchange API, 100 most-recently-active `tikz-pgf`
questions → their 100 top-voted answers → the 69 containing a TikZ
picture, sampled 1-in-6 for ten. Closer to the paste-into-jikz
population than texample, and it changes two conclusions.

| answer | v1? | what stops it |
|---|---|---|
| `458731` | ✅ | — `scope[rotate]` + `arc[x radius, y radius, start/end angle]` |
| `118570` | ⬜ | 4 plain `\draw` lines convert; `decorations.markings` does not |
| `681500` | ⬜ | `to[out=,in=]` curves convert; `decorations.shapes` star does not |
| `114158` | ❌ | `xyz spherical cs:` — 3D coordinate system |
| `278119` | ❌ | tdplot + pgfplots spherical surface |
| `458745` | ❌ | tdplot, `\define@key`, `ifthenelse` |
| `765580` | ❌ | `\def\SimpleNiceFan#1#2#3` + animation frames + pgfmath |
| `124114` | ❌ | one node whose entire content is a LaTeX `tabular` |
| `60607` | — | pgfplots `\begin{axis}`/`\addplot3`, not TikZ |
| `304659` | — | one-line fragment with `#1` — a macro body quoted in an answer |

**Combined across both corpora (20 files):**

| construct | texample | stackexchange | total |
|---|---|---|---|
| pgfmath | 3/10 | 4/10 | **7/20** |
| real body macros | 1/10 | 2/10 | **3/20** |
| tree `child{}` | 2/10 | 0/10 | **2/20** |
| 3D (tdplot, `xyz … cs`, pgfplots) | 0/10 | 4/10 | **4/20** |

### What the second corpus changed

1. **The real ceiling is jikz's 2D scope, not the grammar.** Four of
   ten Stack Exchange answers are 3D — tdplot, spherical coordinate
   systems, pgfplots surfaces. No amount of parser work converts
   those, because `2026-09-13-extension-roadmap.md` puts
   `3d`/`perspective`/`views` permanently out of scope. **New
   requirement: a hopeless-file pre-check.** Detect `tdplot`,
   `xyz * cs:`, `\begin{axis}`, `\addplot` up front and refuse the
   whole file by name, rather than converting the 2D half of a 3D
   scene into a confident-looking wrong picture. This matters more
   than any key in the registry.
2. **Do not promote trees.** 2/20 overall and **0/10** in the
   population that matters more. The M0-first recommendation was drawn
   from one hostile corpus; it does not survive the second. Trees stay
   post-v1, behind pgfmath.
3. **pgfmath confirmed at 7/20** — the top bounded blocker in both
   corpora independently. **Promote into v1** as originally
   recommended.
4. **Decision 2 earns its place.** Two of ten (`118570`, `681500`)
   convert *mostly*, with one decoration key commented out. Under a
   fail-the-file policy both would have produced nothing. Partial
   output is the difference between a useful tool and a strict one.
5. **Decision 3 sharpened.** Real body macros appear in 3/20 — and in
   both Stack Exchange cases the file was already hopeless for other
   reasons (3D, animation). Macros correlate with out-of-scope work,
   so refusing them costs almost nothing incremental. The boundary is
   cheaper than it looked.

### Honest expectation to plan against

Of TikZ in the wild: roughly **10–15% converts cleanly**, another
**20–25% converts usefully with gaps flagged**, and **~40% is out for
reasons that have nothing to do with the parser** — 3D, pgfplots,
LaTeX content inside nodes, animation. The pitch is therefore not
"paste any TikZ." It is **"port a 2D diagram, keep the parts that
map, get told about the rest."** That should be the first line of the
README, so the boundary is set before the first bug report rather than
after.

### Spike: `@tikz-editor/lezer-tikz` (2026-09-16) — adopt it

Two packages were dropped in `../tikz-editor` and `../svg2tikz.js`.
`svg2tikz.js` goes the other way (SVG → TikZ) and has nothing for us.
`tikz-editor` (MIT) has two packages that do.

**`@tikz-editor/lezer-tikz` should replace most of M1–M4** — not all
of it; see the pgfmath correction below. A 986-line Lezer
grammar, standalone — its only dependencies are `@lezer/common` and
`@lezer/lr`, no editor, no CodeMirror. It covers well past our scoped
subset: `\foreach`, macro definitions *with arity and default args*
(§5's hard refusal), `\pgfmath`, `\definecolor`/`\colorlet` (§4's
promoted xcolor work), `\tikzset`/`\tikzstyle`, `child`/`pic`/`let`/
`edge from parent`, decorations, `plot`, and mixed `$math$` in node
text. It has `UnknownStatement`/`UnknownPart`/`StrayToken` as grammar
productions — the same degrade-don't-throw principle §5.1 arrived at
independently.

**Measured against the M0 corpus**: all 20 files parse, with error
coverage between **0.0% and 2.3% of characters** — including the ones
the pre-check refuses, since 3D and pgfplots are still syntactically
TikZ. The residue is mostly `\documentclass` and preamble, which the
grammar absorbs as unknown rather than failing on.

**The tree maps onto our IR almost mechanically.** A `PathStatement`
is a flat list of `PathItem`s — `Coordinate`, `PathOperator`,
`Coordinate`, `NodeItem` — which is exactly the pen-chain shape
`lower()` already walks. `to[controls=…]` arrives as a `ToOperation`
with its `OptionList`, which is also the circuitikz bipole idiom.

What a swap costs, against 509 lines in `parser/src` today:

| file | fate |
|---|---|
| `tokenize.ts` (90) | deleted — the grammar replaces it |
| `parse.ts` (94) | mostly deleted; **`pictureBody()` stays** (see below) |
| `types.ts` (55) | the AST half goes; the IR half stays |
| `lower.ts` (39) | rewritten to walk a Lezer cursor |
| `emit.ts`, `precheck.ts`, `interpret.ts`, `index.ts` | unchanged |

So the part that is genuinely ours — the jikz mapping and the codegen
— survives, and the tokenizer plus the path grammar this plan called
"the hard part" stops being ours to write.

### Quality assessment (2026-09-16) — two deficiencies, one that matters

Measured rather than eyeballed. Parse-error coverage alone says
nothing: a grammar can absorb a file into `UnknownStatement` and
report no errors. So the metric is **unexplained characters** — the
span of `Unknown*`/`Stray*`/error nodes, not descending into them.

**Handed a tikzpicture body, it understands everything.** 0.0%
unexplained across the corpus, including the tree diagram that reads
as a 98.6% failure on the whole file and the spherical-coordinate one
(0.3%).

**Deficiency 1 — no pgfmath expression parsing, and it is on our
critical path.** The author declares `pgfmath_expression: parser:
"none"`, and a probe confirms it. `\pgfmathsetmacro{\r}{2*sin(30)+1}`
recognises the *statement* but shreds the expression into loose
`Number` nodes, and `sin(30)` is misparsed as a **`Coordinate`**
because `(30)` looks like one. Inside a path, `({2*\x},{sin(\x r)})`
arrives as a single opaque `Coordinate` with no interior structure.

That is exactly what M0 measured at **7/20** of the corpus and what §4
promoted into v1. **So the expression evaluator stays ours to write.**
It is still the weekend-sized job §4 scoped, and it is now cleanly
separable: a small expression parser over the text spans the grammar
hands us, rather than a stage wired into a grammar we do not own.

**Deficiency 2 — no LaTeX-document recovery.** Given a whole `.tex`,
it can collapse the file into one `UnknownStatement`: it does not
resynchronise at `\begin{tikzpicture}` after swallowing a preamble.
`merge-sort-recursion-tree` goes 98.6% → 0.0% when handed the body
alone. Real, but it is a TikZ grammar and not a LaTeX one, and
`pictureBody()` in our `parse.ts` already does the extraction — which
is why that function survives the swap.

Also `pic_operation` is `partial` and `tree_auto_naming` is `none`.
Both are post-v1 here.

**Correcting a number from the first pass.** "225 stable / 83 partial
/ 53 none" was across all four layers — parser, semantic, svg, edit.
At the **parser layer alone**, which is all we would take, it is **82
stable, 1 partial, 4 none of 91**. The gaps concentrate in the layers
we are not adopting.

**On the author, as a quality signal.** Shipping a capability matrix
that declares your own parser's four gaps — and marking
`pgfmath_expression` as `none` rather than quietly `partial` — is a
better signal than any test count.

**`@tikz-editor/core` settles the back-end question retroactively.**
112k lines exporting `renderTikzToSvg()`, with a self-assessed
capability matrix of 365 features: 225 stable, 83 partial, 53 none. It
ships a MathJax node-text engine, having hit the same mixed text/math
problem jikz has. That makes our **interpreter** largely redundant as
a product — keep it only as the oracle, which the codegen still needs
something to diff against.

It also validates §2's choice retroactively: had we gone
interpreter-first — "paste your TikZ, get SVG", the original framing in
`2026-09-11-tikz-parity-evaluation.md` §5 — we would now be building a
worse version of something that already exists under MIT.

**What does not change: the M0 ceiling.** The limit was never the
grammar. ~40% of wild TikZ is out for reasons unrelated to parsing —
3D, pgfplots, LaTeX inside nodes. A better front end makes the
tractable part much cheaper; it does not raise the ceiling.

**Provenance, checked.** Upstream is `DominikPeters/tikz-editor` —
MIT, 460 stars, `fork: false`, homepage `tikz.dev/editor`, 721 commits
between 2026-02-10 and 2026-07-01 authored entirely by one person, and
exactly one copyright line in the whole tree. The grammar itself grows
289 → 996 lines across 44 commits, each tied to a named feature
(`support intersections`, `parsing math in labels`, `implement pics`) —
the shape of something written rather than dropped in.

The npm package `@magescher/tikz-editor-core` is **a fork's
republication**: GitHub reports `magescher/tikz-editor` as
`fork: true, parent: DominikPeters/tikz-editor`, one version ever
(0.5.2, 2026-07-06), zero stars, no commits of its own, and already
behind upstream. The MIT notice is intact, so nothing improper
happened — but the dependency's health would rest with someone who has
no stake in it. **Take it from upstream, not from that scope.**

Upstream publishes nothing to npm, so the options are: ask the author
to publish `lezer-tikz` (best — it is standalone: `@lezer/common` and
`@lezer/lr`, no editor, no CodeMirror), vendor the grammar plus the
generated tables into `parser/vendor/` with the notice and a pinned
commit, or depend on a git URL and build it.

**The runtime dependency does not vanish with vendoring.** The
generated parser is tables; `@lezer/lr` interprets them and
`@lezer/common` supplies the tree API. That is **152 KB of shipped
code** across a two-package tree (`lr` → `common`, nothing else), both
MIT, from the CodeMirror author. It lands on `@ozan.e/jikz-tikz`, not
on `@ozan.e/jikz` — `files: ["dist", "src"]` already excludes
`parser/`, and the emitted TypeScript imports jikz and nothing else,
so no lezer reaches a consumer's bundle. Vendored tables are coupled
to the `lezer-generator` version that produced them, so pin
`@lezer/lr` and record the upstream commit beside the tables.

**M1–M4 are revised by the spike above.** The tokenizer and the path
grammar are no longer ours to write; what remains of them is wiring
`lower()` to a Lezer cursor. The key registry (M4) still has to be
built — the grammar gives `OptionPart`/`Identifier` spans, not jikz
options — and the **pgfmath expression parser stays ours** whatever
happens, since the grammar declares that gap itself. The milestones
below are kept as written for the record; read them with that
substitution.

- **M1 — one end-to-end slice, plus the pre-check.**
  `\draw (0,0) -- (1,1);` through tokenizer → AST → IR → both back
  ends, with the oracle test in place. **The §5.1 hopeless-file
  pre-check ships here, not later** — it is pattern matching over the
  source, needs no grammar, and until it exists every later milestone
  risks producing the one output this tool must never produce: a
  confident 2D rendering of half a 3D scene. It is also the cheapest
  possible honesty about the 2D boundary.
- **M2 — paths.** All segment types, relative coordinates, `cycle`.
- **M3 — nodes, labels, anchors.** Including inline `node{}` in paths.
- **M4 — the key registry.** Breadth work, mostly table-filling.
- **M5 — `\foreach`, `scope`, and the pgfmath evaluator.** These ship
  together: M0 found the expressions almost always live inside the
  loops, so splitting them leaves neither testable on real input.
  The **xcolor evaluator** lands in M4 with the key registry instead —
  it is what `draw=`, `fill=` and `color=` resolve *through*, so the
  registry is not testable on real input without it.
- **M6 — CLI, docs, corpus, playground.**
- **M7 (post-v1) — trees**, then decorations, then chains/matrix.
  Trees lead not on M0's evidence, which did not support them, but
  because `tree()` already exists and the `child{}` grammar is
  self-contained.

## 9. Definition of done

*Superseded by §0.*

1. `@ozan.e/jikz-tikz` with a `jikz-tikz <file.tex>` CLI and a
   programmatic `convert(source, opts)`.
2. Oracle equivalence green across the whole corpus.
3. Every §5 refusal tested and documented.
4. A `docs/` page that is honest about the subset — what converts,
   what does not, and what to do about it. The README's first line is
   the §8 framing, not "paste your TikZ": **port a 2D diagram, keep
   what maps, get told about the rest.**
5. The §5.1 pre-check covers every marker in its table, each with a
   test asserting the refusal names the reason.
6. The playground on the docs site, running the interpreter.

## 10. Risks

*Superseded by §0.*

- **Key surface breadth.** Mitigated by decision 2 — an unknown key
  never blocks a file.
- **The path grammar is the hard part**, not the tokenizer. TikZ
  interleaves coordinates, operations, `node{}` and `coordinate()`
  inside one `;`-terminated statement, with the pen position threading
  through. Budget accordingly.
- **Scope creep toward "real TikZ."** The counter is §5 and decisions
  3 and 4, stated publicly in the README from day one, so expectations
  are set before the first bug report rather than after.
- **Measuring by reading understates the work.** Both xcolor and the
  mixed-label defect were invisible to M0's classification pass and
  surfaced the moment one figure was actually converted and rendered.
  Budget a real conversion per milestone, not just corpus counts.
- **The honest ceiling is ~35% of wild TikZ** (§8). If that is not
  worth building, the time to decide is now — before the tokenizer,
  not after M4, when sunk cost will argue for widening the grammar
  into the 3D and pgfplots work jikz will never do.
