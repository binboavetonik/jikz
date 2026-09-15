# Reference: ext/petri

Petri nets — jikz's `\usetikzlibrary{petri}`. The `place` and
`transition` shapes at the library's own minimum sizes, the `pre`/
`post` arc styles for the flow relation, and `tokens()` for a marking.
Ships in the package; nothing to register. Full API:
<a href="../api/index.html" target="_blank">generated reference</a>
(`npm run docs:api`).

## Setup

Places and transitions are a shape set, like every other shape family:

```ts
import { petriShapes, petri, petriArcs, tokens, circle, picture, point } from '@ozan.e/jikz'

const pic = picture({ shapes: petriShapes })
```

## Two ways to place a node

`petri.*` are typed option builders, and they are the route to prefer
here — see the sizing note below:

```ts
pic.node('p1', petri.place({ at: point(60, 70) }))
pic.node('t1', petri.transition({ at: point(150, 70), width: 12, height: 40 }))
```

String specs are the data-driven route, and resolve against the set
the picture holds:

```ts
pic.node('p2', { at: point(60, 170), shape: 'place' })
```

| name | shape | minimum size |
|---|---|---|
| `place` | circle | `5ex` (`PLACE_MIN_SIZE`) |
| `transition` | rectangle | `4mm` (`TRANSITION_MIN_SIZE`) |

Both are TikZ's `minimum size` — a floor, not a fixed size. Either
node still grows to fit its text, and both set `inner sep=0pt`.

### Why the builder, for transitions

jikz floors a node at 20 before the shape ever sees it, which is well
above TikZ's 4mm. The builders stand that default down, so the
library's own minimums are what apply. Through the string route a
transition drawn as the usual thin bar comes back 20 wide unless you
lower `minWidth` yourself:

```ts
pic.node('t', { shape: 'transition', width: 12, minWidth: 0 })   // 12 wide
pic.node('t', { shape: 'transition', width: 12 })                // 20 wide
```

A place is unaffected either way: TikZ's 5ex is the larger of the two.

## Tokens

**Tokens are not part of the place.** A place and its dots are two
paints in one node, which a single `toSVGPath()` cannot carry —
and TikZ splits them for the same reason, its `tokens=n` expanding to
child *nodes* rather than to marks on the place. So a marked place is
two calls, and `tokens()` hands you the dots to fill:

```ts
const at = point(60, 70)
pic.node('p1', petri.place({ at }), { style: { stroke: '#334155', fill: '#ffffff' } })
for (const t of tokens(at, 2)) {
  pic.fill(circle(t.center, t.radius), { style: { fill: t.color } })
}
```

Positions come straight from the table TikZ hard-codes for one through
nine tokens, flipped for a y-down canvas — including the two
arrangements that are not vertically balanced (three is slightly
top-heavy, eight is two over three over three), carried over rather
than quietly corrected. Past nine TikZ has no arrangement and fails
quietly: the lookup expands to `\relax`, so every token lands on the
place's centre. A ring is used instead.

| option | TikZ | default |
|---|---|---|
| `size` | `minimum size=1ex` on `token` | `TOKEN_SIZE` |
| `distance` | `token distance` | `TOKEN_DISTANCE_RATIO` × `size` |
| `color` | `fill=black` | `TOKEN_COLOR_DEFAULT` |
| `colors` | `colored tokens` | falls back to `color` |
| `labels` | `structured tokens` | none |
| `textColor` | `text=white` on `token` | `TOKEN_TEXT_COLOR_DEFAULT` |
| `fontSize` | `font=\tiny` on `token` | `TOKEN_FONT_SIZE` (5) |

`distance` scales with `size` rather than sitting at a fixed length,
so tokens keep their spacing when you size them up; at the default
size it is exactly TikZ's `1.5ex` (`TOKEN_DISTANCE_DEFAULT`). Pass
`distance` to override. `colors` and `labels` are read per index, so a
short list leaves the rest on the default.

A label is a value like the rest of the token, so the caller draws it
too — `textColor` and `fontSize` carry TikZ's white `\tiny` along:

```ts
for (const t of tokens(at, 3, { size: 12, labels: ['a', 'b', 'c'] })) {
  pic.fill(circle(t.center, t.radius), { style: { fill: t.color } })
  if (t.text) {
    pic.text(t.center, t.text, {
      fontSize: t.fontSize,
      textAnchor: 'middle',
      dominantBaseline: 'middle',
      style: { stroke: t.textColor },   // jikz colours text from `stroke`
    })
  }
}
```

Nothing grows the dot to fit that label the way a TikZ node would, so
size the tokens up for a label wider than one.

`tokenPositions()` is the same layout without the fill metadata, when
you want to draw the dots yourself.

## Arcs

`petriArcs` is TikZ's flow relation, ready to hand to `edge()`:

| style | TikZ |
|---|---|
| `petriArcs.pre` | `<-`, `shorten <=1pt` |
| `petriArcs.post` | `->`, `shorten >=1pt` |
| `petriArcs.preAndPost` | `<->`, shortened at both ends |

```ts
pic.edge('p1', 't1', petriArcs.post)
pic.edge('p3', 't2', { ...petriArcs.post, bendAngle: 20 })
```

Each names both ends rather than leaning on jikz's defaults, so
spreading one over options that already carry a tip replaces it
instead of leaving a stray head behind. They are plain `EdgeOptions`,
so spread one to add routing or styling.
See the [marked-net example](../cookbook/#petri-net-with-marking-petri-library).
