# Adversarial review — 0.27.0 support contract

- **Overstated compatibility:** The README names fixture versions and explicitly lists unsupported framework behaviors. Browser claims separate the Chromium suite from targeted Firefox/WebKit smoke.
- **Device overclaim:** Viewport profiles are described as Chromium emulation, with physical devices and cross-browser baselines explicitly outside verified scope.
- **Static-analysis overclaim:** Findings remain source-pattern candidates; timing and complete hydration hazards are called out as unsupported. Contract coverage checks candidate output without treating it as a runtime scan failure.
- **Upgrade ambiguity:** README, API guide, and migration guide all state that 0.x APIs/configuration can break without migration guarantees; report schema v1 is not framed as cross-release stability.
- **Release confusion:** Changelog labels repository increments unreleased and lists published releases separately. Pack/consumer checks verify artifact contents and operation without publishing.
- **Residual risks:** Fixture breadth remains limited; local auth flows do not validate real identity providers, and one fixture's responsive profile does not establish broad visual compatibility. Stable 1.0 readiness remains false.
