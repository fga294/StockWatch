"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatPct, formatPrice } from "@/lib/format";
import type { CompanySummary } from "@/lib/types";
import { bandOf, type ViewConfig } from "../views";
import { AXIS_TICK, GRID_STROKE, TooltipCard, datumOf, tickerOf } from "./ChartTooltip";

interface Props {
  companies: CompanySummary[];
  view: ViewConfig;
  selected: string | null;
  onSelect: (ticker: string) => void;
}

/** Horizontal bars: distance from the 52-week low or high for the closest 20, closest at the top. */
export function ProximityBarChart({ companies, view, selected, onSelect }: Props) {
  const height = companies.length * 24 + 40;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={companies} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
        <CartesianGrid horizontal={false} stroke={GRID_STROKE} />
        <XAxis
          type="number"
          tick={AXIS_TICK}
          tickFormatter={(v: number) => `${v}%`}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="ticker"
          width={48}
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          interval={0}
        />
        <Tooltip
          cursor={{ fill: "var(--surface-2)" }}
          content={({ payload }) => {
            const c = datumOf<CompanySummary>(payload);
            if (!c) return null;
            return (
              <TooltipCard title={`${c.ticker} · ${formatPct(view.distance(c))} ${view.distancePhrase}`}>
                <div>{c.name}</div>
                <div>
                  {formatPrice(c.price, c.currency)} vs {view.anchor}{" "}
                  {formatPrice(view.anchor === "low" ? c.low52 : c.high52, c.currency)}
                </div>
              </TooltipCard>
            );
          }}
        />
        <Bar
          dataKey={view.distance}
          name={view.axisLabel}
          radius={[0, 3, 3, 0]}
          minPointSize={3}
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
              stroke={c.ticker === selected ? "var(--ink)" : "none"}
              strokeWidth={2}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
