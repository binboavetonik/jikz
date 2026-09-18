# Reference: ext/er

Entity–relationship diagrams — jikz's `\usetikzlibrary{er}`. Full API:
<a href="../api/index.html" target="_blank">generated reference</a>.

```ts
import { erShapes, er } from '@ozan.e/jikz/er'

picture({ shapes: erShapes })
  .node('student', er.entity({ at: point(60, 60), text: 'Student' }))
  .node('takes', er.relationship({ rightOf: 'student', distance: 40, text: 'takes' }))
  .node('id', er.keyAttribute({ above: 'student', distance: 20, text: 'id' }))
  .edge('student', 'takes')
```

| TikZ | jikz |
|---|---|
| `entity` (`rectangle, minimum height=2\baselineskip, minimum width=4\baselineskip`) | `er.entity()` / `shape: 'entity'` |
| `relationship` (`diamond, minimum size=1.5\baselineskip, inner sep=1pt`) | `er.relationship()` / `shape: 'relationship'` |
| `attribute` (`ellipse, minimum size=1.5\baselineskip`) | `er.attribute()` / `shape: 'attribute'` |
| `key attribute` (`font=\itshape, attribute`) | `er.keyAttribute()` — sets `textStyle: { fontStyle: 'italic' }` |

The minimums are floors, as in TikZ: a node sizes to its text above
them. Constants: `ENTITY_MIN_WIDTH`, `ENTITY_MIN_HEIGHT`,
`RELATIONSHIP_MIN_SIZE`, `ATTRIBUTE_MIN_SIZE`, `RELATIONSHIP_INNER_SEP`.
Demo: [`examples/er-diagram.ts`](../../examples/er-diagram.ts).
