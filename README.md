# FlatPPL theme

Shared visual theme for the FlatPPL website, specification, and playground.

The [example site](https://flatppl.org/flatppl-theme/) shows the current
shell, theme switch, syntax colours, and shared components.

This repository owns the design tokens, product header and footer, shared web
components, theme script, and brand assets. Consumer builds provision a pinned
release bundle at build time, or a sibling checkout of this repository during
development. They keep their host adapters and page layouts locally.

Do not load this theme from a CDN or use this repository as a submodule. Each
consumer build must remain self-contained and reproducible: a release build
takes the bundle from a pinned release tag and holds it to the bundle's own
manifest.

## Files

- `tokens.css` defines the shared light and dark values.
- `syntax-map.json` maps grammar scopes and host classes to syntax tokens.
- `components.css` defines shared controls and prose components.
- `header.html` and `footer.html` define the product shell fragments.
- `shell.css` and `shell.js` style and operate the product shell.
- `assets/` contains the brand mark, wordmark, original art, and favicon set.
- `scripts/` builds and verifies the release bundle.

Host adapters must set `data-fp-active="site|spec|play|docs"` on the root
element. `shell.js` then adds `aria-current="page"` to the active product link.
Load `shell.js` synchronously in the document head to apply the saved theme
before rendering.

## Development

```sh
bun install --frozen-lockfile
bun test
bun run check
bun run preview
```

Open `http://localhost:8002/preview/` for the shell preview.

`bun run build` writes `dist/manifest.json` with the source commit and a
SHA-256 digest for every bundled file. `scripts/verify-bundle.ts` checks
release candidates in this repository.

Tags matching `v*` create a release archive after the full check passes. Do not
create a tag until every consumer accepts the bundle candidate.

## How consumers take the theme

Each consumer build (flatppl.github.io, flatppl-design, flatppl-js) resolves
the theme the same way, into a git-ignored `vendor/flatppl-theme/`:

1. A checkout of this repository, when one is available: `FLATPPL_THEME_DIR`,
   else a sibling `../flatppl-theme` next to the consumer repository. The
   source files are copied as they are, unverified, and the build says so.
   This is the development loop: edit `tokens.css` here, rebuild the
   consumer, see the change. `FLATPPL_THEME_NO_SIBLING=1` skips this step.
2. Otherwise the release archive of the consumer's pinned tag
   (`FLATPPL_THEME_REF` overrides it for a candidate), downloaded from the
   GitHub release and verified against the bundle's own `manifest.json`.
   This is the path CI and release builds take.

Adopting a release in a consumer is a one-line change of its pinned tag.

## Licensing

Code, CSS, JavaScript, and HTML templates use the MIT License. FlatPPL brand
assets use the Creative Commons Attribution 4.0 International License. See
[`LICENSE.md`](LICENSE.md) for the file-level rules.
