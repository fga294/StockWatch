import { loadSnapshot } from "@/lib/snapshot";

/**
 * 12-month daily history for one company, served from the snapshot (never
 * from Yahoo). Every ticker is prerendered at build time.
 */
export const dynamicParams = false;

export async function generateStaticParams() {
  const snapshot = await loadSnapshot();
  return (snapshot?.companies ?? []).map((c) => ({ ticker: c.ticker }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const snapshot = await loadSnapshot();
  const company = snapshot?.companies.find((c) => c.ticker === ticker);
  if (!company) {
    return Response.json({ error: `No data for ${ticker}` }, { status: 404 });
  }
  return Response.json({ ticker: company.ticker, history: company.history });
}
