"use client";

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AXIS_TICK, GRID_STROKE, TooltipCard, datumOf } from "./ChartTooltip";

interface Props {
  data: { sector: string; count: number; total: number }[];
  /** "low" or "high". */
  anchor: string;
}

/** Companies within 10% of their 52-week low (or high), by sector. */
export function SectorChart({ data, anchor }: Props) {
  if (data.length === 0) {
    return <p className="py-8 text-sm text-ink-muted">No company is within 10% of its 52-week {anchor}.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={data.length * 30 + 40}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 32, bottom: 4, left: 0 }}>
        <CartesianGrid horizontal={false} stroke={GRID_STROKE} />
        <XAxis type="number" allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="sector"
          width={150}
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          interval={0}
        />
        <Tooltip
          cursor={{ fill: "var(--surface-2)" }}
          content={({ payload }) => {
            const d = datumOf<Props["data"][number]>(payload);
            if (!d) return null;
            return (
              <TooltipCard title={d.sector}>
                {d.count} of {d.total} companies within 10% of their {anchor} (
                {Math.round((d.count / d.total) * 100)}%)
              </TooltipCard>
            );
          }}
        />
        <Bar dataKey="count" name={`Companies within 10% of ${anchor}`} fill="var(--accent)" radius={[0, 3, 3, 0]}>
          <LabelList dataKey="count" position="right" fill="var(--ink)" fontSize={12} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
