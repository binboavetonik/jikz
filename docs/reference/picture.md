# Reference: picture

`picture()` — the declarative registry that is jikz's main API.
Collects statements, resolves names, compiles to SVG. Full API:
[generated reference](../api/) (`npm run docs:api`).

Conceptual intro: [Two API levels](../concepts/two-api-levels.md).

## Scopes — `pic.scope(options, build)`

TikZ's `\begin{scope}[…] … \end{scope}`. The callback receives the
scope; everything drawn on it is grouped, transformed and styled
together. `scope` returns the *container*, so the chain continues after
it closes.

```ts
picture()
  .scope({ style: { stroke: '#2563eb' }, transform: Transform.translation(120, 0) }, (s) => {
    s.node('R1', { at: point(0, 0), text: 'R' })
     .node('C1', { at: point(60, 0), text: 'C' })
     .edge('R1', 'C1')
  })
  .draw(axis)                 // outside the scope, unstyled
```

A scope accepts every verb a picture does — `node`, `edge`, `draw`,
`fill`, `filldraw`, `path`, `text`, `coordinate`, `pen`, and `scope`
itself.

| option | effect |
|---|---|
| `style` | cascades onto nodes, edges and bare shapes inside |
| `transform` / `scale` | wraps the group in a transform |
| `opacity` | composites the scope as one unit |
| `clip` | clips everything in the scope |
| `className` / `id` | attributes on the group element |

### Style cascade

Weakest to strongest: path-mode baseline → outer scopes → inner scopes →
the item's own style. Overriding is per key, so an item that sets only
`stroke` keeps the scope's `strokeWidth`.

Two deliberate carve-outs:

- **`path()` stays invisible.** Its `none` baseline is applied *after*
  the scope chain, so an enclosing `stroke` cannot silently make every
  `\path` visible. An explicit style on the call itself still draws it.
- **Text is not restyled.** A scope setting `fill` for its shapes would
  otherwise recolor every label inside it. Style text per call.

### Coordinates

Geometry inside a scope stays in the scope's own coordinates; the
transform rides on the group, so strokes and arrow tips scale with it —
the same rule as `Picture`'s canvas transform.

Node names stay **global to the picture**, as in TikZ, and resolve into
whichever container asks for them. So an edge declared at picture level
can join two nodes declared in different scopes, and `pic.resolve('A')`
returns picture-space coordinates whatever scope `A` was declared in.
`{ fit: true }` folds scope transforms into the content bounds.

### Alternate backends

The scope *style* cascade needs no renderer support — styles are folded
into each item's options before dispatch, so a four-method
`PictureRenderer` keeps working and simply sees a flat stream. A scope's
visual group properties (transform, clip, opacity, class, id) do need
grouping: implement the optional `beginGroup`/`endGroup`, or the render
throws rather than silently dropping them.

## Construction

```ts
picture(options?: {
  transform?: Transform   // canvas transform — maps the whole scene
  scale?: number          // uniform canvas scale (composes with transform)
})
```

## Verbs

| method | TikZ | paints |
|---|---|---|
| `pic.draw(g, opts?)` | `\draw` | stroke |
| `pic.fill(g, opts?)` | `\fill` | fill |
| `pic.filldraw(g, opts?)` | `\filldraw` | both |
| `pic.path(g, opts?)` | `\path` | registers without painting |

All accept `{ style, label }` — `label: { text, at, distance, options }`
is TikZ's `node[right]{x}` inside the statement.

## Registry

| method | purpose |
|---|---|
| `pic.node(name, options, renderOpts?)` | register + paint a node |
| `pic.edge(from, to, edgeOpts?, renderOpts?)` | boundary-aware edge by name/anchor/point |
| `pic.coordinate(name, at)` | name a raw point (TikZ `\coordinate`) |
| `pic.getNode(name)` | look up (returns `Node \| undefined`) |
| `pic.pen(options?)` | start a fluent path statement |
| `pic.text(p, text, options?)` | bare text with directional placement |

Endpoint strings: `'A'` (auto-boundary), `'A.north'`, `'A.ne'`,
`'A.270'`, or a named coordinate.

## Output

```ts
pic.toSVG({ width, height })        // or { fit: true, padding }
pic.mount(element, sameOptions)     // browser: live DOM tree
```

Both are lazy: statements compile at output time, in registration
order. See [ViewBox, sizing & fit](../concepts/viewbox-and-fit.md).

### Pan & zoom

`mount` accepts `panZoom` for first-class interaction — wheel zooms to
the cursor, pointer-drag pans, two-pointer pinch zooms, double-click
resets:

```ts
const ctl = pic.mount(element, {
  fit: true,
  panZoom: { minScale: 0.15, maxScale: 4 },
})

ctl.transform          // { tx, ty, scale }
ctl.setTransform({ tx: 20 })
ctl.resetToFit()       // back to the fitted view
ctl.wasDrag()          // true after a pan — guard your click handlers
ctl.screenToUser(clientX, clientY)  // client px → scene coordinates
ctl.destroy()          // detach listeners (call on unmount)
```

With `panZoom` the root svg fills its container (`width`/`height: 100%`)
and the browser letterboxes the viewBox, so the fitted view needs no
pixel math — and a temporarily hidden (0×0) container needs no refit.
All interaction state lives in one `<g class="jikz-viewport">` wrapping
the scene; the controller mutates only its `transform` attribute, so
panning never re-renders the picture. `onTransform(t)` in the options
fires after every change — stash it and reapply with `setTransform`
to preserve the view across remounts.

## Examples

Nearly every card in [examples/](../../examples/) — start with
[flow](../../examples/flow.ts) and
[named-graph](../../examples/named-graph.ts).
