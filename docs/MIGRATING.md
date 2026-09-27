# Migration guidance

Hydration Doctor is experimental pre-1.0 software. Breaking changes may occur between any 0.x versions, and there is no migration guarantee or supported automated migration path.

Before upgrading, compare the destination version's README, `CHANGELOG.md`, and release PRD. Revalidate your config with `hydration-doctor scan`, review any report-consumer assumptions, and rerun your project's own fixture scans. Keep a copy of the previous package version and config while evaluating an upgrade.

The `schemaVersion: 1` report schema describes the current report structure. It is not a promise that config, diagnostic wording, CLI details, or schema details stay compatible across 0.x releases. A future 1.0 policy will define compatibility and migration support before stable publication.

Repository version numbers and roadmap PRs do not mean that a version is available from npm. Check the npm registry and GitHub Releases for actual published versions.
