"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Cell,
  ReferenceArea,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { OUTER_BAND_PCT } from "@/lib/metrics";
import { formatPct, formatPrice, formatValue } from "@/lib/format";
import type { CompanySummary } from "@/lib/types";
import { bandOf, type ViewConfig } from "../views";
import { AXIS_TICK, GRID_STROKE, TooltipCard, datumOf, tickerOf } from "./ChartTooltip";

interface Props {
  companies: CompanySummary[];
  view: ViewConfig;
  selected: string | null;
  onSelect: (ticker: string) => void;
}

const X_TICKS = [0, 5, 10, 25, 50, 100, 200, 400, 800, 1600, 3200];
const Y_TICKS = [1, 2, 5].flatMap((m) => [1e5, 1e6, 1e7, 1e8, 1e9, 1e10].map((p) => m * p)).sort((a, b) => a - b);

/**
 * All companies: distance from the 52-week low or high (x, square-root scale)
 * vs average daily value traded (y, log scale). The sqrt x-scale keeps a few
 * far-away outliers on the chart without crushing the near cluster against
 * the axis.
 */
export function ValueScatter({ companies, view, selected, onSelect }: Props) {
  const { xDomain, xTicks, yDomain, yTicks } = useMemo(() => {
    const maxX = Math.max(...companies.map(view.distance), OUTER_BAND_PCT);
    const xTop = X_TICKS.find((t) => t >= maxX) ?? maxX;
    const values = companies.map((c) => c.avgDailyValue);
    const yMin = Y_TICKS.findLast((t) => t <= Math.min(...values)) ?? Math.min(...values);
    const yMax = Y_TICKS.find((t) => t >= Math.max(...values)) ?? Math.max(...values);
    return {
      xDomain: [0, xTop] as [number, number],
      xTicks: X_TICKS.filter((t) => t <= xTop),
      // Headroom so points on the extremes aren't clipped by the plot edge.
      yDomain: [yMin / 1.15, yMax * 1.15] as [number, number],
      yTicks: Y_TICKS.filter((t) => t >= yMin && t <= yMax),
    };
  }, [companies, view]);

  return (
    <ResponsiveContainer width="100%" height={380}>
      <ScatterChart margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
        <CartesianGrid stroke={GRID_STROKE} />
        <ReferenceArea x1={0} x2={OUTER_BAND_PCT} fill={view.stripFill} fillOpacity={0.8} ifOverflow="hidden" />
        <XAxis
          type="number"
          dataKey={view.distance}
          name={view.axisLabel}
          scale="sqrt"
          domain={xDomain}
          ticks={xTicks}
          interval={0}
          tick={AXIS_TICK}
          tickFormatter={(v: number) => `${v}%`}
          label={{
            value: `${view.axisLabel} (square-root scale)`,
            position: "insideBottom",
            offset: -16,
            fill: "var(--ink-muted)",
            fontSize: 12,
          }}
        />
        <YAxis
          type="number"
          dataKey="avgDailyValue"
          name="Avg daily value traded"
          scale="log"
          domain={yDomain}
          ticks={yTicks}
          interval={0}
          tick={AXIS_TICK}
          tickFormatter={(v: number) => formatValue(v)}
          width={56}
        />
        <Tooltip
          cursor={{ strokeDasharray: "3 3", stroke: "var(--ink-muted)" }}
          content={({ payload }) => {
            const c = datumOf<CompanySummary>(payload);
            if (!c) return null;
            return (
              <TooltipCard title={c.ticker}>
                <div>{c.name}</div>
                <div>
                  {formatPct(view.distance(c))} {view.distancePhrase} · {formatPrice(c.price, c.currency)}
                </div>
                <div>{formatValue(c.avgDailyValue)} traded per day</div>
              </TooltipCard>
            );
          }}
        />
        <Scatter
          data={companies}
          name="Companies"
          className="cursor-pointer"
          onClick={(item) => {
            const t = tickerOf(item);
            if (t) onSelect(t);
          }}
        >
          {companies.map((c) => (
            <Cell
              key={c.ticker}
              fill={view.fill[bandOf(view, c)]}
              fillOpacity={c.ticker === selected ? 1 : 0.75}
              stroke={c.ticker === selected ? "var(--ink)" : "var(--surface)"}
              strokeWidth={c.ticker === selected ? 2.5 : 1}
            />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}
