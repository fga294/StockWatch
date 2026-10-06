import type { ReactNode } from "react";

/** Recharts passes the hovered datum as payload[0].payload. */
export function datumOf<T>(payload: ReadonlyArray<{ payload?: unknown }> | undefined): T | null {
  return (payload?.[0]?.payload as T | undefined) ?? null;
}

/** Ticker from a clicked Bar/Scatter item, whose original row sits on `.payload`. */
export function tickerOf(item: unknown): string | null {
  const ticker = (item as { payload?: { ticker?: unknown } } | null)?.payload?.ticker;
  return typeof ticker === "string" ? ticker : null;
}

export function TooltipCard({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 text-sm font-semibold text-ink">{title}</div>
      <div className="space-y-0.5 text-ink-muted">{children}</div>
    </div>
  );
}

/** Shared axis/grid styling so every chart picks up the theme. */
export const AXIS_TICK = { fill: "var(--ink-muted)", fontSize: 12 };
export const GRID_STROKE = "var(--line)";
