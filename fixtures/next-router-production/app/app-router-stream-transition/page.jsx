import Link from "next/link";

export default function AppRouterStreamTransitionPage() {
  return (
    <main>
      <p>Next App Router streamed transition fixture</p>
      <Link href="/app-router-stream-transition/destination" prefetch={false}>
        Open streamed destination
      </Link>
    </main>
  );
}
