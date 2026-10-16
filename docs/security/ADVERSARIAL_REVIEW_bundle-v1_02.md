# Adversarial review — bundle/v1 iteration 02

**Scope:** runtime dependency profile and lazy CLI module loading.  
**Tracking:** [issue #85](https://github.com/shivam039/hydration-doctor/issues/85).  
**Review status:** implementation reviewed; CI evidence pending.

## Findings

- Clean consumer install currently occupies 48,248 KiB on the measured macOS filesystem. Playwright and `playwright-core` are required by core browser scanning; TypeScript parsing plus ESTree is required by the advertised TS analyzer. Removing these dependencies would reduce capabilities, so this iteration does not change dependency declarations.
- Before the change, the CLI statically loaded the browser engine, config, every reporter, and both AST parsers for `--help`, `--version`, and `init`. That needlessly increased common startup time and loaded optional analysis code into simple command paths.
- CLI imports are now deferred to the commands that use them. A 15-process Node 24 benchmark changed `--help` median from 247.0 ms to 20.9 ms and `--version` from 247.5 ms to 21.0 ms. This is a local startup measurement, not a cross-platform performance guarantee.
- Static module-loading changes risk moving an import/setup error from startup into the selected command. That is expected and remains caught by CLI tests for `scan`, `doctor`, `analyze`, `--help`, and `--version`.
- No public exports, report formats, dependency versions, or runtime scan behavior were changed. Dynamic imports are only selected after command and option validation.

## Residual risks

- This optimization does not reduce installed disk usage, tarball size, Playwright browser download size, or startup time for `scan` and `doctor`.
- Benchmarks are sensitive to host load and warm filesystem cache. The script reports median and p90 over fresh processes; CI should not enforce a wall-clock threshold.
- The clean install size depends on platform allocation and must not be represented as exact download size.

Verification: the focused scan/CLI suite passed 30 tests; `npm run check` passed with 90 tests; `npm run size:check` passed at 88,890 packed bytes / 313,060 unpacked bytes / 98 files; `npm run profile:startup` measured 20.1 ms `--help` and 23.4 ms `--version` medians; `npm run test:consumer` installed the tarball and completed a browser scan. CI evidence is pending PR. No dependency-removal or API-compatibility finding identified.
