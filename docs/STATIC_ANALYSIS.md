# Optional static analysis

Run `npx hydration-doctor analyze --source ./src` to inspect JavaScript, JSX, TypeScript, and TSX source without starting the application. Use `--output report.json` to write an owner-only JSON file; existing output files are not overwritten. Findings are also available through the public `analyzeStaticSources(directory)` API.

Use `--exclude 'src/generated/**,**/*.stories.tsx'` to skip matching source files. The API accepts the same patterns as `{ excludePatterns: [...] }`. Patterns are relative to the source root, use `/` separators, and support `*` for characters within one path segment, `**` for any number of path segments, and `?` for one character within a segment. Patterns are limited to 50 entries and 256 characters each. Absolute paths, `.`/`..` segments, backslashes, and bracket/brace syntax are rejected. Skipped source files increase `skipped.excluded` in the report. Defaults and filesystem traversal limits still apply.

The analyzer currently reports these candidates:

- Browser-global member access rooted at `window`, `document`, `navigator`, `localStorage`, or `sessionStorage`.
- `typeof` guards that check `window`, `document`, or `navigator`, since a server/client branch may render different output.
- Calls/references to `Date.now` or `Math.random`.
- Zero-argument `new Date()` construction.
- `Intl.DateTimeFormat` and calls to `toLocaleString`, `toLocaleDateString`, or `toLocaleTimeString`.
- References rooted at `process.env`.

Each finding includes a relative file path and one-based line/column. Parser failures are reported separately and skipped. The default exclusions are `.git`, `.next`, `build`, `coverage`, `dist`, and `node_modules`; symbolic links are skipped. Analysis is bounded to 500 files and 1 MiB per file.

Suppress one exact candidate rule on the same source line with `// hydration-doctor-ignore <rule-id>`, or on the following line with `// hydration-doctor-ignore-next-line <rule-id>`. Multiple exact rule IDs may be comma-separated. For example:

```js
// hydration-doctor-ignore-next-line browser-global-during-render-candidate
const browserWidth = window.innerWidth;
```

Only the documented candidate rule IDs are accepted. Wildcards, unknown rules, malformed directives, and attempts to suppress parse errors have no effect. The analyzer reports the number of findings suppressed as `suppressedFindings`; it does not include directive text in the report.

These rules are intentionally candidates. The analyzer does not prove that an expression runs during render, that server and browser values differ, or that a runtime hydration problem exists. It does not report fabricated source locations, rewrite files, or classify candidates as scan failures. Use runtime browser evidence to confirm impact. TypeScript parsing adds a runtime parser dependency and may report unsupported syntax as a parse error; parse errors are visible and the affected file is skipped. Invalid-nesting analysis is not supported yet.
