# Reference: ext/mindmap

Mind maps — jikz's `\usetikzlibrary{mindmap}`. Full API:
<a href="../api/index.html" target="_blank">generated reference</a>.

```ts
import { mindmap, connectionBar } from '@ozan.e/jikz/mindmap'

mindmap(pic, {
  text: 'Root', color: '#dc2626',
  children: [{ text: 'A', color: '#2563eb', children: [{ text: 'A1' }, { text: 'A2' }] }, { text: 'B' }],
}, { at: point(300, 260), scale: 0.5 })
```

| TikZ | jikz |
|---|---|
| `concept` (`circle, fill=concept color, draw=concept color`) | the `concept` shape in `conceptShapes`; `mindmap()` sizes it by level |
| `root concept`, `level 1 concept` … `level 3 concept` (size, level distance, sibling angle, text width, font) | `CONCEPT_LEVELS`, overridable with `levels`; `scale` multiplies every length |
| `concept color=<c>` | `color` on a concept spec; children inherit, or a 30% tint when the parent is not the root |
| `circle connection bar`, `concept color` switch | `connectionBar(a, b, { from, to })` — a `Path` and the gradient to fill it |
| `grow cyclic`, `clockwise from` | `grow` (direction of the root's first child); the root's children spread evenly, deeper levels fan at the sibling angle |

`mindmap()` returns the node names it registered, level by level, so
concepts can be addressed afterwards (`pic.edge('A1', 'B')`).
Demo: [`examples/mindmap.ts`](../../examples/mindmap.ts).
