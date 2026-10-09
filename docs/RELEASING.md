# Release process

Hydration Doctor is experimental and pre-1.0. Breaking changes can occur between 0.x versions without migration guarantees. A version bump, changelog entry, merged PR, CI pass, or package dry-run does not publish a release.

## One-time npm trusted publisher setup

After the package exists on npm, configure its trusted publisher to match this repository:

- Provider: GitHub Actions
- Owner: `shivam039`
- Repository: `hydration-doctor`
- Workflow filename: `publish.yml`
- Environment: none
- Allow direct `npm publish` for this publisher

The workflow uses a GitHub-hosted runner, npm OIDC (`id-token: write`), Node.js 24, and npm 11.15.0. npm automatically creates provenance attestations for trusted GitHub Actions publishes from this public repository. It does not use an npm token. Keep the trusted-publisher workflow filename aligned with npm's package settings.

The initial 0.27.0 package was bootstrapped from an authenticated maintainer session because npm requires a package to exist before its trusted-publisher relationship can be configured. It has no GitHub Actions provenance attestation. The 0.32.0 trusted publisher uses the GitHub Actions `publish.yml` workflow and was validated by its first successful OIDC publication.

## Each release

1. Choose the next 0.x semver version and update `package.json`, `package-lock.json`, the matching PRD, and a dated `Release candidate` changelog heading together. Add cumulative release notes and ensure the README disclaimer and support matrix are accurate.
2. Run `npm run check`, `npm pack --dry-run`, and `npm run test:consumer` from a clean checkout. Review the packed file list.
3. Confirm the full supported CI matrix passes and the npm trusted publisher is configured for `.github/workflows/publish.yml`.
4. Merge the release candidate into `main`, finalize the changelog, PRD, and readiness status for publication, then create and push the matching `v<version>` tag. The trusted publishing workflow verifies the tag/package version, reruns checks and consumer installation, then publishes to npm with provenance.
5. Verify the exact registry version and provenance on npm, then create a GitHub Release for the same tag.

Do not publish from pull-request workflows. The general CI workflow has read-only repository permissions and performs package dry-run and consumer installation only. The npm publishing workflow runs only for version tags in this repository and receives OIDC permissions only in its publish job.
