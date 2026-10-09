# Adversarial review — 0.32.0 release record consistency

## Findings and mitigations

- **A similarly prefixed version matches the wrong heading:** The checker matches the full semantic version, not a substring, and requires exactly one matching heading.
- **An unreleased roadmap entry is mistaken for an npm release:** Only a dated `Published` entry can satisfy the current package version; roadmap entries remain explicitly unreleased.
- **A changelog claim exists without release planning evidence:** The checker also requires the exact versioned PRD path.
- **Malformed or absent package metadata or publication dates crash with an opaque parser trace or pass silently:** JSON/version errors and impossible calendar dates are reported as bounded actionable failures.
- **An empty or corrupt PRD file is treated as valid content:** This check confirms file presence only; it does not validate PRD semantics or publication provenance.
- **The check is bypassed by the trusted-publisher workflow:** The release workflow invokes the same command before packing or publishing.

## Residual limitations

The verifier does not query npm, validate Git tags, confirm provenance, or prove that a release was actually published. Registry integrity and trusted-publisher checks remain separate release-pipeline responsibilities.
