/**
 * Shared data model for the ASX 52-week-low dashboard.
 *
 * The fetch script (scripts/fetch-data.ts) writes a `Snapshot` to
 * data/snapshot.json; the Next.js app only ever reads that file.
 */

/** Classification used in data/asx300.json to decide what is "an operating company". */
export type SecurityType =
  | "company"
  | "reit"
  | "stapled"
  | "lic"
  | "listed-trust"
  | "etf";

/** Types that are kept in the universe. Everything else is excluded. */
export const INCLUDED_TYPES: readonly SecurityType[] = ["company", "reit", "stapled"];

export interface Constituent {
  /** ASX code without suffix, e.g. "BHP". */
  code: string;
  name: string;
  type: SecurityType;
  /** Fallback sector, used only when Yahoo has no profile for the ticker. */
  sector?: string;
}

export interface ConstituentFile {
  index: string;
  /** ISO date (YYYY-MM-DD) the constituent list was captured. */
  asOf: string;
  source: string;
  typeLegend: Record<SecurityType, string>;
  constituents: Constituent[];
}

/** One trading day. Prices are unadjusted, in the listing currency. */
export interface DailyBar {
  /** ISO date, YYYY-MM-DD (exchange-local trading day). */
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Compact on-disk encoding of a DailyBar, used to keep snapshot.json small:
 * [date, open, high, low, close, volume].
 */
export type BarTuple = [date: string, open: number, high: number, low: number, close: number, volume: number];

export interface FiftyTwoWeekRange {
  low: number;
  high: number;
  lowDate: string;
  highDate: string;
}

/** Everything the dashboard needs about one company, minus its price history. */
export interface CompanySummary {
  /** 1-based rank by % above 52-week low (1 = closest to its low). */
  rank: number;
  /** 1-based rank by % below 52-week high (1 = closest to its high). */
  highRank: number;
  /** ASX code, e.g. "BHP". */
  ticker: string;
  /** Yahoo symbol, e.g. "BHP.AX". */
  symbol: string;
  name: string;
  sector: string;
  industry: string | null;
  currency: string;
  price: number;
  /** Average daily value traded (close × volume) over the last 30 completed sessions, in `currency`. */
  avgDailyValue: number;
  low52: number;
  high52: number;
  low52Date: string;
  high52Date: string;
  /** (price − low) / low × 100. */
  pctAboveLow: number;
  /** (high − price) / high × 100. */
  pctBelowHigh: number;
  /** (price − low) / (high − low) × 100, or null when high == low. */
  rangePosition: number | null;
}

export interface CompanyRecord extends CompanySummary {
  history: BarTuple[];
}

export interface SkippedTicker {
  ticker: string;
  reason: string;
}

export interface UniverseInfo {
  index: string;
  constituentsAsOf: string;
  constituentCount: number;
  /** Constituents dropped because they are not operating companies. */
  excluded: { ticker: string; name: string; type: SecurityType }[];
  /** Operating companies we attempted to fetch. */
  eligibleCount: number;
  /** Companies kept after ranking by value traded. */
  analysedCount: number;
  /** Target size of the universe (200). */
  targetSize: number;
}

export interface Snapshot {
  /** ISO timestamp the snapshot was written. */
  lastUpdated: string;
  source: string;
  universe: UniverseInfo;
  /** Sorted by rank (closest to 52-week low first); highRank orders by the high. */
  companies: CompanyRecord[];
  skipped: SkippedTicker[];
}

/** What the page sends to the browser (history is fetched on demand). */
export interface DashboardData {
  lastUpdated: string;
  source: string;
  universe: UniverseInfo;
  companies: CompanySummary[];
  skipped: SkippedTicker[];
}
