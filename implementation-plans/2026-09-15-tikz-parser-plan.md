# TikZ parser — plan

Status: PLAN (2026-09-15). Picks up the item deferred in
`2026-09-11-tikz-parity-evaluation.md` §5 and excluded from
`2026-09-13-extension-roadmap.md` ("a separate package and a
tokenizer/grammar project, not a library extension"). Ships as
`@ozan.e/jikz-tikz`; nothing in the core roadmap blocks it or is
blocked by it.

Why it is worth doing: every other roadmap item widens *what* a jikz
user can draw. This one widens *who can adopt jikz at all*, by turning
"learn my API" into "paste what you already wrote."

## 1. The four decisions

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

### 5.1 The hopeless-file pre-check

Before parsing, scan for markers of work jikz cannot draw at all and
refuse the **file**, naming the reason:

| marker | why |
|---|---|
| `tdplot`, `\tdplotsetmaincoords` | tikz-3dplot — jikz is 2D |
| `xyz cs:`, `xyz spherical cs:`, `canvas is … plane` | 3D coordinate systems |
| `\begin{axis}`, `\addplot`, `pgfplotsset` | pgfplots, a different package |
| `\begin{circuitikz}` | circuitikz's `to[R, l=…]` component syntax |
| `remember picture`, `overlay` | page-relative positioning, meaningless in a standalone SVG |

This runs *before* decision 2, and overrides it. A file that trips a
marker produces one clear message and no output, because a partial
conversion here is actively misleading rather than merely incomplete.
M0 hit four of these five markers in twenty files.

## 6. Codegen shape

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
