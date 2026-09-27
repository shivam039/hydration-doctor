# Adversarial Review — Release 0.9.0

## Scope

Reviewed JUnit XML serialization, untrusted report fields, reporter status mapping, and CLI output-file behavior.

## Findings and fixes

| Finding                                                                                                       | Severity | Fix                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| XML markup in scenario names or findings could break document structure or inject attributes/elements.        | High     | Escape all five XML metacharacters in attributes and element text; regression tests use markup-shaped input.                                        |
| XML 1.0 forbids several control characters and unpaired surrogates that may appear in application error text. | Medium   | Remove code points outside XML 1.0's allowed character ranges before escaping.                                                                      |
| Direct use of the formatter could receive unsanitized URLs or secret-bearing route/findings values.           | Medium   | Sanitize URLs and pass emitted text through the shared secret redactor; tests verify credentials, token query values, and password text are absent. |
| An overall inconclusive report could appear as an empty passing suite in CI.                                  | Medium   | Map every case in an inconclusive scan to `<skipped>` and keep failure count zero.                                                                  |

## Residual limits

The reporter uses the common JUnit XML subset and omits timing because scan results do not currently contain per-scenario durations. Application text may still contain private information that does not match known secret patterns; treat reports as sensitive.

## Verification

Reporter unit tests cover hostile markup, illegal XML characters, secret redaction, and inconclusive mapping. The CLI test writes XML in a multi-reporter directory and checks owner-only permissions. Full checks and CI evidence are linked from issue #31.
