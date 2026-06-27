import { Dashboard } from "@/components/dashboard";
import { listWorkflowEvents } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const initialEvents = await listWorkflowEvents();

  return <Dashboard initialEvents={initialEvents} />;
}
