"use client";

export default function DeferredContent({ missing }) {
  if (missing) return null;
  return (
    <main>
      <h1 id="delayed-client-ready">Delayed client module ready</h1>
    </main>
  );
}
