# Framework compatibility evidence

Hydration Doctor's scanner is framework-independent: it checks the browser-visible document, configured selectors/text, navigation, runtime events, and snapshots. It does not inspect React or Next.js internals.

| Framework/runtime                 | Router                | Fixture routes                         | Verified behavior                                                                                                  |
| --------------------------------- | --------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| React 18.3.1                      | `hydrateRoot` fixture | `/react-healthy`, `/hydration-warning` | Healthy hydration remains clean; a known text mismatch warning is reported separately from generic console errors. |
| Next.js 15.5.26 with React 18.3.1 | App Router            | `/app-router`                          | Real Next development server, direct load and refresh, main content assertion.                                     |
| Next.js 15.5.26 with React 18.3.1 | Pages Router          | `/pages-router`                        | Real Next development server, direct load and refresh, main content assertion.                                     |

The Next.js fixture runs in development mode and CI exercises it with Node.js 20, 22, and 24 and Chromium. This is a scanner-compatibility smoke test, not a claim that all Next.js behaviors are supported. Production builds, streaming/Suspense differences, Server/Client Component transitions, dynamic imports, and route prefetching do not yet have dedicated compatibility fixtures.

See [`test/next-compat.test.js`](../test/next-compat.test.js), [`test/scan.test.js`](../test/scan.test.js), and the [fixture inventory](FIXTURE_INVENTORY.md) for executable evidence.
