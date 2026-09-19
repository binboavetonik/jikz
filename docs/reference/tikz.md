# Reference: TikZ notation

`tikz(pic)` — TikZ statements inside a jikz picture. A tagged template
that parses the notation, lowers it onto the typed API and puts the
result into the picture it was bound to, in order with the picture's
other calls. It is the same library, spelled the way the TikZ manual
spells it.

```ts
import { picture, allShapes, cm, point } from '@ozan.e/jikz'
import { tikz } from '@ozan.e/jikz-tikz'

const pic = picture({ shapes: allShapes, frame: 'math', unit: cm(1) })
const t = tikz(pic)

t`\node[draw, circle] (a) at (0,0) {a};
  \node[draw, circle, right=of a] (b) {b};
  \draw[->, thick] (a) to[bend left] node[above] {f} (b);`

pic.node('c', { at: point(1, -1), text: 'c' })   // the typed API, same picture
t`\draw (b) -- (c);`                             // and back
```

Status: unpublished (`parser/` in the repository), zero runtime
dependencies. Support matrix: the last column of
[What jikz supports](../concepts/tikz-support.md).

## `tikz(pic)` and `tikzPicture`

`tikz(host)` binds a template to a picture or a scope. The
`frame: 'math'` picture is what the notation assumes — `(1,2)` is one
unit right and two up, `(30:1)` is counter-clockwise from east, and a
`1cm` in the source is `cm(1)` in the picture's unit.

Each call returns the names it registered:

```ts
const { names } = t`\node (a) at (0,0) {a}; \draw (1,0) coordinate (c) -- (2,0);`
// ['a', 'c']
pic.edge('a', 'c')
```

`tikzPicture` builds a whole picture from a `tikzpicture` environment
(its options apply) or a bare body:

```ts
const pic = tikzPicture`\begin{tikzpicture}[>=stealth, every node/.style={draw}]
  \node (a) at (0,0) {a};
\end{tikzpicture}`
tikzPicture.source(texFile, { unit: cm(2) })
```

`t.source(text)` takes a plain string.

## `${}` slots

Interpolation is the escape hatch that replaces pgfmath. A number
prints as a number, a point as `(x,y)` in the frame, a string as raw
source:

```ts
const p = point(1, 2)
t`\draw (0,0) -- ${p} -- (${width},0) ${closed ? '-- cycle' : ''};`
```

An expression in a coordinate, `(2*\x, 1)`, is refused by name: TikZ
would evaluate it with pgfmath, and the template has `${}` instead.

## Errors

A construct the pipeline cannot lower throws `JikzError` with code
`unsupported`, naming the line and column inside the template and the
statement:

```
tikz: line 2:3: unknown node key "minimum sze=1cm" — did you mean "minimum size"?
  in: \node[minimum sze=1cm] at (0,0) {x};
```

The template never drops a statement silently. Syntax errors report
the same way (`missing ";"`).

## Styles and scope state

`\tikzset` is TikZ's: `name/.style={…}` with `#1`, `/.append style`,
`\tikzstyle`, and `every node`, `every path`, `every label`, `every
edge`. A style is expanded inline where it is used, a scope gets its
own copy of the state, and the state is kept per picture across
template calls:

```ts
t`\tikzset{box/.style={draw, minimum size=1cm}, tint/.style={fill=#1!20}}`
t`\node[box, tint=blue] (a) at (0,0) {a};`
```

`>=stealth` and `node distance=` are state too, wherever they appear.

## What lowers to what

| Notation | jikz call |
|---|---|
| `\draw`, `\fill`, `\filldraw`, `\path` … | `host.pen({ mode, style })` with the path operations as verbs |
| `\shade`, `\shadedraw` | a pen with `mode: 'fill'` and a `gradient` style |
| `\node … {text}`, `\coordinate` | `host.node(name, options)`, `host.coordinate(name, at)` |
| `\draw[->] (a) -- (b)`, `(a) edge[…] (b)` | `host.edge(a, b, { arrowEnd, bendAngle, labels, … })` — the pen has no tips |
| `node{…}` on a path | `pen.node(name, { pos, … })`, riding the segment |
| `\begin{scope}[…]` | `host.scope({ style, transform }, s => …)` |
| `\clip` | a scope with `clip: frame.renderable(shape)` around the rest of the body |
| `\foreach` | expanded at lowering: lists, `...` ranges with a step, `/`-tuples, `count=` |
| `\node {r} child {node {a}} …` | nodes at TikZ's own positions (`level distance`, `sibling distance`, `grow`, `level <n>`, `missing`) plus `host.edge(parent, child)` per `edge from parent`; anonymous children are `r-1`, `r-2`, … |
| `($(A)!0.5!(B)$)` and friends | `Point` methods on resolved names |
| `\pic[draw, "$\alpha$"] {angle=A--O--B}`, `right angle` | `host.draw/fill/filldraw(angle(A, O, B, { radius, eccentricity, label }))` from `@ozan.e/jikz/angles`; the verb or the pic's `draw`/`fill` keys paint |
| `\draw[decorate, decoration={snake, …}]`, `brace`, `markings` | the path as `Path` geometry mapped once, `decoratePath()`/`markPath()` in screen px, drawn as given through `screen()`; `pre`/`postaction` decorations paint under/over the path |
| `(a) to[R, l=$R_1$, *-*] (b)` (circuitikz) | the symbol from `circuitShapes` at the midpoint, rotated along the segment, `host.edge()` wires to its `in`/`out` ports, junction dots for terminals; `short` is a wire, `open` a gap |
| `\usetikzlibrary{…}` | nothing — the notation has every library's constructs it supports already |

Anonymous nodes are named `tikz-1`, `tikz-2`, … per picture.

## Eject: `toTypeScript`

The TypeScript a template call stands for, against the typed API —
the same pipeline, printed instead of run:

```ts
toTypeScript(String.raw`\node[draw, minimum size=1cm] (a) at (0,0) {a};`)
// pic.node('a', { at: point(0, 0), text: 'a', minWidth: cm(1), minHeight: cm(1), style: [...] })
```

Options: `shape: 'statements' | 'module'` (a file with `build()`),
`host` (the variable name), `from`, `unit`, `state` (styles from
earlier calls). Every statement keeps its source as a comment. The
[playground](../playground.md) shows the ejected code next to the
picture.

## Not lowered, by name

pics other than `angle` and `right angle`, `let`, `child foreach`, `plot` with `smooth` or a function, decorations on arcs, circles and grids, `decoration={text along path}`,
`/.code` handlers, `sloped` on path nodes, `->` on a path with more
than one segment, `\clip` with options, `transform shape`, and
pgfmath expressions. In a file (`convert`, the migration path) each
becomes a `// TODO(jikz-tikz): …` comment; in a template each throws.

Whole files the pre-check refuses before parsing: 3D (`\tdplot…`,
`xyz cs:`), pgfplots, `remember picture`/`overlay`, surface plots.
