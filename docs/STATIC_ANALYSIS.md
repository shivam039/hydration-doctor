# Optional static analysis

Run `npx hydration-doctor analyze --source ./src` to inspect JavaScript and JSX source without starting the application. Use `--output report.json` to write an owner-only JSON file; existing output files are not overwritten. Findings are also available through the public `analyzeStaticSources(directory)` API.

The analyzer currently reports these candidates:

- Browser-global member access rooted at `window`, `document`, `navigator`, `localStorage`, or `sessionStorage`.
- Calls/references to `Date.now` or `Math.random`.
- Zero-argument `new Date()` construction.
- `Intl.DateTimeFormat` and calls to `toLocaleString`, `toLocaleDateString`, or `toLocaleTimeString`.
- References rooted at `process.env`.

Each finding includes a relative file path and one-based line/column. Parser failures are reported separately and skipped. The default exclusions are `.git`, `.next`, `build`, `coverage`, `dist`, and `node_modules`; symbolic links are skipped. Analysis is bounded to 500 files and 1 MiB per file.

These rules are intentionally candidates. The analyzer does not prove that an expression runs during render, that server and browser values differ, or that a runtime hydration problem exists. It does not report fabricated source locations, rewrite files, or classify candidates as scan failures. Use runtime browser evidence to confirm impact. TypeScript syntax, invalid nesting, suppression comments, and custom exclusion globs are not supported yet.
