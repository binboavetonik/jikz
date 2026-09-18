# Reference: ext/spy

Magnifying-glass insets — jikz's `\usetikzlibrary{spy}`. Full API:
<a href="../api/index.html" target="_blank">generated reference</a>.

```ts
import { spy } from '@ozan.e/jikz/spy'

// … draw the picture …
spy(pic, { on: point(96, 78), in: point(300, 100), magnification: 4, size: 110 })
```

| TikZ | jikz |
|---|---|
| `\spy [circle, size=2cm, magnification=3] on (p) in node at (q)` | `spy(pic, { on: p, in: q, size, magnification, shape: 'circle' })` |
| `spy using outlines` | the region and lens outlines (`onStyle`, `inStyle`; TikZ's `very thin` / `thick`) |
| `connect spies` | `connect` (default true), `connectionStyle` |
| `rectangle` | `shape: 'rectangle'` |

`spy()` snapshots the picture's items at the moment of the call and
replays them into a scope clipped to the lens and transformed to scale
about `on` onto `in` — so call it after the content it magnifies, as a
TikZ spy scope replays what was drawn inside it. The seam is
`ItemContainer.include()`, which replays items from another container
as they are.
Demo: [`examples/spy-magnifier.ts`](../../examples/spy-magnifier.ts).
