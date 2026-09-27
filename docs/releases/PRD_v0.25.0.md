# Hydration Doctor 0.25.0 — Route-Level Responsive Visual Profiles

## Problem

A scan currently uses one global viewport and device context, preventing one run from checking desktop, tablet, and emulated mobile layouts.

## Scope and acceptance

- Add per-route bounded viewport dimensions and a named Playwright device descriptor.
- Route settings override global context settings for that route; existing routes keep global defaults.
- Capture direct/refresh visual evidence for desktop, tablet, and an emulated mobile descriptor in a deterministic responsive fixture.
- Document device emulation limits and retain existing screenshot pixel/byte caps.

## Adversarial review

Probe unknown descriptors, invalid dimensions, override precedence, independent route contexts, mobile DPR screenshot size, and image size caps. Do not imply a viewport/device descriptor alone establishes full browser or hardware compatibility.

## Verification

Configuration tests reject invalid profiles. Browser tests scan three responsive profiles in one run and require complete direct/refresh screenshots with matching dimensions. CI and consumer checks precede issue closure.
