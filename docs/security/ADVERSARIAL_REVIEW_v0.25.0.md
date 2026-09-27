# Adversarial review — 0.25.0 route-level visual profiles

- **Profile leakage:** Each scenario already receives an isolated browser context. Route viewport/device values are selected for both direct and refresh in that route; other routes retain the global values.
- **Invalid values:** Viewport dimensions are integer-bounded to 1–7680. Device names must be own keys in Playwright's descriptor map, preventing inherited-property lookups and unknown descriptors.
- **Precedence ambiguity:** A route device overrides global device and uses its descriptor viewport unless route viewport is supplied. Route viewport takes precedence over the device's default. Existing global settings remain the default for routes without overrides.
- **Resource limits:** Existing visual limits cap CSS viewport pixels and PNG evidence size. The tested iPhone SE descriptor has a 2x scale factor whose captured PNG stays within the pixel comparison bound.
- **Residual limit:** Device descriptors set browser context properties; they do not emulate every real device/browser or certify cross-browser visual equivalence.
