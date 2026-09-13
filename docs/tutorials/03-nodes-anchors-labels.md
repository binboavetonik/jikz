# Tutorial 3: Nodes, anchors & labels

In which shapes get names, names get boundary points, and text learns
to hang off a shape without colliding with it.

## A node is a named, anchored shape

```ts
const pic = picture({ shapes: basicShapes })   // names below resolve against this set

pic.node('A', {
  at: point(150, 85),
  shape: 'rectangle',
  width: 140,
  height: 90,
  text: 'A',
})
```

Three things happen at once: the shape is registered under the name
`'A'`, it's painted, and it gains a full **anchor system**. TikZ:

```tex
\node[draw, rectangle, minimum width=140, minimum height=90] (A) at (150,85) {A};
```

Omit `width`/`height` and the node **measures its own text** and sizes
to fit (with `minWidth`/`innerSep` as floors) — TikZ's default
behavior. See
[`examples/node-auto-size.ts`](../../examples/node-auto-size.ts).

## Anchors

Every shape exposes the TikZ compass — and the string form works
everywhere an endpoint is expected:

```ts
const n = pic.getNode('A')

n.anchor('north')       // top center
n.anchor('south east')  // corner
n.anchor('ne')          // alias — same point
n.anchor(45)            // numeric angle, screen convention: 270 = north
n.anchor(270)           // = north
n.bounds                // [x0, y0, x1, y1] including pointers/heads
n.center                // the `at` point
```

The full shape gallery (40+ shapes, pointers, callouts, cylinders…)
lives in [`examples/shape-gallery.ts`](../../examples/shape-gallery.ts);
anchors work identically on all of them.

## Labels — TikZ's `label=`

A label is text placed **on the boundary** of a node, pushed outward
by a gap:

```ts
pic.node('A', {
  at: point(90, 90), shape: 'circle', width: 60, height: 60, text: 'A',
  labelDistance: 8,   // TikZ label distance=8 — default for all labels
  labels: [
    { text: '$\\alpha$', at: 'north' },                        // KaTeX math
    { text: 'rim', at: 'south east', options: { fontSize: 9 } },
    { text: 'far', at: 'east', distance: 18 },                 // per-label override
  ],
})
```

The crucial detail: `distance` is a **border-to-border gap** (outer
sep included, font size accounted for), not a center offset. Labels
never overlap their node, at any font size. `at` accepts named
anchors, aliases, and angles — same spec system as `anchor()`.

## Shape labels on draw verbs

TikZ puts `node[right]{x}` *inside* a `\draw` statement. So does jikz:

```ts
pic.draw(line(point(-130, 0), point(130, 0)), {
  label: { text: '$\\cos$', at: 'east', distance: 6 },
})
```

The label rides the path's endpoint/extent in the given direction —
move the line and the label follows.

## What to notice

- **Name first, geometry later.** You almost never hold a node in a
  variable; `'A.north'` as a string is the idiomatic reference
  (Tutorial 4 makes edges of this).
- **Text can be math.** Any `$...$` string renders through KaTeX when
  installed, falls back to italic otherwise —
  [`examples/node-labels.ts`](../../examples/node-labels.ts).
- **Anchors respect rotation.** `rotate: 45` rotates the shape; the
  compass rotates with it.

Next: [Edges & routing](./04-edges-and-routing.md) — connecting nodes
without computing a single boundary point.
