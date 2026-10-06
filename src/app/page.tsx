import { Dashboard } from "@/components/Dashboard";
import { loadSnapshot, toDashboardData } from "@/lib/snapshot";

export default async function Home() {
  const snapshot = await loadSnapshot();

  if (!snapshot || snapshot.companies.length === 0) {
    return (
      <main className="mx-auto max-w-prose px-4 py-16">
        <h1 className="text-3xl font-bold [font-stretch:80%]">No market data yet</h1>
        <p className="mt-3 text-ink-muted">
          The dashboard reads from <code>data/snapshot.json</code>. Run <code>npm run fetch-data</code> to build it, then
          reload this page.
        </p>
      </main>
    );
  }

  return (
    <main>
      <Dashboard data={toDashboardData(snapshot)} />
    </main>
  );
}
