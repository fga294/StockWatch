import type { SummaryStats } from "@/lib/metrics";
import type { ViewConfig } from "./views";

interface SummaryCardsProps {
  stats: SummaryStats;
  view: ViewConfig;
  skippedCount: number;
}

export function SummaryCards({ stats, view, skippedCount }: SummaryCardsProps) {
  const pct = (n: number) => (stats.analysed ? `${Math.round((n / stats.analysed) * 100)}% of those analysed` : "");

  const cards = [
    {
      label: "Companies analysed",
      value: stats.analysed.toString(),
      note: skippedCount ? `${skippedCount} skipped for missing data` : "Most traded by value, ASX 300",
    },
    {
      label: `Within 5% of their ${view.anchor}`,
      value: stats.within5.toString(),
      note: pct(stats.within5),
      tone: view.text.within5,
    },
    {
      label: `Within 10% of their ${view.anchor}`,
      value: stats.within10.toString(),
      note: pct(stats.within10),
      tone: view.text.within10,
    },
    {
      label: `Sector most often near its ${view.anchor}`,
      value: stats.topSector?.sector ?? "None",
      note: stats.topSector ? `${stats.topSector.count} companies within 10%` : "No company within 10%",
      small: true,
    },
  ];

  return (
    <dl className="grid grid-cols-2 overflow-hidden rounded-lg border border-line bg-line gap-px lg:grid-cols-4">
      {cards.map((c, i) => (
        <div key={i} className="flex flex-col gap-1 bg-surface p-4 sm:p-5">
          <dt className="text-sm text-ink-muted">{c.label}</dt>
          <dd
            className={`font-semibold leading-tight [font-stretch:85%] ${c.tone ?? "text-ink"} ${
              c.small ? "text-xl sm:text-2xl" : "text-3xl sm:text-4xl"
            }`}
          >
            {c.value}
          </dd>
          <dd className="text-xs text-ink-muted">{c.note}</dd>
        </div>
      ))}
    </dl>
  );
}
