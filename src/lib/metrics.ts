/**
 * Pure metric calculations. No I/O here, so everything is unit-testable and
 * shared between the fetch script (server) and the dashboard (client).
 */
import type { BarTuple, DailyBar, FiftyTwoWeekRange } from "./types";

export const NEAR_LOW_RED_PCT = 5;
export const NEAR_LOW_AMBER_PCT = 10;

const isPositive = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n) && n > 0;

/** A bar is usable when its high/low/close are positive and high ≥ low. */
export function isValidBar(bar: DailyBar): boolean {
  return (
    isPositive(bar.high) &&
    isPositive(bar.low) &&
    isPositive(bar.close) &&
    bar.high >= bar.low &&
    Number.isFinite(bar.volume) &&
    bar.volume >= 0
  );
}

/** Same calendar date one year earlier (YYYY-MM-DD). 29 Feb rolls to 1 Mar. */
export function oneYearBefore(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Valid bars from the same calendar date one year before the latest bar,
 * inclusive, up to the latest bar, in date order. This matches Yahoo's own
 * 52-week window.
 */
export function lastYearOfBars(bars: readonly DailyBar[]): DailyBar[] {
  const valid = bars.filter(isValidBar).sort((a, b) => a.date.localeCompare(b.date));
  if (valid.length === 0) return [];
  const start = oneYearBefore(valid[valid.length - 1].date);
  return valid.filter((b) => b.date >= start);
}

/**
 * 52-week high/low from daily highs and lows over the year ending on the
 * most recent bar (see lastYearOfBars).
 *
 * If `currentPrice` is given and sits outside the bar range (e.g. a delayed
 * quote ticked after the last bar was built), the range is widened to include
 * it, so % above low is never negative and range position stays within 0–100.
 *
 * Returns null when there is no usable data.
 */
export function fiftyTwoWeekRange(
  bars: readonly DailyBar[],
  currentPrice?: number,
): FiftyTwoWeekRange | null {
  const window = lastYearOfBars(bars);
  if (window.length === 0) return null;

  let low = window[0];
  let high = window[0];
  for (const b of window) {
    if (b.low < low.low) low = b;
    if (b.high > high.high) high = b;
  }

  const range: FiftyTwoWeekRange = {
    low: low.low,
    high: high.high,
    lowDate: low.date,
    highDate: high.date,
  };

  if (isPositive(currentPrice)) {
    const lastDate = window[window.length - 1].date;
    if (currentPrice < range.low) {
      range.low = currentPrice;
      range.lowDate = lastDate;
    }
    if (currentPrice > range.high) {
      range.high = currentPrice;
      range.highDate = lastDate;
    }
  }
  return range;
}

/** (price − low) / low × 100. Null if inputs are missing or low ≤ 0. */
export function pctAboveLow(price: number, low: number): number | null {
  if (!isPositive(price) || !isPositive(low)) return null;
  return ((price - low) / low) * 100;
}

/**
 * (price − low) / (high − low) × 100, clamped to 0–100.
 * 0 = at the 52-week low, 100 = at the 52-week high.
 * Null when the range is degenerate (high == low) or inputs are missing,
 * because "position within a range of zero width" is undefined.
 */
export function rangePosition(price: number, low: number, high: number): number | null {
  if (!isPositive(price) || !isPositive(low) || !isPositive(high)) return null;
  const width = high - low;
  if (width <= 0) return null;
  const pos = ((price - low) / width) * 100;
  return Math.min(100, Math.max(0, pos));
}

/**
 * Mean daily value traded (close × volume) over the last `days` usable bars.
 * Close × volume is a standard proxy for turnover when intraday VWAP is not
 * available. Null when there are no usable bars.
 */
export function averageDailyValue(bars: readonly DailyBar[], days = 30): number | null {
  const recent = bars.filter(isValidBar).slice(-days);
  if (recent.length === 0) return null;
  const total = recent.reduce((sum, b) => sum + b.close * b.volume, 0);
  return total / recent.length;
}

export type ProximityBand = "red" | "amber" | "neutral";

/** Colour band for a % above low: red ≤ 5%, amber 5–10%, neutral above. */
export function proximityBand(pct: number): ProximityBand {
  if (pct <= NEAR_LOW_RED_PCT) return "red";
  if (pct <= NEAR_LOW_AMBER_PCT) return "amber";
  return "neutral";
}

/**
 * Sort by % above low (closest first) and assign 1-based ranks.
 * Ties break on ticker so the order is deterministic.
 */
export function rankByProximityToLow<T extends { ticker: string; pctAboveLow: number }>(
  items: readonly T[],
): (T & { rank: number })[] {
  return [...items]
    .sort((a, b) => a.pctAboveLow - b.pctAboveLow || a.ticker.localeCompare(b.ticker))
    .map((item, i) => ({ ...item, rank: i + 1 }));
}

export interface SummaryStats {
  analysed: number;
  within5: number;
  within10: number;
  /** Sector with the most companies within 10% of their low (null if none). */
  topSector: { sector: string; count: number } | null;
}

/** Count of companies within `thresholdPct` of their low, per sector, largest first. */
export function sectorCountsNearLow(
  companies: readonly { sector: string; pctAboveLow: number }[],
  thresholdPct = NEAR_LOW_AMBER_PCT,
): { sector: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const c of companies) {
    if (c.pctAboveLow <= thresholdPct) counts.set(c.sector, (counts.get(c.sector) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([sector, count]) => ({ sector, count }))
    .sort((a, b) => b.count - a.count || a.sector.localeCompare(b.sector));
}

export function summarise(
  companies: readonly { sector: string; pctAboveLow: number }[],
): SummaryStats {
  const sectors = sectorCountsNearLow(companies);
  return {
    analysed: companies.length,
    within5: companies.filter((c) => c.pctAboveLow <= NEAR_LOW_RED_PCT).length,
    within10: companies.filter((c) => c.pctAboveLow <= NEAR_LOW_AMBER_PCT).length,
    topSector: sectors[0] ?? null,
  };
}

/** Rounds to a fixed number of decimals (keeps snapshot.json compact). */
export function round(n: number, decimals = 4): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

export function barToTuple(b: DailyBar): BarTuple {
  return [b.date, round(b.open), round(b.high), round(b.low), round(b.close), Math.round(b.volume)];
}

export function tupleToBar([date, open, high, low, close, volume]: BarTuple): DailyBar {
  return { date, open, high, low, close, volume };
}
