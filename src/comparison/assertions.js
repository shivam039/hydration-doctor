export async function assertRouteExpectations(page, route, timeout) {
  if (route.snapshot?.selector) {
    await waitForSelector(
      page,
      route.snapshot.selector,
      "attached",
      timeout,
      "snapshot",
    );
  }
  if (route.readySelector) {
    await waitForSelector(
      page,
      route.readySelector,
      "visible",
      timeout,
      "readiness",
    );
  }
  if (route.expectedSelector)
    await waitForSelector(
      page,
      route.expectedSelector,
      "visible",
      timeout,
      "expected UI",
    );
  if (route.expectedText) {
    await page
      .getByText(route.expectedText, { exact: false })
      .first()
      .waitFor({ state: "visible", timeout })
      .catch(() => {
        throw new Error(
          `Expected visible text was not found within ${timeout}ms: ${route.expectedText}`,
        );
      });
  }
}

async function waitForSelector(page, selector, state, timeout, purpose) {
  await page
    .locator(selector)
    .first()
    .waitFor({ state, timeout })
    .catch(() => {
      const expectation = state === "attached" ? "to exist" : "to be visible";
      throw new Error(
        `The ${purpose} selector ${JSON.stringify(selector)} failed ${expectation} within ${timeout}ms.`,
      );
    });
}
