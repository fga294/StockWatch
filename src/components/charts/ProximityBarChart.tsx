"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatPct, formatPrice } from "@/lib/format";
import type { CompanySummary } from "@/lib/types";
import { BAND_FILL, bandFor } from "../bands";
import { AXIS_TICK, GRID_STROKE, TooltipCard, datumOf, tickerOf } from "./ChartTooltip";

interface Props {
  companies: CompanySummary[];
  selected: string | null;
  onSelect: (ticker: string) => void;
}

/** Horizontal bars: % above 52-week low for the closest 20, closest at the top. */
export function ProximityBarChart({ companies, selected, onSelect }: Props) {
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
              <TooltipCard title={`${c.ticker} · ${formatPct(c.pctAboveLow)} above low`}>
                <div>{c.name}</div>
                <div>
                  {formatPrice(c.price, c.currency)} vs low {formatPrice(c.low52, c.currency)}
                </div>
              </TooltipCard>
            );
          }}
        />
        <Bar
          dataKey="pctAboveLow"
          name="% above 52-week low"
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
              fill={BAND_FILL[bandFor(c.pctAboveLow)]}
              stroke={c.ticker === selected ? "var(--ink)" : "none"}
              strokeWidth={2}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
