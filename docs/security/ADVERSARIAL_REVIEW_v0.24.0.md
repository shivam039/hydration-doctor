# Adversarial review — 0.24.0 production Pages Router navigation

- **Accidental full navigation:** The fixture uses a framework `<Link>` and the scanner's transition-specific finding must be absent. Cumulative document counts are not interpreted as click-only evidence because history can issue document requests.
- **False readiness:** The transition asserts exact destination URL and visible route-owned content. Back and forward are checked as independent outcomes.
- **Timeout and classification:** The production fixture also uses a deliberately impossible destination expectation with a bounded timeout and confirms the result is not called a hydration error.
- **Compatibility overclaim:** Documentation calls React 18.3.1 / Next.js 15.5.26 the minimum verified fixture target and lists other versions and behaviors as unverified.
- **Cleanup:** The server cleanup hook runs after spawn even if any assertion fails.
