# Adversarial review — 0.19.0 client navigation snapshots

- **Incorrect pairing:** Pair by sanitized configured route and exact `client-navigation` scenario, not by array positions or current URL text. Route jobs are fixed per config.
- **Missing or failed evidence:** Comparison runs only when both snapshots exist. A failed navigation does not receive fabricated evidence.
- **False hydration claims:** The dedicated category says observed client-navigation rendering inconsistency and explicitly states that this does not prove hydration failure.
- **Dynamic content:** Both snapshots use the same configured selectors, attributes, text policy, and ignored selectors. Intentional dynamic values still need explicit ignore configuration.
- **Privacy:** This consumes the already opt-in snapshot payload and does not add unconfigured DOM capture. Review snapshots before sharing reports.
