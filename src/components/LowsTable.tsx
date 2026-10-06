"use client";

import { useMemo, useState } from "react";
import { formatPct, formatPrice, formatValue } from "@/lib/format";
import type { CompanySummary } from "@/lib/types";
import { BAND_LABEL, BAND_ROW, BAND_TEXT, bandFor } from "./bands";
import { RangeRail } from "./RangeRail";

type SortKey =
  | "rank"
  | "ticker"
  | "name"
  | "sector"
  | "price"
  | "low52"
  | "high52"
  | "pctAboveLow"
  | "rangePosition"
  | "avgDailyValue";

interface Column {
  key: SortKey;
  label: string;
  /** Shorter header used on phones. */
  shortLabel?: string;
  numeric?: boolean;
  /**
   * Responsive visibility. The table shares the row with the detail panel from
   * xl up, so the widths it gets are not monotonic with the viewport; these
   * were measured so the key columns (above low, range position) never scroll
   * out of view. Company and sector are also shown in the detail panel.
   */
  visibility?: string;
}

const COLUMNS: Column[] = [
  { key: "rank", label: "Rank", shortLabel: "#", numeric: true },
  { key: "ticker", label: "Ticker" },
  { key: "name", label: "Company", visibility: "hidden lg:max-xl:table-cell min-[1440px]:table-cell" },
  { key: "sector", label: "Sector", visibility: "hidden min-[1720px]:table-cell" },
  { key: "price", label: "Price", numeric: true },
  { key: "low52", label: "52w low", numeric: true, visibility: "hidden md:table-cell" },
  { key: "high52", label: "52w high", numeric: true, visibility: "hidden md:table-cell" },
  { key: "pctAboveLow", label: "Above low", shortLabel: "Above", numeric: true },
  { key: "rangePosition", label: "Range position", shortLabel: "Range" },
  { key: "avgDailyValue", label: "Avg daily value", numeric: true, visibility: "hidden lg:table-cell" },
];

const visibilityOf = (key: SortKey) => COLUMNS.find((c) => c.key === key)?.visibility ?? "";

interface LowsTableProps {
  companies: CompanySummary[];
  selected: string | null;
  onSelect: (ticker: string) => void;
}

export function LowsTable({ companies, selected, onSelect }: LowsTableProps) {
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "rank", dir: "asc" });

  const rows = useMemo(() => {
    const sorted = [...companies].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      // Nulls (range position when high == low) always sort last.
      if (av === null) return 1;
      if (bv === null) return -1;
      const cmp = typeof av === "string" ? av.localeCompare(bv as string) : av - (bv as number);
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [companies, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">
          The 20 companies trading closest to their 52-week low. Select a company to see its price chart.
          Column headers sort the table.
        </caption>
        <thead>
          <tr className="border-b border-line text-left text-ink-muted">
            {COLUMNS.map((col) => {
              const active = sort.key === col.key;
              return (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                  className={`px-2 py-2 sm:px-2.5 font-medium whitespace-nowrap ${col.numeric ? "text-right" : ""} ${col.visibility ?? ""}`}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(col.key)}
                    className={`inline-flex items-center gap-1 rounded hover:text-ink focus-visible:outline-2 focus-visible:outline-accent ${
                      active ? "text-ink" : ""
                    }`}
                  >
                    {col.shortLabel ? (
                      <>
                        <span className="sm:hidden">{col.shortLabel}</span>
                        <span className="hidden sm:inline">{col.label}</span>
                      </>
                    ) : (
                      col.label
                    )}
                    <span aria-hidden className="w-2 text-[10px]">
                      {active ? (sort.dir === "asc" ? "▲" : "▼") : ""}
                    </span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => {
            const band = bandFor(c.pctAboveLow);
            const isSelected = c.ticker === selected;
            return (
              <tr
                key={c.ticker}
                onClick={() => onSelect(c.ticker)}
                className={`cursor-pointer border-b border-line last:border-0 ${BAND_ROW[band]} ${
                  isSelected ? "outline-2 -outline-offset-2 outline-accent" : "hover:bg-surface-2"
                }`}
              >
                <td className="px-2 py-2.5 sm:px-2.5 text-right text-ink-muted">{c.rank}</td>
                <td className="px-2 py-2.5 sm:px-2.5 font-semibold">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(c.ticker);
                    }}
                    aria-pressed={isSelected}
                    aria-label={`${c.ticker}, ${c.name}: show price chart`}
                    className="rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    {c.ticker}
                  </button>
                </td>
                <td className={`max-w-40 truncate xl:max-w-48 px-2 py-2.5 sm:px-2.5 ${visibilityOf("name")}`} title={c.name}>
                  {c.name}
                </td>
                <td className={`px-2 py-2.5 sm:px-2.5 whitespace-nowrap text-ink-muted ${visibilityOf("sector")}`}>{c.sector}</td>
                <td className="px-2 py-2.5 sm:px-2.5 text-right whitespace-nowrap">{formatPrice(c.price, c.currency)}</td>
                <td className={`px-2 py-2.5 sm:px-2.5 text-right whitespace-nowrap text-ink-muted ${visibilityOf("low52")}`}>
                  {formatPrice(c.low52, c.currency)}
                </td>
                <td className={`px-2 py-2.5 sm:px-2.5 text-right whitespace-nowrap text-ink-muted ${visibilityOf("high52")}`}>
                  {formatPrice(c.high52, c.currency)}
                </td>
                <td className={`px-2 py-2.5 sm:px-2.5 text-right font-semibold whitespace-nowrap ${BAND_TEXT[band]}`}>
                  <span className="sr-only">{BAND_LABEL[band]}: </span>
                  {formatPct(c.pctAboveLow)}
                </td>
                <td className="min-w-14 sm:min-w-28 px-2 py-2.5 sm:px-2.5">
                  <div className="flex items-center gap-2">
                    <RangeRail position={c.rangePosition} low={c.low52} high={c.high52} />
                    <span className="hidden w-8 shrink-0 text-right text-xs text-ink-muted sm:inline">
                      {c.rangePosition === null ? "–" : `${Math.round(c.rangePosition)}%`}
                    </span>
                  </div>
                </td>
                <td className={`px-2 py-2.5 sm:px-2.5 text-right whitespace-nowrap ${visibilityOf("avgDailyValue")}`}>
                  {formatValue(c.avgDailyValue)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
