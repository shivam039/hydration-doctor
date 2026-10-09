# Adversarial review — 0.30.0 streamed App Router transitions

## Findings and mitigations

- **Fallback never appears because the route was prefetched:** The source link opts out of prefetch for this controlled fixture. The browser test explicitly requires the loading marker after activation and before ready content.
- **A timing delay is mistaken for proof of streaming:** The controlled delay only creates an observable window; assertions check the actual fallback and ready selectors, and scanner success depends on expected destination content.
- **Slow or missing content hangs the suite:** Browser waits are bounded, and the destination is local. The scanner uses its configured timeout for readiness.
- **A new document request looks like successful client navigation:** The scanner scenario fails if a full document request is observed.
- **One route is described as all streaming support:** The evidence is limited to a single Next.js 15.5.26 App Router `loading` boundary and one controlled server delay; other streaming strategies, RSC patterns, and network conditions are not covered.

## Residual limitations

This fixture does not prove behavior under real slow networks, CPU contention, cancellation, middleware, or alternate streaming runtimes. A fixed delay makes the fallback observable but is not a performance benchmark.
