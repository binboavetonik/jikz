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
with no wire drawn between them.

## Annotations

What a schematic *means*, rather than what it contains — circuitikz's
`v=`, `i=` and `f=`:

```ts
import { voltage, current } from '@ozan.e/jikz'

voltage(pic, 'R1.in', 'R1.out', { label: '$u_R$' })   // across a component
current(pic, 'V1.out', 'R1.in', { label: '$i_1$' })   // through a wire
voltage(pic, a, b, { label: '$u$', curly: true })     // across an open pair
```

Both take two endpoints — a `"name.port"` spec or a point — and a
frame is built from them: a direction along the span, and a normal to
one side of it.

| option | circuitikz | meaning |
|---|---|---|
| `side` | `v^` / `v_` | `left` (default) or `right` **of travel**, so reversing the endpoints flips it |
| `sense` | `v>` / `v<` | `forward` (default) or `reverse` arrow |
| `distance` | `voltage shift` | perpendicular offset; `current` sits on the wire at 0, and a non-zero value is circuitikz's `f=` |
| `curly` | curly voltages | a brace instead of an arrow |
| `inset` | — | shortens a voltage mark at both ends so it clears the terminals |
| `pos`, `length` | — | where a current arrow sits along the span, and how long |

`voltage` spans the interval; `current` marks a direction with a short
arrow at `pos`. Both take a `label` (KaTeX math included) and a
`style` that paints the mark and its text together.

These are functions over two points rather than keys on a component,
which is why the open pair above needs no placeholder: there is
nothing to attach to, and nothing that needs attaching to. Full schematics:
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
