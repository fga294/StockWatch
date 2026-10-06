"use client";

import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { OUTER_BAND_PCT, sectorCountsNear, summarise } from "@/lib/metrics";
import { formatTimestamp } from "@/lib/format";
import type { DashboardData } from "@/lib/types";
import { DetailPanel } from "./DetailPanel";
import { ProximityTable } from "./ProximityTable";
import { SummaryCards } from "./SummaryCards";
import { ProximityBarChart } from "./charts/ProximityBarChart";
import { SectorChart } from "./charts/SectorChart";
import { ValueScatter } from "./charts/ValueScatter";
import { useViewParam } from "./useViewParam";
import { VIEWS, type ViewConfig, type ViewKey } from "./views";

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

function Legend({ view }: { view: ViewConfig }) {
  const bands = ["within5", "within10", "beyond"] as const;
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
      {bands.map((b) => (
        <li key={b} className="flex items-center gap-1.5">
          <span aria-hidden className={`size-2.5 rounded-sm ${view.swatch[b]}`} />
          {view.bandLabel[b]}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <span
          aria-hidden
          className={`h-2.5 w-5 rounded-sm bg-surface-2 ${view.zone === "low" ? "near-low-zone" : "near-high-zone"}`}
        />
        Range rail: hatched part is within 10% of the {view.anchor}
      </li>
    </ul>
  );
}

/** Segmented control switching between the lows and highs views. */
function ViewSwitch({ view, onChange }: { view: ViewKey; onChange: (v: ViewKey) => void }) {
  return (
    <div role="group" aria-label="View" className="inline-flex rounded-lg border border-line bg-surface p-1">
      {(Object.keys(VIEWS) as ViewKey[]).map((key) => {
        const active = key === view;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(key)}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              active ? "bg-ink text-surface" : "text-ink-muted hover:text-ink"
            }`}
          >
            {VIEWS[key].label}
          </button>
        );
      })}
    </div>
  );
}

export function Dashboard({ data }: { data: DashboardData }) {
  const { companies } = data;
  const [viewKey, setViewKey] = useViewParam();
  const view = VIEWS[viewKey];

  const ranked = useMemo(() => [...companies].sort((a, b) => view.rank(a) - view.rank(b)), [companies, view]);
  const top = useMemo(() => ranked.slice(0, TOP_N), [ranked]);
  const stats = useMemo(() => summarise(companies, view.distance), [companies, view]);
  const sectors = useMemo(() => {
    const totals = new Map<string, number>();
    for (const c of companies) totals.set(c.sector, (totals.get(c.sector) ?? 0) + 1);
    return sectorCountsNear(companies, view.distance, OUTER_BAND_PCT).map((s) => ({
      ...s,
      total: totals.get(s.sector) ?? s.count,
    }));
  }, [companies, view]);

  // Selection belongs to a view: switching views (including via the back
  // button) falls back to that view's #1 rather than keeping a stale pick.
  const [selection, setSelection] = useState<{ view: ViewKey; ticker: string } | null>(null);
  const selected = selection?.view === viewKey ? selection.ticker : (ranked[0]?.ticker ?? null);
  const selectedCompany = companies.find((c) => c.ticker === selected) ?? null;
  const detailRef = useRef<HTMLDivElement>(null);

  // On narrow screens the detail panel sits below the table, so bring it into view.
  const select = useCallback(
    (ticker: string) => {
      setSelection({ view: viewKey, ticker });
      if (window.matchMedia("(max-width: 1279px)").matches) {
        requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
      }
    },
    [viewKey],
  );

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <ViewSwitch view={viewKey} onChange={setViewKey} />
          <h1 className="mt-4 text-4xl leading-none font-extrabold tracking-tight [font-stretch:75%] sm:text-5xl">
            {view.title}
          </h1>
          <p className="mt-2 max-w-prose text-ink-muted">
            The {data.universe.analysedCount} most actively traded ASX companies by value, ranked by how close they
            are trading to their 52-week {view.anchor}.
          </p>
        </div>
        <div className="text-sm sm:text-right">
          <p>
            Data as of <time dateTime={data.lastUpdated} className="font-semibold">{formatTimestamp(data.lastUpdated)}</time>
          </p>
          <p className="text-ink-muted">Prices delayed ~20 minutes. Not financial advice.</p>
        </div>
      </header>

      <SummaryCards stats={stats} view={view} skippedCount={data.skipped.length} />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_400px]">
        <Panel
          title={`The ${top.length} closest to their 52-week ${view.anchor}`}
          description="Select a row to see its 12-month chart. Sort by any column."
          className="min-w-0"
        >
          <div className="mb-3">
            <Legend view={view} />
          </div>
          <ProximityTable companies={top} view={view} selected={selected} onSelect={select} />
        </Panel>

        <div ref={detailRef} className="scroll-mt-4 xl:sticky xl:top-4 xl:self-start">
          <div className="rounded-lg border border-line bg-surface p-3 sm:p-5">
            {selectedCompany ? (
              <DetailPanel company={selectedCompany} view={view} />
            ) : (
              <p className="text-sm text-ink-muted">Select a company in the table or a chart to see its price history.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-2">
        <Panel
          title={`How far ${view.anchor === "low" ? "above the low" : "below the high"}`}
          description={`${view.axisLabel}, closest ${top.length}.`}
        >
          <ProximityBarChart companies={top} view={view} selected={selected} onSelect={select} />
        </Panel>
        <Panel
          title={`Sectors near their ${view.anchor}s`}
          description={`Companies within ${OUTER_BAND_PCT}% of their 52-week ${view.anchor}, by sector.`}
        >
          <SectorChart data={sectors} anchor={view.anchor} />
        </Panel>
      </div>

      <Panel
        title={`All ${companies.length} companies`}
        description={`Distance from the 52-week ${view.anchor} (square-root scale) against average daily value traded (log scale). The shaded strip is within 10% of the ${view.anchor}. Select a point to see its chart.`}
      >
        <ValueScatter companies={companies} view={view} selected={selected} onSelect={select} />
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
