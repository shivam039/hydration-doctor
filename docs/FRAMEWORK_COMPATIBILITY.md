# Framework compatibility evidence

## Verified and unverified targets

The repository verifies the exact versions in the table below; this is a tested target, not a promise that every minor or major release is compatible.

| Area              | Verified                                                                                                            | Not yet verified                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| React and Next.js | React 18.3.1 with Next.js 15.5.26; App and Pages Router production `<Link>` navigation plus direct load and refresh | React 19, other Next.js release lines, Pages shallow routing, middleware/rewrites, and all RSC transition patterns |
| Browsers          | Chromium full suite; Chromium, Firefox, and WebKit targeted launch/navigation/assertion smoke                       | Full framework, streaming, visual baseline, and device matrix on Firefox/WebKit                                    |

The minimum verified target is React 18.3.1 and Next.js 15.5.26 because those are the pinned fixture versions. No broader minimum range is claimed.

Hydration Doctor's scanner is framework-independent: it checks the browser-visible document, configured selectors/text, navigation, runtime events, and snapshots. It does not inspect React or Next.js internals.

| Framework/runtime                 | Router                | Fixture routes                                                      | Verified behavior                                                                                                                                       |
| --------------------------------- | --------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| React 18.3.1                      | `hydrateRoot` fixture | `/react-healthy`, `/hydration-warning`                              | Healthy hydration remains clean; a known text mismatch warning is reported separately from generic console errors.                                      |
| Next.js 15.5.26 with React 18.3.1 | App Router            | `/app-router`                                                       | Real Next development server, direct load and refresh, main content assertion.                                                                          |
| Next.js 15.5.26 with React 18.3.1 | Pages Router          | `/pages-router`                                                     | Real Next development server, direct load and refresh, main content assertion.                                                                          |
| Next.js 15.5.26 with React 18.3.1 | Pages Router          | `/pages-router` → `/pages-router-destination`                       | Production `<Link>` transition reaches configured destination content without a document request; browser back/forward returns to expected URLs.        |
| Next.js 15.5.26 with React 18.3.1 | App and Pages Routers | `/app-router`, `/pages-router`                                      | Production build and server, direct load and refresh, main content assertions.                                                                          |
| Next.js 15.5.26 with React 18.3.1 | App Router            | `/streaming`                                                        | Production Suspense fallback observed before delayed streamed content; direct-load/refresh expectations wait for final content.                         |
| Next.js 15.5.26 with React 18.3.1 | App Router            | `/delayed-client`, `/delayed-client-missing`                        | Production fallback before a deferred client import, configured readiness after the module loads, and bounded missing-content failure.                  |
| Next.js 15.5.26 with React 18.3.1 | App Router            | `/app-router` → `/app-router-destination`                           | Production `<Link>` transition reaches configured destination content without a document request; browser back/forward returns to the expected URLs.    |
| Next.js 15.5.26 with React 18.3.1 | App Router            | `/app-router-query` → `/app-router-query-destination?view=activity` | Production `<Link>` query transition reaches matching server-rendered content without a document request; back/forward restores query-selected content. |

The development fixture runs in development mode. A separate fixture runs `next build` and `next start` before scanning production direct loads and refreshes. Single and nested Suspense routes verify ordered fallback/content delivery and bounded missing-content failures. A deferred client-module route verifies one delayed `import()` pattern with fallback and explicit UI readiness. One App Router query transition verifies matching URL and rendered state through client navigation and history traversal. CI exercises these fixtures on Node.js 20, 22, and 24 with Chromium. This is scanner-compatibility evidence for the pinned Next.js version, not a claim that all Next.js behaviors are supported. Other streaming/Suspense patterns, Server/Client Component transitions, import failures, and route prefetching remain outside this fixture's scope.

CI also runs a short healthy-route and missing-UI smoke check in Chromium, Firefox, and WebKit on Node.js 22, using the Playwright version in `package-lock.json`. This confirms basic launch, navigation, selector assertions, classification, and cleanup for those engines. It does not establish full Next.js, visual-baseline, or broader browser compatibility outside Chromium.

See [`test/next-compat.test.js`](../test/next-compat.test.js), [`test/next-production.test.js`](../test/next-production.test.js), [`test/scan.test.js`](../test/scan.test.js), and the [fixture inventory](FIXTURE_INVENTORY.md) for executable evidence.
