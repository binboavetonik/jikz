# Reference: ext/turtle

Turtle graphics and Lindenmayer systems — jikz's
`\usetikzlibrary{turtle}` and `lindenmayersystems`. Both produce a
`Path` for any draw verb. Full API:
<a href="../api/index.html" target="_blank">generated reference</a>.

```ts
import { turtle, lsystem, LSYSTEMS } from '@ozan.e/jikz/turtle'

pic.draw(turtle({ start: point(20, 80) }).forward(60).left(90).forward(40).path())
pic.filldraw(lsystem(LSYSTEMS.kochSnowflake, { iterations: 4, step: 3, start: point(40, 140) }).path)
```

| TikZ | jikz |
|---|---|
| `turtle={forward=1cm, left=90, right, back, home}` | `turtle({ start, heading, frame }).forward(d).left(a).right(a).back(d).home()` |
| — | `penUp()`, `penDown()`, `push()`, `pop()`; `position`, `heading`; `path()` |
| `lindenmayer system={rule set={F -> F+F--F+F}, axiom=F, order=4, step=2pt, angle=60}` | `lsystem({ axiom, rules, angle }, { iterations, step, start, heading, frame }).path` |
| `l-system` symbols `F`, `f`, `+`, `-`, `[`, `]` | the same (plus `G` draws, `\|` turns around) |
| classic systems | `LSYSTEMS.kochCurve`, `kochSnowflake`, `sierpinskiTriangle`, `sierpinskiArrowhead`, `dragonCurve`, `hilbertCurve`, `plant` |

Headings are turtle-style: 0° is east, a left turn is
counter-clockwise as seen, and the turtle starts facing up. `frame:
'math'` produces a y-up path for a `frame: 'math'` picture.
`expandLSystem(axiom, rules, n)` is the rewriting step alone.
Demos: [`examples/koch-snowflake.ts`](../../examples/koch-snowflake.ts),
[`examples/lsystem-plant.ts`](../../examples/lsystem-plant.ts).
