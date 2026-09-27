import { Suspense } from "react";

export const dynamic = "force-dynamic";

async function StreamedDashboard() {
  await new Promise((resolve) => setTimeout(resolve, 800));
  return <main>Streamed account dashboard ready</main>;
}

function DashboardFallback() {
  return <p role="status">Loading streamed dashboard</p>;
}

export default function StreamingPage() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <StreamedDashboard />
    </Suspense>
  );
}
