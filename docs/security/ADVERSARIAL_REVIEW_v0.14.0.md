# Adversarial review — 0.14.0 source exclusions

Reviewed pattern parsing, path traversal, matching complexity, hidden files, cross-platform path normalization, skip accounting, and whether exclusions can weaken existing resource limits.

## Findings and fixes

- **Traversal patterns could name files outside the selected root.** Absolute paths, drive-prefixed paths, backslashes, `.`/`..` path segments, and empty path segments are rejected. Matching is only against a normalized relative file path.
- **User patterns could expand into unsafe or ambiguous glob syntax.** The accepted grammar is limited to `*`, `**` as a full path segment, and `?`. Bracket, brace, and negation forms are rejected. A maintained `minimatch` runtime dependency performs matching; options disable brace/extglob/negation and include dotfiles consistently.
- **Pattern input or count could be unbounded.** The API caps patterns at 50 and each at 256 characters. Existing 500-file, 500-directory, and per-file byte limits remain active.
- **Skipped code could be invisible to report consumers.** Matching source files increment `skipped.excluded`; files outside the source extension set do not affect that count.
- **Platform separators could change a match.** Candidate file paths are normalized to `/` before matching; patterns containing backslashes are rejected so the same configuration has one interpretation on every OS.

## Residual limits

An overly broad pattern can hide relevant candidates. Exclusions are opt-in and the report exposes a skipped count. Matching uses the documented subset rather than supporting every minimatch feature. Default generated/dependency directory exclusions still apply.

## Verification

Tests cover root and nested globstar matches, `*`, `?`, comma-separated CLI patterns, visible skipped counts, and rejection of absolute/traversal/backslash/bracket/oversized patterns. Full checks, consumer smoke, and CI evidence are recorded in issue #38 and its release PR.
