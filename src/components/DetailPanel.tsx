"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDate, formatMonth, formatPct, formatPrice, formatValue } from "@/lib/format";
import { tupleToBar } from "@/lib/metrics";
import type { BarTuple, CompanySummary, DailyBar } from "@/lib/types";
import { bandOf, type ViewConfig } from "./views";
import { AXIS_TICK, GRID_STROKE, TooltipCard, datumOf } from "./charts/ChartTooltip";
import { RangeRail } from "./RangeRail";

type Loaded = { ticker: string; bars: DailyBar[] } | { ticker: string; error: string };

/** Bars per ticker, kept for the session so re-selecting is instant. */
const historyCache = new Map<string, DailyBar[]>();

async function loadHistory(ticker: string): Promise<DailyBar[]> {
  const cached = historyCache.get(ticker);
  if (cached) return cached;
  const res = await fetch(`/api/history/${encodeURIComponent(ticker)}`);
  if (!res.ok) throw new Error(`History request failed (${res.status})`);
  const body = (await res.json()) as { history: BarTuple[] };
  const bars = body.history.map(tupleToBar);
  historyCache.set(ticker, bars);
  return bars;
}

export function DetailPanel({ company, view }: { company: CompanySummary; view: ViewConfig }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const requested = useRef<string | null>(null);

  useEffect(() => {
    requested.current = company.ticker;
    loadHistory(company.ticker).then(
      (bars) => requested.current === company.ticker && setLoaded({ ticker: company.ticker, bars }),
      (err: unknown) =>
        requested.current === company.ticker &&
        setLoaded({ ticker: company.ticker, error: err instanceof Error ? err.message : String(err) }),
    );
  }, [company.ticker]);

  const current = loaded?.ticker === company.ticker ? loaded : null;
  const band = bandOf(view, company);
  // The view's anchor line (low or high) is emphasised; the other is muted.
  const lineStyle = (anchor: "low" | "high") =>
    view.anchor === anchor
      ? { stroke: view.fill.within5, label: view.anchorText }
      : { stroke: "var(--ink-muted)", label: "var(--ink-muted)" };
  const lowLine = lineStyle("low");
  const highLine = lineStyle("high");

  const chartData = useMemo(
    () =>
      current && "bars" in current
        ? current.bars.map((b) => ({ ...b, range: [b.low, b.high] as [number, number] }))
        : [],
    [current],
  );

  return (
    <section aria-labelledby="detail-heading" className="flex flex-col gap-4">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <h2 id="detail-heading" className="text-2xl font-bold [font-stretch:80%]">
            {company.ticker}
            <span className="ml-2 text-base font-normal text-ink-muted [font-stretch:100%]">#{view.rank(company)}</span>
          </h2>
          <p className="truncate text-sm text-ink-muted">
            {company.name} · {company.sector}
          </p>
        </div>
        <div className="ml-auto text-right">
          <div className="text-2xl font-semibold">{formatPrice(company.price, company.currency)}</div>
          <div className={`text-sm font-semibold ${view.text[band]}`}>
            {formatPct(view.distance(company))} {view.distancePhrase}
            <span className="sr-only"> ({view.bandLabel[band]})</span>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-1.5">
        <RangeRail
          position={company.rangePosition}
          low={company.low52}
          high={company.high52}
          zone={view.zone}
          size="lg"
        />
        <div className="flex justify-between text-xs text-ink-muted">
          <span>
            Low {formatPrice(company.low52, company.currency)} · {formatDate(company.low52Date)}
          </span>
          <span className="text-right">
            High {formatPrice(company.high52, company.currency)} · {formatDate(company.high52Date)}
          </span>
        </div>
      </div>

      <div className="h-64 sm:h-72" aria-busy={!current}>
        {!current && <p className="pt-24 text-center text-sm text-ink-muted">Loading price history…</p>}
        {current && "error" in current && (
          <p role="alert" className="pt-24 text-center text-sm text-red">
            Couldn’t load the price history for {company.ticker}: {current.error}. Reload the page to try again.
          </p>
        )}
        {current && "bars" in current && (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={GRID_STROKE} vertical={false} />
              <XAxis
                dataKey="date"
                tick={AXIS_TICK}
                tickFormatter={formatMonth}
                minTickGap={40}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={["dataMin", "dataMax"]}
                tick={AXIS_TICK}
                tickFormatter={(v: number) => formatPrice(v, company.currency)}
                width={64}
                axisLine={false}
                tickLine={false}
                padding={{ top: 12, bottom: 12 }}
              />
              <Tooltip
                content={({ payload }) => {
                  const b = datumOf<DailyBar>(payload);
                  if (!b) return null;
                  const f = (n: number) => formatPrice(n, company.currency);
                  return (
                    <TooltipCard title={formatDate(b.date)}>
                      <div>
                        Open {f(b.open)} · Close {f(b.close)}
                      </div>
                      <div>
                        High {f(b.high)} · Low {f(b.low)}
                      </div>
                      <div>Value traded {formatValue(b.close * b.volume)}</div>
                    </TooltipCard>
                  );
                }}
              />
              <Area
                dataKey="range"
                name="Daily high–low"
                stroke="none"
                fill="var(--accent)"
                fillOpacity={0.18}
                isAnimationActive={false}
              />
              <Line
                dataKey="close"
                name="Close"
                stroke="var(--accent)"
                strokeWidth={1.75}
                dot={false}
                isAnimationActive={false}
              />
              <ReferenceLine
                y={company.high52}
                stroke={highLine.stroke}
                strokeDasharray="4 4"
                label={{ value: "52w high", position: "insideTopLeft", fill: highLine.label, fontSize: 11 }}
              />
              <ReferenceLine
                y={company.low52}
                stroke={lowLine.stroke}
                strokeDasharray="4 4"
                label={{ value: "52w low", position: "insideBottomLeft", fill: lowLine.label, fontSize: 11 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
      <p className="text-xs text-ink-muted">
        Daily closes with the high–low range shaded. Averages {formatValue(company.avgDailyValue)} traded per day
        over the last 30 sessions.
      </p>
    </section>
  );
}
