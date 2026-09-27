# Adversarial review — 0.23.0 experimental release hygiene

- **Version confusion:** `package.json` and the lockfile root both use 0.23.0 as a repository development version. README, API, readiness, and changelog explicitly say this does not mean the version was published.
- **False release history:** The changelog marks 0.23.0 as an unreleased roadmap increment and lists no published releases. Any registry history is checked separately before finalizing the record.
- **Consumer visibility:** The early adopter disclaimer is at the top of README and README plus CHANGELOG are included in the package file list.
- **Version-sensitive smoke tooling:** The first clean-consumer run exposed a hardcoded 0.1.0 tarball name. The script now reads the root package version and derives the packed filename; rerun the consumer scan against 0.23.0.
- **Accidental publication:** No publish script, tag, or release is created. The release guide requires explicit human authorization and the CI workflow is read-only with pack/consumer checks only.
- **Residual limit:** A disclaimer and semver alignment do not make the API stable or establish migration guarantees.
