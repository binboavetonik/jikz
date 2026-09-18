# Reference: ext/dataviz

The data-visualization extension — jikz's
`\usetikzlibrary{datavisualization}`. Scaled axes with nice ticks and
gridlines, a legend, and line/scatter/bar series builders. Ships in
the package; nothing to register — it is pure drawing on the public
container verbs, so it composes with any shape set. Full API:
<a href="../api/index.html" target="_blank">generated reference</a> (`npm run docs:api`).

## Setup

```ts
import { picture, point } from '@ozan.e/jikz'
import { chart, axes, legend } from '@ozan.e/jikz/dataviz'

const pic = picture()
```

Two levels, like TikZ's: `chart()` infers and draws everything;
`axes()` + `legend()` are the pieces for layouts the builder doesn't
anticipate.

## The one-call builder

```ts
chart(pic, {
  at: point(50, 230), width: 320, height: 180,
  x: { label: 'n', ticks: 5 },
  y: { label: 'ms', grid: true },
  series: [
    { data: [[1, 4], [2, 9], [3, 15]], label: 'measured',
      style: { stroke: '#2563eb' }, marks: 'o' },
    { data: [[1, 5], [2, 8], [3, 14]], label: 'predicted',
      style: { stroke: '#dc2626', dash: 'dashed' }, smooth: true },
  ],
  legend: true,
})
```

Domains default to `'auto'` — the data extent of all series, widened
to nice tick boundaries (bar series pin the y baseline at 0). Pass
`[min, max]` per axis to pin the range.

Labeled series collect into a legend. `legend: true` frames it and
auto-places it in whichever inside corner of the plot area holds the
fewest series samples — on a rising line that is the north-west, not
the conventional north-east, which is where the data is. Override with
`legend: { at: point(…) }`, and drop the box with `legend: { frame:
false }`.

## The pieces: axes() and the ChartFrame

`axes()` draws gridlines, axes, ticks and labels, and returns a
`ChartFrame` — the two scales (data → picture coords) plus series
builders, so custom drawing stays in data space:

```ts
const frame = axes(pic, {
  at: point(50, 220), width: 360, height: 180,
  x: { domain: [0.5, 4.5], exact: true, tickValues: [1, 2, 3, 4],
       format: (v) => `Q${v}` },
  y: { domain: [0, 80], grid: true },
})

frame.line(series, { style: { stroke: '#2563eb' }, marks: 'o' })
frame.scatter(samples, { marks: { name: 'cross', size: 6 } })
frame.bars([[1, 42], [2, 58]], { style: { fill: '#f59e0b', stroke: 'none' } })

// the frame's scales are yours too — a goal line that can't drift
// from the grid:
pic.draw(line(frame.point(0, 50), frame.point(4.5, 50)), { style: { stroke: '#dc2626', dash: 'dashed' } })
```

| AxisOptions | meaning |
|---|---|
| `domain: [min, max]` | data range; widened to nice steps unless `exact` |
| `ticks: n` | desired tick count (default 5; actual may differ by one or two) |
| `tickValues: [...]` | explicit ticks — categorical axes with `format` |
| `exact: true` | keep the domain verbatim; outlying ticks drop off |
| `label` | axis label (below x / above y) |
| `grid: true` | gridlines across the plot area |
| `format: (v) => string` | tick label formatter |
| `tickLabels: false` | ticks without labels |

Flat domains (`tickValues: [5]`, `domain: [3, 3]`) widen by ±0.5
instead of throwing; non-finite data points are skipped, never drawn
(the `Plot` convention).

## Legends standalone

```ts
legend(pic, {
  at: point(300, 30),
  entries: [
    { label: '2025', style: { stroke: '#2563eb' }, mark: 'o' },
    { label: '2026', style: AMBER, sample: 'box' },   // bar series
  ],
  frame: true,                       // or a StyleSpec merged over the default
})
```

Swatches are `line` (default) or `box`; `mark` adds a plot mark at the
sample's midpoint. `legendSize(options)` returns the box a legend will
occupy — how `chart()` places its default legend.

## Under the hood

Ticks come from Heckbert's "nice numbers" (`niceTicks`/`niceNumber` in
`scale.ts` — 1/2/5×10ⁿ steps, float-noise-free). Marks reuse
`PlotMark`; smoothing reuses `Plot`'s Catmull-Rom; legend sizing
reuses `estimateLabelSize`; series colors resolve through
`resolveStyle`, so named styles and presets work in series `style`.
Nothing here registers shapes — dataviz is the proof that a
TikZ-library-sized feature fits on the public container verbs alone.
