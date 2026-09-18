# Reference: ext/angles

Angle marks — jikz's `\usetikzlibrary{angles}`. Full API:
<a href="../api/index.html" target="_blank">generated reference</a>.

```ts
import { angle, rightAngle } from '@ozan.e/jikz/angles'

pic.filldraw(angle(A, O, B, { label: '$\\alpha$' }), { style: { stroke: '#2563eb', fill: '#dbeafe' } })
pic.draw(angle(B, O, C, { radius: 30 }))                 // arc only — TikZ [draw]
pic.fill(rightAngle(A, O, D))                              // square marker, wedge only
```

| TikZ | jikz |
|---|---|
| `\pic {angle = A--B--C}` | `angle(A, B, C)` — swept counter-clockwise on the page from `B→A` to `B→C` |
| `\pic {right angle = A--B--C}` | `rightAngle(A, B, C)` |
| `[draw]`, `[fill]`, `[draw, fill]` (pic actions) | `pic.draw(…)`, `pic.fill(…)`, `pic.filldraw(…)` — the arc takes the stroke, the wedge the fill |
| `angle radius=5mm` | `radius` (px; default `ANGLE_RADIUS` = 5 mm) |
| `angle eccentricity=.6` | `eccentricity` (default 0.6; label sits at `eccentricity × radius` on the bisector) |
| `"$\alpha$"` | `label`, styled by `labelStyle` (a `TextStyle`) |

An `AngleMark` is a `Paintable`: one value, two paints and a label. It
maps into a `frame: 'math'` picture and takes part in `{ fit: true }`.
`degrees`, `startAngle`, `endAngle`, `bisector`, `sectorPath()`,
`arcPath()` and `labelPoint()` expose the geometry.
Demo: [`examples/angle-marking.ts`](../../examples/angle-marking.ts).
