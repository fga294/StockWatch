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
import { NEAR_LOW_AMBER_PCT } from "@/lib/metrics";
import { formatPct, formatPrice, formatValue } from "@/lib/format";
import type { CompanySummary } from "@/lib/types";
import { BAND_FILL, bandFor } from "../bands";
import { AXIS_TICK, GRID_STROKE, TooltipCard, datumOf, tickerOf } from "./ChartTooltip";

interface Props {
  companies: CompanySummary[];
  selected: string | null;
  onSelect: (ticker: string) => void;
}

const X_TICKS = [0, 5, 10, 25, 50, 100, 200, 400, 800, 1600, 3200];
const Y_TICKS = [1, 2, 5].flatMap((m) => [1e5, 1e6, 1e7, 1e8, 1e9, 1e10].map((p) => m * p)).sort((a, b) => a - b);

/**
 * All companies: % above 52-week low (x, square-root scale) vs average daily
 * value traded (y, log scale). The sqrt x-scale keeps a few far-from-low
 * outliers on the chart without crushing the near-low cluster against the axis.
 */
export function ValueScatter({ companies, selected, onSelect }: Props) {
  const { xDomain, xTicks, yDomain, yTicks } = useMemo(() => {
    const maxX = Math.max(...companies.map((c) => c.pctAboveLow), NEAR_LOW_AMBER_PCT);
    const xTop = X_TICKS.find((t) => t >= maxX) ?? maxX;
    const values = companies.map((c) => c.avgDailyValue);
    const yMin = Y_TICKS.findLast((t) => t <= Math.min(...values)) ?? Math.min(...values);
    const yMax = Y_TICKS.find((t) => t >= Math.max(...values)) ?? Math.max(...values);
    return {
      xDomain: [0, xTop] as [number, number],
      xTicks: X_TICKS.filter((t) => t <= xTop),
      yDomain: [yMin, yMax] as [number, number],
      yTicks: Y_TICKS.filter((t) => t >= yMin && t <= yMax),
    };
  }, [companies]);

  return (
    <ResponsiveContainer width="100%" height={380}>
      <ScatterChart margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
        <CartesianGrid stroke={GRID_STROKE} />
        <ReferenceArea x1={0} x2={NEAR_LOW_AMBER_PCT} fill="var(--red-bg)" fillOpacity={0.8} ifOverflow="hidden" />
        <XAxis
          type="number"
          dataKey="pctAboveLow"
          name="% above 52-week low"
          scale="sqrt"
          domain={xDomain}
          ticks={xTicks}
          interval={0}
          tick={AXIS_TICK}
          tickFormatter={(v: number) => `${v}%`}
          label={{
            value: "% above 52-week low (square-root scale)",
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
                  {formatPct(c.pctAboveLow)} above low · {formatPrice(c.price, c.currency)}
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
              fill={BAND_FILL[bandFor(c.pctAboveLow)]}
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
