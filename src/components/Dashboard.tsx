"use client";

import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { NEAR_LOW_AMBER_PCT, sectorCountsNearLow, summarise } from "@/lib/metrics";
import { formatTimestamp } from "@/lib/format";
import type { DashboardData } from "@/lib/types";
import { DetailPanel } from "./DetailPanel";
import { LowsTable } from "./LowsTable";
import { SummaryCards } from "./SummaryCards";
import { ProximityBarChart } from "./charts/ProximityBarChart";
import { SectorChart } from "./charts/SectorChart";
import { ValueScatter } from "./charts/ValueScatter";

const TOP_N = 20;

function Panel({ title, description, children, className = "" }: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border border-line bg-surface p-3 sm:p-5 ${className}`}>
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <p className="mt-0.5 mb-3 text-sm text-ink-muted">{description}</p>}
      {children}
    </section>
  );
}

function Legend() {
  const items = [
    { swatch: "bg-red-mark", label: "Within 5% of low" },
    { swatch: "bg-amber-mark", label: "5–10% above" },
    { swatch: "bg-neutral-mark", label: "More than 10% above" },
  ];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span aria-hidden className={`size-2.5 rounded-sm ${i.swatch}`} />
          {i.label}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <span aria-hidden className="near-low-zone h-2.5 w-5 rounded-sm bg-surface-2" />
        Range rail: hatched part is within 10% of the low
      </li>
    </ul>
  );
}

export function Dashboard({ data }: { data: DashboardData }) {
  const { companies } = data;
  const top = useMemo(() => companies.slice(0, TOP_N), [companies]);
  const stats = useMemo(() => summarise(companies), [companies]);
  const sectors = useMemo(() => {
    const totals = new Map<string, number>();
    for (const c of companies) totals.set(c.sector, (totals.get(c.sector) ?? 0) + 1);
    return sectorCountsNearLow(companies, NEAR_LOW_AMBER_PCT).map((s) => ({
      ...s,
      total: totals.get(s.sector) ?? s.count,
    }));
  }, [companies]);

  const [selected, setSelected] = useState<string | null>(companies[0]?.ticker ?? null);
  const selectedCompany = companies.find((c) => c.ticker === selected) ?? null;
  const detailRef = useRef<HTMLDivElement>(null);

  // On narrow screens the detail panel sits below the table, so bring it into view.
  const select = useCallback((ticker: string) => {
    setSelected(ticker);
    if (window.matchMedia("(max-width: 1279px)").matches) {
      requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }, []);

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl leading-none font-extrabold tracking-tight [font-stretch:75%] sm:text-5xl">
            ASX 52-week lows
          </h1>
          <p className="mt-2 max-w-prose text-ink-muted">
            The {data.universe.analysedCount} most actively traded ASX companies by value, ranked by how close they
            are trading to their 52-week low.
          </p>
        </div>
        <div className="text-sm sm:text-right">
          <p>
            Data as of <time dateTime={data.lastUpdated} className="font-semibold">{formatTimestamp(data.lastUpdated)}</time>
          </p>
          <p className="text-ink-muted">Prices delayed ~20 minutes. Not financial advice.</p>
        </div>
      </header>

      <SummaryCards stats={stats} skippedCount={data.skipped.length} />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_400px]">
        <Panel
          title={`The ${top.length} closest to their 52-week low`}
          description="Select a row to see its 12-month chart. Sort by any column."
          className="min-w-0"
        >
          <div className="mb-3">
            <Legend />
          </div>
          <LowsTable companies={top} selected={selected} onSelect={select} />
        </Panel>

        <div ref={detailRef} className="scroll-mt-4 xl:sticky xl:top-4 xl:self-start">
          <div className="rounded-lg border border-line bg-surface p-3 sm:p-5">
            {selectedCompany ? (
              <DetailPanel company={selectedCompany} />
            ) : (
              <p className="text-sm text-ink-muted">Select a company in the table or a chart to see its price history.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-2">
        <Panel title="How far above the low" description={`% above 52-week low, closest ${top.length}.`}>
          <ProximityBarChart companies={top} selected={selected} onSelect={select} />
        </Panel>
        <Panel
          title="Sectors near their lows"
          description={`Companies within ${NEAR_LOW_AMBER_PCT}% of their 52-week low, by sector.`}
        >
          <SectorChart data={sectors} />
        </Panel>
      </div>

      <Panel
        title={`All ${companies.length} companies`}
        description="Distance from the 52-week low (square-root scale) against average daily value traded (log scale). The shaded strip is within 10% of the low. Select a point to see its chart."
      >
        <ValueScatter companies={companies} selected={selected} onSelect={select} />
      </Panel>

      <footer className="border-t border-line pt-4 text-xs text-ink-muted">
        <p>
          Universe: {data.universe.index} constituents as of {data.universe.constituentsAsOf} (
          {data.universe.constituentCount}), excluding {data.universe.excluded.length} LICs and listed funds, ranked by
          30-day average value traded (close × volume). 52-week high and low are calculated from daily highs and lows.
          Source: {data.source}.
          {data.skipped.length > 0 && ` Skipped: ${data.skipped.map((s) => s.ticker).join(", ")}.`}
        </p>
      </footer>
    </div>
  );
}
