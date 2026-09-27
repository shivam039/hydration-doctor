# Adversarial Review — Release 0.8.0

## Scope

Reviewed the report v1 JSON Schema against actual scanner output and consumer compatibility expectations.

## Findings and fixes

| Finding                                                                                                                                                           | Severity | Fix                                                                                                                                |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| A strict closed-world schema would reject legitimate additive report fields and make documented schema-v1 evolution impossible.                                   | Medium   | All extensible report objects allow additional properties; the contract test adds a future field and confirms validation succeeds. |
| Requiring fields present only on successful scenarios would reject valid timeout/error results, which omit HTTP status and capture evidence.                      | Medium   | The schema requires only fields emitted on both normal and caught-failure result paths; optional evidence stays optional.          |
| A schema that accepts any version could cause a consumer to parse incompatible future reports as v1.                                                              | Medium   | `schemaVersion` is constrained to the constant `1`; a regression test rejects version 2.                                           |
| Ajv strict mode rejected required event-counter fields that were not explicitly declared in `properties`, even though generic additional properties allowed them. | Low      | Declared each known counter and its non-negative integer bound; strict schema compilation and real-report validation now pass.     |

## Residual limits

The schema intentionally does not freeze diagnostic prose or every nested evidence shape. It checks structural compatibility and is not a privacy redaction mechanism. Consumers must still treat report content as application data.

## Verification

An Ajv Draft 2020-12 test validates a real Chromium scan report, accepts additive v1 fields, and rejects missing required fields and unsupported versions. Full project and packed-consumer checks are recorded in issue #30.
