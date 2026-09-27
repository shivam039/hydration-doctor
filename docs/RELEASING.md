# Release process

Hydration Doctor remains experimental and pre-1.0. A version bump, changelog entry, merged PR, CI pass, or package dry-run does not publish a release.

Before proposing a package release:

1. Choose the next 0.x semver version and update `package.json`, `package-lock.json`, and `CHANGELOG.md` together.
2. Run `npm run check`, `npm pack --dry-run`, and `npm run test:consumer` from a clean checkout. Review the packed file list and README disclaimer.
3. Confirm the full supported CI matrix passes and the README, compatibility matrix, API docs, and migration notes match verified behavior.
4. Have a human explicitly authorize publication. Only then use the documented protected release process and least-privilege credentials.
5. After publication succeeds, verify the exact registry version and update `CHANGELOG.md` from Unreleased to Published with the registry link and date.

Do not publish from pull-request workflows. The current CI workflow has read-only repository permissions and performs package dry-run and consumer installation only.
