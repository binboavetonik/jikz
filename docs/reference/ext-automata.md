# Reference: ext/automata

Finite automata — jikz's `\usetikzlibrary{automata}`. Full API:
<a href="../api/index.html" target="_blank">generated reference</a>.

```ts
import { automataShapes, automata, initialArrow, acceptingArrow } from '@ozan.e/jikz/automata'

const pic = picture({ shapes: automataShapes })
  .node('q0', automata.state({ at: point(80, 100), text: 'q0' }))
  .node('q1', automata.state({ rightOf: 'q0', distance: 60, text: 'q1', accepting: true }))
  .edge('q0', 'q1', { arrowEnd: '->', label: '1' })
initialArrow(pic, 'q0')                    // TikZ `initial`: arrow from 3ex left, "start" at its tail
```

| TikZ | jikz |
|---|---|
| `state` (`circle, minimum size=2.5em`) | `automata.state({ … })`, or `shape: 'state'` |
| `accepting` (`double`) | `automata.state({ accepting: true })` / `automata.accepting()` — the `'accepting state'` shape, a `DoubleCircle` |
| `state with output` (`circle split`) | `automata.state({ output: 'o' })` — the `'state with output'` shape |
| `initial`, `initial where=<side>`, `initial text=`, `initial distance=` | `initialArrow(pic, name, { where, text, distance, edge, textStyle })` |
| `accepting by arrow`, `accepting where=` | `acceptingArrow(pic, name, { … })` |

The builders return `NodeOptions` for `pic.node()` and pass the
picture's placement keys through (`rightOf: 'q0'`). The arrows need
the picture because they are edges: they paint after the node, as
TikZ's `after node path` does, and work in a `frame: 'math'` picture.
Constants: `STATE_MIN_SIZE`, `ACCEPTING_GAP`, `INITIAL_DISTANCE`,
`INITIAL_TEXT`.
Demo: [`examples/dfa-acceptor.ts`](../../examples/dfa-acceptor.ts).
