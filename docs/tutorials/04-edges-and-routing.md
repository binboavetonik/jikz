# Tutorial 4: Edges & routing

In which we connect named nodes and never compute a boundary point
again — then bend, steer, and loop the connections.

## The magic sentence

```ts
pic.node('A', { at: point(70, 75),  shape: 'circle',    width: 60,  height: 60, text: 'A' })
pic.node('B', { at: point(330, 75), shape: 'rectangle', width: 120, height: 60, text: 'B' })

pic.edge('A', 'B', { arrowEnd: 'stealth', label: 'connects' })
```

A **bare node name** as an endpoint resolves to the boundary point
facing the other endpoint — TikZ's `\draw (A) -- (B)` behavior. No
padding math, no intersection code; resize or move a node and the edge
re-clips.

## Pinning an anchor

Swap the bare name for a string spec when you want a specific port:

```ts
pic.edge('B.east', 'D.north', { arrowEnd: 'stealth', label: 'ok' })
```

`'A.north'`, `'A.ne'`, `'A.270'` — the anchor spec system from
Tutorial 3 applies verbatim.

## Curving: bend, out/in, loops

```ts
pic.edge('A', 'B', { bendAngle: 35, label: 'bend left' })  // TikZ bend left=35
pic.edge('B', 'C', { out: 315, in: 225 })                  // absolute depart/arrive angles
pic.edge('C', 'C', { out: 240, in: 300, looseness: 5 })    // self-loop
```

- `bendAngle` — positive bends **left of travel** (screen-independent,
  so it means the same as in TikZ).
- `out`/`in` — absolute angles in
  [screen convention](../concepts/coordinate-system.md) (270 = north).
- `looseness` — multiplies the control-point distance; TikZ's
  `looseness=` key.

## Arrow tips

```ts
{ arrowEnd: 'stealth' }   // also: 'latex', 'to', 'bar'
{ arrowEnd: '->' }        // TikZ spellings work: ->, <-, <->, '|'
{ arrowStart: 'stealth', arrowEnd: 'stealth' }  // double-headed
```

Arrowheads always inherit the edge's stroke color. Full gallery:
[`examples/arrow-tips.ts`](../../examples/arrow-tips.ts).

## Labels on edges

```ts
pic.edge('input', 'transform', { arrowEnd: 'stealth', label: 'map' })
// placement control:
pic.edge('H', 'HH', { label: '1/2', labelPos: 0.62 })   // TikZ node[pos=0.62]
```

`labelPos` rides the path by arc length (0.5 = midway, TikZ
`node[midway]`); `labelOffset` pushes perpendicular. `$...$` math
works here too: `{ label: '$\\Rightarrow$' }`.

## A real diagram

The [TCP state machine](../../examples/tcp-states.ts) combines
everything on this page — five nodes, bent transition edges with
labels, and a self-loop:

```ts
pic.edge('CLOSED', 'SYN', { arrowEnd: 'stealth', label: 'send SYN', bendAngle: 15 })
pic.edge('EST', 'EST',    { out: 240, in: 300, looseness: 5, label: 'data' })
```

## What to notice

- **Endpoints accept three kinds**: node names/anchor specs, raw
  `Point`s, and Anchorable geometry (e.g. a `circle()` — the merge
  edges in the [chess DAG example](../../examples/chess-transposition-dag.ts)
  connect circles directly).
- **Edges are statements too.** Paint order = call order; style with
  the same `{ style }` options as `draw`.
- If you're computing where a line should touch a shape, stop — name
  the shape and let the edge resolve it.

Next: [Paths & pen statements](./05-paths-and-pen.md) — when the path
*is* the point.
