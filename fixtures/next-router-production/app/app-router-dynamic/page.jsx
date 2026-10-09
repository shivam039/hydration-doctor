import Link from "next/link";

export default function AppRouterDynamicPage() {
  return (
    <main>
      <p>Next App Router dynamic segment fixture</p>
      <Link href="/app-router-dynamic/item/activity">Open activity item</Link>
    </main>
  );
}
