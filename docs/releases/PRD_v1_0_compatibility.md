# PRD: Hydration Doctor 1.0 readiness — compatibility evidence

**Status:** Planned  
**GitHub issue:** [#87](https://github.com/shivam039/hydration-doctor/issues/87)

## Goal

Turn the existing experimental support statements into an evidence-backed compatibility policy before any stable release decision.

## Acceptance

- Select minimum supported Node, React, and Next.js ranges from actual CI/fixture capacity.
- Expand production App Router navigation evidence and Pages Router depth, including documented unsupported routing/RSC patterns.
- Expand browser and visual viewport/device-emulation checks; label emulation separately from physical-device support.
- Add representative fixture evidence for streaming, state races, slow CPU/network, and auth behavior without live identity-provider credentials.
- Update support matrix and release readiness only with CI-linked evidence; retain explicit unsupported cases.

## Adversarial review

Check that matrix claims match exact versions and engines; smoke coverage is not presented as compatibility; tests do not rely on arbitrary sleeps; emulation is not called physical-device validation; and failures are reproducible.

## Verification

Run pinned production framework fixtures and the supported Node/browser matrix, then review all docs against the generated CI evidence.
