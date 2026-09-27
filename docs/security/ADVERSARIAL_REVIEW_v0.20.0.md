# Adversarial review — 0.20.0 form state interactions

- **Malformed or incompatible options:** `select` requires a string `value`; `expect.value` is limited to fill/select; `expect.checked` must be boolean and is limited to check/uncheck. Playwright enforces element compatibility and timeout bounds.
- **Hydration races:** Actions may run immediately after DOM content or behind an explicit `readySelector` checkpoint. Assertions wait for the configured ready selector before evaluating final value/state.
- **Sensitive report data:** Evidence retains only step index, action type, and pass status. Failures use generic action/step wording; configured selector and option/state data are not copied.
- **Residual limit:** Only a single string option is selected per step. This does not model every custom combobox or multi-select behavior; those require application-specific observable assertions.
