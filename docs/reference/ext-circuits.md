# Reference: ext/circuits

The circuits extension — jikz's `\usetikzlibrary{circuits.ee}`. Ships
in the package; registers at runtime. Full API: [generated
reference](../api/) (`npm run docs:api`).

## Setup

```ts
import { circuitShapes, picture } from '@ozan.e/jikz'

const pic = picture({ shapes: circuitShapes })  // like \usetikzlibrary{circuits.ee}
```

Gives the picture the symbol names. The set itself types them, so a
module augmentation makes the names known to the IDE: `shape:
'resistor'` autocompletes, and `'resitor'` is a compile error.

## Symbols

| name | typed builder | ports | variants |
|---|---|---|---|
| resistor | `circuit.resistor()` | `in`, `out` | `ansi` (zigzag, default), `iec` (box) |
| capacitor | `circuit.capacitor()` | `in`, `out` | normal, `polarized` |
| inductor | `circuit.inductor()` | `in`, `out` | — |
| diode | `circuit.diode()` | `in`, `out` | normal, `zener`, `led` |
| switch | `circuit.switch()` | `in`, `out` | — |
| voltage source | `circuit.voltageSource()` | `in`, `out` | — |
| current source | `circuit.currentSource()` | `in`, `out` | — |
| ground | `circuit.ground()` | `in` | — |
| op amp | `circuit.opAmp()` | `in-` (`-`), `in+` (`+`), `out` | — |

Symbols have an **intrinsic size** and never stretch to fit text.
Orientation: `rotate: 90` for vertical branches. Place by a specific
terminal with `anchor` — `circuit.ground({ at: p, anchor: 'in' })`
puts the `in` port at `p` (TikZ `at + anchor=`).

## Two ways to reference

```ts
// Strings — TikZ-familiar, data-driven, checked at runtime:
pic.node('R1', { shape: 'resistor', at: p })
wire(pic, ['R1.out', 'D1.in'])   // typo'd port → AnchorError listing valid names

// Typed builders — compile-checked, autocomplete everything:
pic.node('R1', circuit.resistor({ at: p, variant: 'iec' }))

// Typed instances — ports as Points:
import { resistor, opAmp } from '@ozan.e/jikz'
const r1 = resistor({ center: p })
pic.node('R1', { shape: r1 })
wire(pic, [r1.out, u1.minus])    // port typos are compile errors
```

Both styles produce the same objects and mix freely — see
[`examples/circuit-typed-api.ts`](../../examples/circuit-typed-api.ts).

## Wiring

```ts
import { wire, junctionDot } from '@ozan.e/jikz'

wire(pic, ['V1.in', point(60, 60), 'R1.in'])  // chained endpoints, arrows off
pic.fill(junctionDot(point(220, 60)))         // connection dot
```

`wire()` accepts name.port strings, typed port `Point`s, and raw
points in one chain. Full schematics:
[RC filter](../../examples/circuit-rc-filter.ts),
[inverting amplifier](../../examples/circuit-opamp.ts).

## Under the hood

Symbols are built only on **public seams** — `defineShape`, port
anchors, `rotate` — so the extension doubles as the proof that jikz's
extensibility API is sufficient for a real TikZ-library-sized domain.
`CircuitSymbol` (in `ports.ts`) is the base class: a box with a port
table; unknown anchor names throw `AnchorError` instead of silently
mis-resolving.
