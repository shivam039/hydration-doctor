import DeferredClient from "../delayed-client/DeferredClient.jsx";

export const dynamic = "force-dynamic";

export default function DelayedClientMissingPage() {
  return <DeferredClient missing />;
}
