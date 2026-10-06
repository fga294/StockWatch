"use client";

import { useMemo, useState } from "react";
import { formatPct, formatPrice, formatValue } from "@/lib/format";
import type { CompanySummary } from "@/lib/types";
import { RangeRail } from "./RangeRail";
import { bandOf, type ViewConfig } from "./views";

type SortKey =
  | "rank"
  | "ticker"
  | "name"
  | "sector"
  | "price"
  | "low52"
  | "high52"
  | "distance"
  | "rangePosition"
  | "avgDailyValue";

type SortValue = string | number | null;

interface Column {
  key: SortKey;
  label: string;
  /** Shorter header used on phones. */
  shortLabel?: string;
  numeric?: boolean;
  /**
   * Responsive visibility. The table shares the row with the detail panel from
   * xl up, so the widths it gets are not monotonic with the viewport; these
   * were measured so the key columns (distance, range position) never scroll
   * out of view. Company and sector are also shown in the detail panel.
   */
  visibility?: string;
  /** Value used for sorting. */
  value: (c: CompanySummary, view: ViewConfig) => SortValue;
}

const columnsFor = (view: ViewConfig): Column[] => [
  { key: "rank", label: "Rank", shortLabel: "#", numeric: true, value: (c, v) => v.rank(c) },
  { key: "ticker", label: "Ticker", value: (c) => c.ticker },
  {
    key: "name",
    label: "Company",
    visibility: "hidden lg:max-xl:table-cell min-[1440px]:table-cell",
    value: (c) => c.name,
  },
  { key: "sector", label: "Sector", visibility: "hidden min-[1720px]:table-cell", value: (c) => c.sector },
  { key: "price", label: "Price", numeric: true, value: (c) => c.price },
  { key: "low52", label: "52w low", numeric: true, visibility: "hidden md:table-cell", value: (c) => c.low52 },
  { key: "high52", label: "52w high", numeric: true, visibility: "hidden md:table-cell", value: (c) => c.high52 },
  {
    key: "distance",
    label: view.distanceLabel,
    shortLabel: view.distanceShort,
    numeric: true,
    value: (c, v) => v.distance(c),
  },
  { key: "rangePosition", label: "Range position", shortLabel: "Range", value: (c) => c.rangePosition },
  {
    key: "avgDailyValue",
    label: "Avg daily value",
    numeric: true,
    visibility: "hidden lg:table-cell",
    value: (c) => c.avgDailyValue,
  },
];

interface ProximityTableProps {
  companies: CompanySummary[];
  view: ViewConfig;
  selected: string | null;
  onSelect: (ticker: string) => void;
}

/** The companies closest to their 52-week low or high, depending on the view. */
export function ProximityTable({ companies, view, selected, onSelect }: ProximityTableProps) {
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "rank", dir: "asc" });
  const columns = useMemo(() => columnsFor(view), [view]);
  const visibilityOf = (key: SortKey) => columns.find((c) => c.key === key)?.visibility ?? "";

  const rows = useMemo(() => {
    const column = columns.find((c) => c.key === sort.key)!;
    return [...companies].sort((a, b) => {
      const av = column.value(a, view);
      const bv = column.value(b, view);
      // Nulls (range position when high == low) always sort last.
      if (av === null) return 1;
      if (bv === null) return -1;
      const cmp = typeof av === "string" ? av.localeCompare(bv as string) : av - (bv as number);
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [companies, columns, sort, view]);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">
          The {companies.length} companies trading closest to their 52-week {view.anchor}. Select a company to see its
          price chart. Column headers sort the table.
        </caption>
        <thead>
          <tr className="border-b border-line text-left text-ink-muted">
            {columns.map((col) => {
              const active = sort.key === col.key;
              return (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                  className={`px-2 py-2 font-medium whitespace-nowrap sm:px-2.5 ${col.numeric ? "text-right" : ""} ${
                    col.visibility ?? ""
                  }`}
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
            const band = bandOf(view, c);
            const isSelected = c.ticker === selected;
            return (
              <tr
                key={c.ticker}
                onClick={() => onSelect(c.ticker)}
                className={`cursor-pointer border-b border-line last:border-0 ${view.row[band]} ${
                  isSelected ? "outline-2 -outline-offset-2 outline-accent" : "hover:bg-surface-2"
                }`}
              >
                <td className="px-2 py-2.5 text-right text-ink-muted sm:px-2.5">{view.rank(c)}</td>
                <td className="px-2 py-2.5 font-semibold sm:px-2.5">
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
                <td className={`max-w-40 truncate px-2 py-2.5 sm:px-2.5 xl:max-w-48 ${visibilityOf("name")}`} title={c.name}>
                  {c.name}
                </td>
                <td
                  className={`max-w-36 truncate px-2 py-2.5 text-ink-muted sm:px-2.5 ${visibilityOf("sector")}`}
                  title={c.sector}
                >
                  {c.sector}
                </td>
                <td className="px-2 py-2.5 text-right whitespace-nowrap sm:px-2.5">{formatPrice(c.price, c.currency)}</td>
                <td className={`px-2 py-2.5 text-right whitespace-nowrap text-ink-muted sm:px-2.5 ${visibilityOf("low52")}`}>
                  {formatPrice(c.low52, c.currency)}
                </td>
                <td
                  className={`px-2 py-2.5 text-right whitespace-nowrap text-ink-muted sm:px-2.5 ${visibilityOf("high52")}`}
                >
                  {formatPrice(c.high52, c.currency)}
                </td>
                <td className={`px-2 py-2.5 text-right font-semibold whitespace-nowrap sm:px-2.5 ${view.text[band]}`}>
                  <span className="sr-only">{view.bandLabel[band]}: </span>
                  {formatPct(view.distance(c))}
                </td>
                <td className="min-w-14 px-2 py-2.5 sm:min-w-28 sm:px-2.5">
                  <div className="flex items-center gap-2">
                    <RangeRail position={c.rangePosition} low={c.low52} high={c.high52} zone={view.zone} />
                    <span className="hidden w-8 shrink-0 text-right text-xs text-ink-muted sm:inline">
                      {c.rangePosition === null ? "–" : `${Math.round(c.rangePosition)}%`}
                    </span>
                  </div>
                </td>
                <td
                  className={`px-2 py-2.5 text-right whitespace-nowrap sm:px-2.5 ${visibilityOf("avgDailyValue")}`}
                >
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
