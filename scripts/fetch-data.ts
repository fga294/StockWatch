/**
 * Builds data/snapshot.json for the dashboard.
 *
 *   npm run fetch-data
 *
 * Pipeline:
 *   1. Load the S&P/ASX 300 list (data/asx300.json) and drop LICs, ETFs and
 *      listed funds, keeping operating companies.
 *   2. Fetch ~12 months of daily OHLCV for each from Yahoo Finance (.AX).
 *   3. Rank by average daily value traded (close × volume, last 30 completed
 *      sessions) and keep the top 200.
 *   4. Fetch sector/industry for those 200.
 *   5. Compute 52-week high/low and proximity metrics, rank, and write the file.
 *
 * Requests are batched with a delay between batches and retried once; tickers
 * that still fail are skipped and reported at the end.
 */
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import YahooFinance from "yahoo-finance2";
import {
  averageDailyValue,
  barToTuple,
  fiftyTwoWeekRange,
  isValidBar,
  lastYearOfBars,
  pctAboveLow,
  pctBelowHigh,
  rangePosition,
  rankBy,
  round,
} from "../src/lib/metrics";
import {
  INCLUDED_TYPES,
  type CompanyRecord,
  type ConstituentFile,
  type DailyBar,
  type SkippedTicker,
  type Snapshot,
} from "../src/lib/types";

const ROOT = path.resolve(import.meta.dirname, "..");
const CONSTITUENTS_FILE = path.join(ROOT, "data", "asx300.json");
const SNAPSHOT_FILE = path.join(ROOT, "data", "snapshot.json");

const TARGET_SIZE = 200;
const ADV_DAYS = 30;
const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 500;
const RETRY_DELAY_MS = 2000;
/** Lookback a little over a year so the 365-day window is fully covered. */
const HISTORY_DAYS = 380;
/** Need at least this many sessions to compute a 30-day average reliably. */
const MIN_BARS = ADV_DAYS;
/** Treat a ticker as suspended if it hasn't traded for this many days. */
const MAX_STALE_DAYS = 10;
/** Yahoo instrument types that are never operating companies. */
const FUND_INSTRUMENT_TYPES = new Set(["ETF", "MUTUALFUND", "MONEYMARKET"]);

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

class SkipError extends Error {}

/** Run `fn` once, and once more after a pause if it throws (unless it's a SkipError). */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof SkipError) throw err;
    await sleep(RETRY_DELAY_MS);
    return fn();
  }
}

/** Process items in small concurrent batches, pausing between batches. */
async function inBatches<T, R>(
  items: readonly T[],
  label: string,
  worker: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = [];
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    results.push(...(await Promise.allSettled(batch.map(worker))));
    const done = Math.min(i + BATCH_SIZE, items.length);
    process.stdout.write(`\r  ${label}: ${done}/${items.length}`);
    if (done < items.length) await sleep(BATCH_DELAY_MS);
  }
  process.stdout.write("\n");
  return results;
}

const errorMessage = (err: unknown) =>
  (err instanceof Error ? err.message : String(err)).split("\n")[0].slice(0, 160);

interface PriceData {
  ticker: string;
  name: string;
  currency: string;
  price: number;
  bars: DailyBar[];
  avgDailyValue: number;
}

/** Converts a bar timestamp to the exchange-local trading date (YYYY-MM-DD). */
function localDate(date: Date, gmtOffsetSeconds: number): string {
  return new Date(date.getTime() + gmtOffsetSeconds * 1000).toISOString().slice(0, 10);
}

