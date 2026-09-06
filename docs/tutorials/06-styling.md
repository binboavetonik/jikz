# Tutorial 6: Styling

In which `style` learns TikZ's vocabulary: dash names, fill patterns,
line widths as constants, gradients, shadows, and double lines.

## The shape of a style

Every verb takes `RenderOptions` with a `style` key — a plain object
mapping to SVG presentation attributes, plus jikz/TikZ extensions:

```ts
pic.draw(g, {
  style: {
    stroke: '#2563eb',
    strokeWidth: 2,
    fill: '#dbeafe',
    'fill-opacity': 0.3,
  },
})
```

Styles **override the path-mode baseline**: `draw` strokes only unless
you add a `fill`; `filldraw` does both.

## Line widths as constants

TikZ's `[thick, red]` option list becomes a **typed array** — later
entries win:

```ts
import { thick } from 'jikz'

const edgeStyle = [thick, { stroke: '#111827' }]

pic.edge('input', 'transform', { arrowEnd: 'stealth' }, { style: edgeStyle })
```

## The dash vocabulary

The full TikZ set, as names — not dash-array arithmetic:

```ts
dash: 'dashed' | 'dotted' | 'dashdotted'
    | 'densely dashed'  | 'loosely dashed'
    | 'densely dotted'  | 'loosely dotted'
```

The names are typed (`DashPatternName`), so they autocomplete and a
typo is a compile error. See
[`examples/dash-patterns.ts`](../../examples/dash-patterns.ts).

## Fill patterns

All 12 TikZ patterns — hatching, grids, dots, bricks, checkerboard,
stars:

```ts
pic.filldraw(rect(x, y, 120, 70), {
  style: { stroke: '#334155', fillPattern: 'north east lines' },
})
```

Also: `'crosshatch'`, `'grid'`, `'dots'`, `'bricks'`,
`'checkerboard'`, and the rest —
[`examples/fill-patterns.ts`](../../examples/fill-patterns.ts).

## Gradients, shadows, double lines

```ts
// linear gradient at an angle
gradient: {
  type: 'linear',
  angle: 45,
  stops: [
    { offset: 0, color: '#0ea5e9' },
    { offset: 1, color: '#a855f7' },
  ],
}

// TikZ drop shadow
dropShadow: { blur: 4, offsetX: 3, offsetY: 3, color: '#000' }

// TikZ [double]
doubleLine: { spacing: 5 }
```

All of it flows through the **string pipeline** — gradients and
patterns compile to `<defs>` entries in the SVG string. No DOM
dependency, so SSR output includes them verbatim.
[`examples/styling.ts`](../../examples/styling.ts).

## Text styling

Nodes and labels take a parallel `textStyle` (and labels take
`options.fontSize` / `options.style`):

```ts
pic.node('A', { ..., text: 'CLOSED' }, {
  style: { stroke: '#334155', fill: '#f1f5f9' },
  textStyle: { fontSize: 11, fontWeight: 'bold' },
})
```

## What to notice

- **Quoted keys are SVG attributes**: `'fill-opacity'` maps to
  `fill-opacity`. Unquoted conveniences (`strokeWidth`) are the
  camelCase friends.
- **User style wins over mode baseline** — `fill` on a `draw` verb is
  honored; you're overriding, not fighting defaults.
- **Compose by array**: `[thick, myBrand, { dash: 'dashed' }]` reads
  like TikZ's option list because it *is* one, as data.

Next: [Layouts](./07-layouts.md) — when even relative placement is
too much placement.
