import test from "node:test";
import assert from "node:assert/strict";
import { scan } from "../src/runtime/scan.js";
import { startNavigationFixture } from "../fixtures/navigation-app.js";

test("checks expected anonymous and authenticated route behavior without exposing storage", async (t) => {
  const { server, baseUrl } = await startNavigationFixture();
  t.after(() => server.close());
  const anonymous = await scan({
    baseUrl,
    browser: "chromium",
    timeout: 3000,
    routes: [
      {
        path: "/auth-protected",
        expectedUrl: "/auth-sign-in",
        expectedText: "Sign in required",
      },
    ],
  });
  assert.equal(anonymous.status, "passed");
  assert.deepEqual(
    anonymous.results.map((result) => [result.scenario, result.passed]),
    [
      ["direct", true],
      ["refresh", true],
    ],
  );

  const authenticated = await scan({
    baseUrl,
    browser: "chromium",
    timeout: 3000,
    storageState: {
      cookies: [],
      origins: [
        {
          origin: baseUrl,
          localStorage: [
            {
              name: "hd-auth-state",
              value: "authenticated-fixture-state",
            },
          ],
        },
      ],
    },
    routes: [
      {
        path: "/auth-protected",
        expectedText: "Account dashboard",
      },
    ],
  });
  assert.equal(authenticated.status, "passed");
  assert.deepEqual(
    authenticated.results.map((result) => [result.scenario, result.passed]),
    [
      ["direct", true],
      ["refresh", true],
    ],
  );
  assert.doesNotMatch(
    JSON.stringify({ anonymous, authenticated }),
    /authenticated-fixture-state|hd-auth-state/,
  );

  const incorrectExpectation = await scan({
    baseUrl,
    browser: "chromium",
    timeout: 3000,
    routes: [
      {
        path: "/auth-protected",
        expectedUrl: "/unexpected-page",
        expectedText: "Sign in required",
      },
    ],
  });
  assert.equal(incorrectExpectation.status, "failed");
  assert.equal(
    incorrectExpectation.results[0].diagnostics[0].category,
    "unexpected-redirect",
  );
});
