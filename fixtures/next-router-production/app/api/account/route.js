export const dynamic = "force-dynamic";

export async function GET(request) {
  const name = new URL(request.url).searchParams.get("name");
  if (name !== "slow" && name !== "fast") {
    return Response.json({ error: "Unknown fixture account" }, { status: 400 });
  }

  await new Promise((resolve) =>
    setTimeout(resolve, name === "slow" ? 600 : 75),
  );
  return Response.json({
    label: name === "slow" ? "Account A ready" : "Account B ready",
  });
}
