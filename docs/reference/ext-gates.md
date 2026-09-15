# Reference: ext/gates

The logic-gate extension — jikz's
`\usetikzlibrary{shapes.gates.logic.US}` and `.IEC`. Eight gate shapes
with named input/output ports, drawn in either the distinctive US
shape or the rectangular IEC body. Ships in the package; nothing to
register. Full API: <a href="../api/index.html" target="_blank">generated reference</a>
(`npm run docs:api`).

## Setup

Gates are a shape set, like every other shape family — hand it to the
picture, alone or merged with others:

```ts
import { gateShapes, gates, picture, point } from '@ozan.e/jikz'

const pic = picture({ shapes: gateShapes })
```

## Two ways to place a gate

`gates.*` are typed option builders: they carry the shape kind, so
they need no set at all and a typo is a compile error.

```ts
pic.node('X', gates.xor({ at: point(110, 70) }))
pic.node('N', gates.not({ at: point(220, 70), variant: 'iec', text: '1' }))
```

String specs are the data-driven route, and resolve against the set
the picture holds:

```ts
pic.node('A', { shape: 'and' })
pic.node('B', { shape: 'nor', shapeOptions: { variant: 'iec' }, text: '≥1' })
```

| name | ports | negated |
|---|---|---|
| `and`, `or`, `xor` | `in1`, `in2`, `out` | no |
| `nand`, `nor`, `xnor` | `in1`, `in2`, `out` | yes — drawn with the bubble |
| `not`, `buffer` | `in`, `out` | `not` only |

## Ports

A port is an anchor name, so it resolves anywhere an anchor does:

```ts
pic.edge('A.out', 'N.in')
pic.edge('X.in1', 'A.out')
```

The arity split is in the TYPE, not just at runtime: `gates.not()`
returns a `UnaryGate`, which has `in`/`out` and no `in1`, so reaching
for the wrong arity's port fails at the call site rather than as an
`AnchorError` when the picture renders. The port names are exported as
constants and unions for annotating your own values:

```ts
import { BINARY_GATE_PORTS, type BinaryGatePort } from '@ozan.e/jikz'

const feed: BinaryGatePort = 'in1'   // 'in' would not compile
pic.edge(`A.${feed}`, 'N.in')
```

## Variants and sizing

`variant: 'iec'` swaps the distinctive body for the IEC rectangle;
pass `text` for the symbol inside it (`&`, `≥1`, `=1`, `1`). Gates have
intrinsic sizes and opt out of text auto-sizing, so a long label never
stretches the body — set `width`/`height` to resize one.

## Wiring them up

Gate ports are anchors, so `edge()` connects them; for schematics,
`ext/circuits`' `wire()` draws the orthogonal runs with the arrowheads
off, and `junctionDot()` marks a tap. See the
[half-adder example](../cookbook/#logic-gates-ext-gates).

```ts
import { junctionDot, wire } from '@ozan.e/jikz'

wire(pic, ['a', point(40, 57.5), 'X.in1'])
pic.fill(junctionDot(point(40, 57.5)))
```

See also: [ext/circuits](./ext-circuits.md) for the analogue symbol
library these share their port machinery with.
