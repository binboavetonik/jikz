# Contributing to jikz

Thanks for your interest. This page covers the practical side: getting a
working checkout, the checks a change must pass, and the conventions
that keep the library coherent. Design questions are best raised as an
issue first.

## Setup

```sh
git clone git@bitbucket.org:binboavetonik/jikz.git
cd jikz
nvm use          # Node 24 (see .nvmrc); anything >= 18 works
npm ci
npm test         # 2000+ unit, snapshot and example tests, ~4 s
```

Useful scripts:

| Script | What it does |
|---|---|
| `npm run dev` | Demo page (`:5173/demo/`) and docs site (`:5174`) together, live against `src/` |
| `npm test` / `npm run test:watch` | Vitest, once or in watch mode |
| `npm run lint` | ESLint (correctness rules only; see below) |
| `npm run build` | `tsc` typecheck of `src/` + `examples/`, Vite library build, declaration post-processing |
| `npm run check:pkg` | publint + arethetypeswrong against the packed tarball |
| `npm run docs:cookbook` | Regenerate `docs/cookbook/` from `examples/manifest.ts` |
| `npm run docs:build` | Build the VitePress site |

CI (`bitbucket-pipelines.yml`) runs lint, build, test, `check:pkg` and
the docs build on every push, and repeats build + test on Node 18.

## Layout

```
src/
  core/       Point, Transform, anchors, shared types
  geometry/   Shapes and intersections; complex/ holds the node shapes
  node/       Node, Edge, relative positioning
  path/       Path builder, operations, decorations, SVG path parsing
  picture/    Picture (the primary API), Pen, scopes
  render/     SVGRenderer, SVGBuilder, styles, patterns, arrow tips, pan/zoom
  layout/     chain, matrix, tree, layered, graph
  text/       Text measurement and label placement
  ext/        Opt-in vocabularies (circuits, gates) on the public seams
test/         Mirrors src/ one-to-one
examples/     One self-contained module per gallery card, registered in manifest.ts
docs/         Concepts, tutorials, reference, generated cookbook
```

## Conventions

- **Coordinates are SVG screen space.** Units are pixels, y grows
  downward, angles are clockwise with 0° east and 270° north. Every
  geometric change must respect this; see
  `docs/concepts/coordinate-system.md` before porting math-convention
  code.
- **Style.** Two-space indent, no semicolons, single quotes, trailing
  commas in multi-line literals. `.editorconfig` covers the basics;
  there is deliberately no formatter, so match the surrounding code.
- **Types.** `tsc --strict` with `noUncheckedIndexedAccess` and
  `noUnusedLocals`. No `any` in `src/`. Public symbols get a JSDoc
  comment that says what the thing is *for*, not just what it does.
- **No import-time side effects in `src/`.** The package declares
  `sideEffects: false`. Registries fill their built-ins on first use
  (`ensureBuiltins()`); follow that pattern rather than calling
  `registerX(...)` at module scope. `test/build/tree-shaking.test.ts`
  will fail if this regresses.
- **Extensions** live under `src/ext/` and register explicitly
  (`registerCircuits()`, `registerGates()`). Shape names are added to
  the `ShapeRegistry` interface by module augmentation so they
  typecheck.
- **Published declarations.** The build post-processes `dist/**/*.d.ts`
  (`scripts/postbuild-dts.mjs`). Keep `rollupTypes` off in
  `vite.config.ts`; the augmentation above depends on per-file output.

## Tests

- Add or extend a test in the mirrored location under `test/`.
- Rendering changes usually move snapshots. Inspect the diff, then
  `npx vitest run -u` to accept it. A snapshot change with no
  explanation in the PR is a review blocker.
- Every module in `examples/` is type-checked and snapshot-tested. If
  you add an example, register it in `examples/manifest.ts` (wrap any
  HTML or SVG element names in the description in backticks; the
  cookbook generator rejects raw `<tags>`), then run
  `npm run docs:cookbook` and commit the regenerated page and thumbnail.

## Changelog

`CHANGELOG.md` has an *Unreleased* section with *Added*, *Changed* and
*Fixed* headings. Add an entry for anything a user of the package could
notice, and say *why* as well as what. Do not bump the version in a
feature PR; releases are cut separately.

## Pull requests

- One topic per PR. Refactors and behaviour changes go in separate
  commits so the snapshot diff is attributable.
- Run `npm run lint && npm run build && npm test` locally; CI runs the
  same plus `check:pkg` and the docs build.
- Reference the issue, if there is one, and include a rendered SVG or a
  screenshot for anything visual.

## Reporting bugs

Open an issue with the smallest `picture()` or geometry snippet that
reproduces it, the SVG you got, and what you expected. For security
issues, see [SECURITY.md](SECURITY.md) instead of opening an issue.
