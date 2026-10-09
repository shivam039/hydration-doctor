export default async function AppRouterDynamicDestinationPage({ params }) {
  const { slug } = await params;

  return (
    <main>
      <p id="dynamic-item-ready">{slug} item ready</p>
    </main>
  );
}