async function fetchPriceData(ticker: string, name: string): Promise<PriceData> {
  const symbol = `${ticker}.AX`;
  const period1 = new Date(Date.now() - HISTORY_DAYS * 86_400_000);
  const chart = await withRetry(() => yf.chart(symbol, { period1, interval: "1d" }));
  const { meta } = chart;

  if (FUND_INSTRUMENT_TYPES.has(meta.instrumentType)) {
    throw new SkipError(`excluded: Yahoo instrument type ${meta.instrumentType}`);
  }

  const bars: DailyBar[] = chart.quotes
    .map((q) => ({
      date: localDate(q.date, meta.gmtoffset),
      open: q.open ?? NaN,
      high: q.high ?? NaN,
      low: q.low ?? NaN,
      close: q.close ?? NaN,
      volume: q.volume ?? NaN,
    }))
    .filter(isValidBar);

  if (bars.length < MIN_BARS) {
    throw new SkipError(`insufficient history (${bars.length} valid sessions, need ${MIN_BARS})`);
  }
  const last = bars[bars.length - 1];
  const staleDays = (Date.now() - Date.parse(last.date)) / 86_400_000;
  if (staleDays > MAX_STALE_DAYS) {
    throw new SkipError(`no trading since ${last.date} (suspended or delisted?)`);
  }
  const price = meta.regularMarketPrice;
  if (!(price > 0)) throw new SkipError("no current price");

  // If today's session is still open, its bar is partial: leave it out of the
  // volume average so mid-session runs don't understate value traded.
  const sessionOpen = Date.now() < meta.currentTradingPeriod.regular.end.getTime();
  const todayLocal = localDate(meta.currentTradingPeriod.regular.start, meta.gmtoffset);
  const completed = sessionOpen && last.date === todayLocal ? bars.slice(0, -1) : bars;
  const avgDailyValue = averageDailyValue(completed, ADV_DAYS);
  if (avgDailyValue === null) throw new SkipError("no volume data");

  return { ticker, name: meta.longName ?? name, currency: meta.currency, price, bars, avgDailyValue };
}

interface Profile {
  sector: string;
  industry: string | null;
}

async function fetchProfile(ticker: string): Promise<Profile> {
  const summary = await withRetry(() =>
    yf.quoteSummary(`${ticker}.AX`, { modules: ["assetProfile"] }),
  );
  const sector = summary.assetProfile?.sector;
  if (!sector) throw new Error("no sector in assetProfile");
  return { sector, industry: summary.assetProfile?.industry ?? null };
}

/** Ranks by proximity to the low (array order) and records each rank by proximity to the high. */
function rankWithHighs(records: Omit<CompanyRecord, "rank" | "highRank">[]): CompanyRecord[] {
  const highRanks = new Map(rankBy(records, (r) => r.pctBelowHigh).map((r) => [r.ticker, r.rank]));
  return rankBy(records, (r) => r.pctAboveLow).map((r) => ({ ...r, highRank: highRanks.get(r.ticker)! }));
}

