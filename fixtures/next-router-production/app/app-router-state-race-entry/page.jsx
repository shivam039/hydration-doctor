import Link from "next/link";

export default function AppRouterStateRaceEntryPage() {
  return (
    <main>
      <p>Next App Router state race fixture</p>
      <Link href="/app-router-state-race">Open latest-wins account view</Link>
      <Link href="/app-router-state-race/stale">
        Open stale-response control
      </Link>
    </main>
  );
}
