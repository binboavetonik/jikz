# ViewBox, sizing & fit

TikZ auto-sizes every picture to its content. SVG normally can't —
you declare a `viewBox` up front and anything outside it is clipped.
jikz offers both models on both output paths (`toSVG` and `mount`
take the same options).

## Fixed size

```ts
pic.toSVG({ width: 280, height: 120 })
```

The viewBox is exactly `0 0 280 120`. Choose this when the diagram is
laid out for a known frame — the common case for hand-placed figures.

## Auto-fit

```ts
pic.mount(container, { fit: true, padding: 12 })
```

jikz measures the content bounds (geometry, strokes, labels — pushed
out by their `distance`, so text is included) and emits a viewBox
that wraps them, plus `padding`. Choose this when:

- content size is data-driven (graphs, generated diagrams),
- you're iterating and tired of nudging `width`/`height`,
- you're porting TikZ and expect TikZ's auto-sizing behavior.

`fit` measures the *compiled* scene, so labels, arrowheads, and
decorations all count — nothing clips.

## Canvas transforms interact with fit

If the picture was created with a transform —
`picture({ transform: Transform.translation(160, 100) })` — fit maps
the content bounds *through* the transform before sizing. A scene
authored around a local origin `(0,0)` fits correctly wherever the
transform places it. The
[unit-circle example](../../examples/unit-circle-derivative.ts) relies
on this: geometry around `(0,0)`, translated to center, `fit: true`.

## Node / SSR

`toSVG()` returns a string and never touches the DOM — both sizing
modes work in Node, workers, and SSR identically:

```ts
const svg = picture({ shapes: basicShapes })
  .node('A', { at: point(60, 60), shape: 'circle', width: 60, height: 60, text: 'A' })
  .toSVG({ fit: true, padding: 8 })

res.setHeader('Content-Type', 'image/svg+xml')
res.end(svg)
```

## Rules of thumb

- Hand-placed figure, known frame → `{ width, height }`.
- Generated or ported content → `{ fit: true, padding: 8–12 }`.
- Mixing fixed axes with flexible content → fix the axis direction
  you control, fit the rest by composing: measure with `fit`, then
  re-emit with your fixed width if you need an exact size.