async function main() {
  const started = Date.now();
  const file = JSON.parse(await readFile(CONSTITUENTS_FILE, "utf8")) as ConstituentFile;

  const excluded = file.constituents.filter((c) => !INCLUDED_TYPES.includes(c.type));
  const eligible = file.constituents.filter((c) => INCLUDED_TYPES.includes(c.type));
  console.log(
    `${file.index} list as of ${file.asOf}: ${file.constituents.length} constituents, ` +
      `${excluded.length} excluded (LICs/funds), ${eligible.length} operating companies.`,
  );

  // 1. Price history for every eligible company.
  console.log("Fetching 12-month daily price history…");
  const skipped: SkippedTicker[] = [];
  const priceResults = await inBatches(eligible, "prices", (c) => fetchPriceData(c.code, c.name));
  const priced: PriceData[] = [];
  priceResults.forEach((r, i) => {
    if (r.status === "fulfilled") priced.push(r.value);
    else skipped.push({ ticker: eligible[i].code, reason: errorMessage(r.reason) });
  });

  // 2. Keep the 200 most actively traded by value.
  const universe = [...priced].sort((a, b) => b.avgDailyValue - a.avgDailyValue).slice(0, TARGET_SIZE);
  console.log(
    `Ranked ${priced.length} companies by ${ADV_DAYS}-day average value traded; keeping top ${universe.length}.`,
  );

  // 3. Sector for each. A missing sector is not fatal: the price data is fine.
  console.log("Fetching sector profiles…");
  const profileResults = await inBatches(universe, "profiles", (p) => fetchProfile(p.ticker));
  const sectorOverrides = new Map(eligible.filter((c) => c.sector).map((c) => [c.code, c.sector!]));
  const profileWarnings: string[] = [];
  const profiles: Profile[] = profileResults.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    const { ticker } = universe[i];
    const fallback = sectorOverrides.get(ticker);
    profileWarnings.push(
      `${ticker}: ${errorMessage(r.reason)} → ${fallback ? `using "${fallback}" from asx300.json` : '"Unknown"'}`,
    );
    return { sector: fallback ?? "Unknown", industry: null };
  });

  // 4. Metrics.
  const records: Omit<CompanyRecord, "rank" | "highRank">[] = [];
  universe.forEach((p, i) => {
    const range = fiftyTwoWeekRange(p.bars, p.price);
    const pct = range && pctAboveLow(p.price, range.low);
    const pctHigh = range && pctBelowHigh(p.price, range.high);
    if (!range || pct === null || pctHigh === null) {
      skipped.push({ ticker: p.ticker, reason: "could not compute 52-week range" });
      return;
    }
    const pos = rangePosition(p.price, range.low, range.high);
    records.push({
      ticker: p.ticker,
      symbol: `${p.ticker}.AX`,
      name: p.name,
      sector: profiles[i].sector,
      industry: profiles[i].industry,
      currency: p.currency,
      price: round(p.price),
      avgDailyValue: Math.round(p.avgDailyValue),
      low52: round(range.low),
      high52: round(range.high),
      low52Date: range.lowDate,
      high52Date: range.highDate,
      pctAboveLow: round(pct, 3),
      pctBelowHigh: round(pctHigh, 3),
      rangePosition: pos === null ? null : round(pos, 2),
      history: lastYearOfBars(p.bars).map(barToTuple),
    });
  });

  const snapshot: Snapshot = {
    lastUpdated: new Date().toISOString(),
    source: "Yahoo Finance via yahoo-finance2 (delayed ~20 min)",
    universe: {
      index: file.index,
      constituentsAsOf: file.asOf,
      constituentCount: file.constituents.length,
      excluded: excluded.map((c) => ({ ticker: c.code, name: c.name, type: c.type })),
      eligibleCount: eligible.length,
      analysedCount: records.length,
      targetSize: TARGET_SIZE,
    },
    companies: rankWithHighs(records),
    skipped: skipped.sort((a, b) => a.ticker.localeCompare(b.ticker)),
  };

  // Write atomically so the dashboard never reads a half-written file.
  await mkdir(path.dirname(SNAPSHOT_FILE), { recursive: true });
  const tmp = `${SNAPSHOT_FILE}.tmp`;
  await writeFile(tmp, JSON.stringify(snapshot) + "\n");
  await rename(tmp, SNAPSHOT_FILE);

  // Report.
  const secs = ((Date.now() - started) / 1000).toFixed(0);
  console.log(`\nWrote ${path.relative(ROOT, SNAPSHOT_FILE)}: ${records.length} companies in ${secs}s.`);
  if (snapshot.skipped.length > 0) {
    console.log(`\nSkipped ${snapshot.skipped.length} ticker(s):`);
    for (const s of snapshot.skipped) console.log(`  ${s.ticker.padEnd(6)} ${s.reason}`);
  } else {
    console.log("No tickers skipped.");
  }
  if (profileWarnings.length > 0) {
    console.log(`\nYahoo sector unavailable for ${profileWarnings.length} ticker(s):`);
    for (const w of profileWarnings) console.log(`  ${w}`);
  }
  if (records.length < TARGET_SIZE) {
    console.warn(`\nWarning: only ${records.length} companies analysed (target ${TARGET_SIZE}).`);
  }
}

main().catch((err) => {
  console.error("fetch-data failed:", err);
  process.exit(1);
});
