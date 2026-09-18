# Reference: ext/projection

3D → 2D projection — jikz's `\usetikzlibrary{3d}` and tikz-3dplot's
`\tdplotsetmaincoords`. Full API:
<a href="../api/index.html" target="_blank">generated reference</a>.

```ts
import { tdplot, projection } from '@ozan.e/jikz/projection'

const P = tdplot(70, 110, 40)                // \tdplotsetmaincoords{70}{110}, 40 px per unit
pic.pen().moveTo(P.point(0, 0, 0)).lineTo(P.point(1, 0, 0)).lineTo(P.point(1, 1, 0)).close()
const { x, y, z } = P.axes(2)                // three Lines from the origin
```

| TikZ | jikz |
|---|---|
| `\tdplotsetmaincoords{θ}{φ}` | `tdplot(θ, φ, unit)` — `x → (cos φ, −sin φ cos θ)`, `y → (sin φ, cos φ cos θ)`, `z → (0, sin θ)` |
| `x={(…)}, y={(…)}, z={(…)}` | `projection({ x, y, z })` |
| `(x, y, z)` | `P.point(x, y, z)` / `P.point([x, y, z])` |
| a `frame: 'math'` picture | `frame: 'math'` on the projection returns y-up points |

TikZ's 3D is a projection and nothing more — no depth sorting, no
hidden surfaces. Order the drawing yourself, as TikZ does.
Demo: [`examples/projection-cube.ts`](../../examples/projection-cube.ts).
