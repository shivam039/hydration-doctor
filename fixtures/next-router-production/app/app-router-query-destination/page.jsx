export default async function AppRouterQueryDestinationPage({ searchParams }) {
  const { view } = await searchParams;
  const selectedView = view === "activity" ? "Activity" : "Overview";

  return (
    <main>
      <p id="query-view-ready">{selectedView} view ready</p>
    </main>
  );
}
