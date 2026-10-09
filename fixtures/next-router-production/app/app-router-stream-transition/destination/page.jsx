export const dynamic = "force-dynamic";

export default async function StreamedTransitionDestinationPage() {
  await new Promise((resolve) => setTimeout(resolve, 400));

  return (
    <main>
      <p id="streamed-transition-ready">Streamed destination ready</p>
    </main>
  );
}
