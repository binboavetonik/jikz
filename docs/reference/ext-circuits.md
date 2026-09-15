# Reference: ext/circuits

The circuits extension — jikz's `\usetikzlibrary{circuits.ee}`. Ships
in the package as a shape set you hand to `picture`; nothing registers. Full API: <a href="../api/index.html" target="_blank">generated reference</a> (`npm run docs:api`).

## Setup

```ts
import { circuitShapes, picture } from '@ozan.e/jikz'

const pic = picture({ shapes: circuitShapes })  // like \usetikzlibrary{circuits.ee}
```

Gives the picture the symbol names. The set itself types them: `shape:
'resistor'` autocompletes, `'resitor'` is a compile error, and
`{ ...allShapes, ...circuitShapes }` is how to keep the geometric
shapes alongside.

## Symbols

| name | typed builder | ports | variants |
|---|---|---|---|
| resistor | `circuit.resistor()` | `in`, `out` | `ansi` (zigzag, default), `iec` (box) |
| capacitor | `circuit.capacitor()` | `in`, `out` | normal, `polarized` |
| inductor | `circuit.inductor()` | `in`, `out` | — |
| diode | `circuit.diode()` | `in`, `out` | normal, `zener`, `schottky`, `led` |
| switch | `circuit.switch()` | `in`, `out` | — |
| voltage source | `circuit.voltageSource()` | `in`, `out` | — |
| current source | `circuit.currentSource()` | `in`, `out` | — |
| ground | `circuit.ground()` | `in` | — |
| op amp | `circuit.opAmp()` | `in-` (`-`), `in+` (`+`), `out` | — |
| battery | `circuit.battery()` | `in`, `out` | `multi` (two cells, default), `single` |
| bulb | `circuit.bulb()` | `in`, `out` | — |
| ac source | `circuit.acSource()` | `in`, `out` | — |
| dc source | `circuit.dcSource()` | `in`, `out` | — |
| ammeter | `circuit.ammeter()` | `in`, `out` | — |
| voltmeter | `circuit.voltmeter()` | `in`, `out` | — |
| ohmmeter | `circuit.ohmmeter()` | `in`, `out` | — |

The three meters are one symbol under three names, and the name fixes
the letter — `{ shape: 'voltmeter', shapeOptions: { variant: 'ammeter' } }`
still draws a V. The letter is stroked as part of the symbol rather
than set as node text, so it scales with `width`/`height` like the
rest of the drawing.

Symbols have an **intrinsic size** and never stretch to fit text.
Orientation: `rotate: 90` for vertical branches. Place by a specific
terminal with `anchor` — `circuit.ground({ at: p, anchor: 'in' })`
puts the `in` port at `p` (TikZ `at + anchor=`).

## Two ways to reference

```ts
// Strings — TikZ-familiar; the set types the name, ports are checked at runtime:
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
import { wire, junctionDot, openTerminal } from '@ozan.e/jikz'

wire(pic, ['V1.in', point(60, 60), 'R1.in'])  // chained endpoints, arrows off
pic.fill(junctionDot(point(220, 60)))         // ● wires meet here
pic.draw(openTerminal(point(300, 60)))        // ○ an accessible terminal
```

`wire()` accepts name.port strings, typed port `Point`s, and raw
points in one chain.

**Terminals.** `junctionDot` and `openTerminal` are circuitikz's two
poles, `*` and `o`. Both return a plain `Circle`; the verb you paint
it with is what tells them apart, on screen and on paper — `fill()`
for a connection, `draw()` for an open terminal.

There is no "open" symbol, and there should not be: circuitikz's
`to[open]` declares an *empty* drawing body and exists only to reserve
a box for a voltage annotation. An open pair in jikz is two terminals
with no wire drawn between them. Full schematics:
[RC filter](../../examples/circuit-rc-filter.ts),
[inverting amplifier](../../examples/circuit-opamp.ts).

## Under the hood

Symbols are built only on **public seams** — `defineShape`, port
anchors, `rotate` — so the extension doubles as the proof that jikz's
extensibility API is sufficient for a real TikZ-library-sized domain.
`PortedShape` (in `geometry/PortedShape`) is the base class: a box with
a port table; unknown anchor names throw `AnchorError` — naming the
ports the shape does answer to — instead of silently mis-resolving. It
lives in `geometry` rather than here because the logic gates use it too;
`ports.ts` keeps what is circuit-specific (`TwoTerminalSymbol`, the
port-name constants).
