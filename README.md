# FlatPPL theme

Shared visual theme for the FlatPPL website, specification, and playground.

The [example site](https://flatppl.github.io/flatppl-theme/) shows the current
shell, theme switch, syntax colours, and shared components.

This repository owns the design tokens, product header and footer, shared web
components, theme script, and brand assets. Consumer repositories vendor pinned
release bundles. They keep their host adapters and page layouts locally.

Do not load this theme from a CDN or use this repository as a submodule. Each
consumer build must remain self-contained and reproducible.

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
SHA-256 digest for every bundled file. Consumers commit the complete `dist/`
tree under `vendor/flatppl-theme/` and verify its manifest in their own build
tool. `scripts/verify-bundle.ts` checks release candidates in this repository.

Tags matching `v*` create a release archive after the full check passes. Do not
create a tag until every consumer accepts the bundle candidate.

## Licensing

Code, CSS, JavaScript, and HTML templates use the MIT License. FlatPPL brand
assets use the Creative Commons Attribution 4.0 International License. See
[`LICENSE.md`](LICENSE.md) for the file-level rules.
