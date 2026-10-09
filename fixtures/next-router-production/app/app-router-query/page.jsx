import Link from "next/link";

export default function AppRouterQueryPage() {
  return (
    <main>
      <p>Next App Router query transition fixture</p>
      <Link href="/app-router-query-destination?view=activity">
        Open activity view
      </Link>
    </main>
  );
}
