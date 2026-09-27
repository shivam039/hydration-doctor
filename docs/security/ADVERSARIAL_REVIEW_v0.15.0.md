# Adversarial review — 0.15.0 SARIF output

Reviewed SARIF shape, source URI construction, untrusted report fields, rule identifiers, output encoding, and whether candidate evidence could expose source values.

## Findings and fixes

- **Caller-supplied paths could escape the source root or become external links.** Locations accept only non-empty relative slash-separated paths with no empty, `.` or `..` segment, backslash, drive prefix, or NUL. Valid path segments are URI-encoded; malformed Unicode omits the location instead of failing report generation.
- **Caller-supplied text could inject content or disclose secrets.** SARIF messages and rule descriptions come from a fixed allowlist. Unknown rules map to a generic rule. Source evidence, explanations, and parser messages are omitted; the report contains no source excerpt.
- **Parse errors could be misrepresented as runtime defects.** They use a distinct `source-parse-error` rule and warning level. Candidate findings map to SARIF `note` unless explicitly marked warning/error.
- **Rule IDs or array ordering could vary from user input.** Known rules have stable IDs; unrecognized values use one stable fallback. The tool rule list is sorted while result order follows analyzer output.

## Residual limits

SARIF consumers may surface advisory candidates alongside confirmed findings, so rule IDs and messages state that they are candidates. The formatter does not resolve file URIs to the repository root and intentionally drops unsafe locations. SARIF schema compliance is checked structurally in repository tests; no external network validator is required during CI.

## Verification

Reporter tests cover the 2.1.0 schema/version fields, rule mapping, note/warning levels, URI encoding, traversal omission, malformed Unicode, and omission of hostile source evidence. A representative report also passed validation against the official OASIS SARIF 2.1.0 schema. CLI tests cover SARIF selection and invalid formats. Full checks, consumer smoke, and CI evidence are recorded in issue #37 and the release PR.
