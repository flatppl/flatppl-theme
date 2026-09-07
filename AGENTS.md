# Repository guide

Read `../flatppl-dev/CONVENTIONS.md` before non-trivial work when this checkout
has the normal FlatPPL sibling layout.

This repository owns shared visual code. Consumer repositories own their host
adapters, page templates, and deployment rules. Keep grammar scopes in
`flatppl-grammars`. Keep the scope-to-colour map here in `syntax-map.json`.

Treat the release bundle as the public interface. Add a failing behavior test
before changing the builder or verifier. Run `bun run check` before proposing a
commit. Inspect the shell preview at desktop and narrow widths before proposing
a release.

Do not commit `dist/`. Releases build it from the tagged source commit.
