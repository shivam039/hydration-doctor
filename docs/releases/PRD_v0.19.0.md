# Hydration Doctor 0.19.0 — Client Navigation Snapshot Evidence

## Problem

Configured structural snapshots are compared across direct load and refresh and between server HTML and observed client DOM. They are not compared between a direct target load and a client-side transition to that target.

## Scope and acceptance

- Compare the configured snapshot from the target route’s direct scenario with its client-navigation scenario.
- Report observed differences in both scenarios using a dedicated category and reproduction recipe.
- Reuse the route’s snapshot normalization and ignore selectors.
- Skip comparison when either snapshot is unavailable; retain schema v1 and do not call differences hydration failures.

## Adversarial review

Checked route matching, scenario ordering, absent snapshots, ignored regions through shared snapshot configuration, and diagnostic language. Snapshot evidence can include configured application text or attributes; snapshot collection remains opt-in and report handling follows existing privacy guidance.

## Verification

A healthy SPA fixture must pass; a deliberately stale client-rendered destination must fail with exact structural evidence. Full checks, consumer scan, and CI matrix precede issue closure.
