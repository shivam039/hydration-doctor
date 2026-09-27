import { Suspense } from "react";

export const dynamic = "force-dynamic";

async function InnerPanel() {
  await new Promise((resolve) => setTimeout(resolve, 600));
  return <p id="nested-stream-ready">Nested stream content ready</p>;
}

async function OuterPanel() {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return (
    <section>
      <p id="outer-stream-ready">Outer stream section ready</p>
      <Suspense fallback={<p id="inner-stream-fallback">Loading inner section</p>}>
        <InnerPanel />
      </Suspense>
    </section>
  );
}

export default function NestedStreamingPage() {
  return (
    <main>
      <Suspense fallback={<p id="outer-stream-fallback">Loading outer section</p>}>
        <OuterPanel />
      </Suspense>
    </main>
  );
}
