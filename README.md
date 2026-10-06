# StockWatch: ASX 52-week lows

A single-page dashboard showing which of the 200 most actively traded ASX
companies are trading closest to their 52-week low.

- Summary of how many companies are within 5% and 10% of their low, and which
  sector has the most
- A sortable table of the 20 closest, with red (≤ 5%) and amber (5–10%) rows
  and a range rail for each
- A % above low bar chart, a sector breakdown, and a scatter of all 200
  (distance from low vs value traded)
- Click any row, bar or point to see that company's 12-month price chart
  with its 52-week low and high marked

Prices are delayed and this is **not financial advice**.

## Setup

Requires Node.js 22 or later (`yahoo-finance2` v4 doesn't support older Node).

```bash
npm install
npm run fetch-data   # build data/snapshot.json from Yahoo Finance (~2–3 minutes)
npm run dev          # http://localhost:3000
```

A snapshot is committed in `data/snapshot.json`, so `npm run dev` works
straight after cloning. Run `npm run fetch-data` to refresh it.

| Script               | What it does                                               |
| -------------------- | ---------------------------------------------------------- |
| `npm run fetch-data` | Rebuilds `data/snapshot.json` from Yahoo Finance           |
| `npm run dev`        | Starts the dev server (reads the snapshot on each request) |
| `npm run build`      | Production build (bakes the current snapshot into the build) |
| `npm start`          | Serves the production build                                |
| `npm test`           | Unit tests for the metric calculations (Vitest)            |
| `npm run lint`       | ESLint                                                     |

The dashboard never calls Yahoo. It only reads the snapshot. In production
the page and every `/api/history/<ticker>` response are prerendered at build
time, so **after refreshing data, run `npm run build` again** before
`npm start`.

## How the universe is chosen

1. **Start from the S&P/ASX 300.** The constituent list lives in
   [`data/asx300.json`](data/asx300.json).
2. **Keep operating companies only.** Each constituent is tagged with a
   `type`:
   - `company`, `reit` (A-REITs and property groups) and `stapled`
     (stapled infrastructure such as Transurban and APA) are **included**.
     They're operating businesses even when structured as trusts.
   - `lic` (listed investment companies such as AFI, ARG and WAM) and
     `listed-trust` (listed credit and income funds such as MXT, GCI and QRI)
     are **excluded**. They're pooled investment vehicles.
   - `etf` is excluded. The S&P/ASX 300 contains none, but the type exists
     for safety. The fetch script also drops anything Yahoo reports as an ETF
     or mutual fund.

   Yahoo reports LICs as ordinary `EQUITY`, so the classification has to live
   in our own file and can't come from Yahoo's quote type. The 2026-10-06 list
   has 300 constituents, 16 excluded and 284 eligible.
3. **Rank by average daily value traded** (close × volume) over the last 30
   completed trading sessions, and keep the top 200. Value rather than share
   count stops cheap, high-volume stocks from dominating. A session still in
   progress is left out of the average so mid-day runs don't understate
   turnover.

### Updating the constituent list

S&P rebalances the index quarterly (March, June, September and December).
The list in `data/asx300.json` was captured on **2026-10-06**
from [Market Index's S&P/ASX 300 page](https://www.marketindex.com.au/asx300).
The official list is on
[S&P Dow Jones Indices](https://www.spglobal.com/spdji/en/indices/equity/sp-asx-300/).
Both sites block scripted requests, which is why the list is stored in the
repo and not fetched by the pipeline.

To update it:

1. Get the current list of ASX codes from either source. Market Index's
   table is backed by
   `https://www.marketindex.com.au/data-api/api/v1/securities-list/AU/XASX/asx300/quote`,
   which works from a browser session but blocks scripted requests.
2. Update `constituents` in `data/asx300.json`. Each entry needs `code`,
   `name` and `type`. Classify any new entry: is it an operating business, or
   a LIC or fund? Names containing "Investment(s)", "Fund", "Income Trust" or
   "Capital Investments" usually need a closer look.
3. Update `asOf`.
4. Optional: add `"sector"` to an entry to supply a fallback sector when
   Yahoo has no profile for that ticker (currently only SGH).
5. Run `npm run fetch-data`.

## Data source and its limitations

All market data comes from **Yahoo Finance** via the unofficial
[`yahoo-finance2`](https://github.com/gadicc/yahoo-finance2) package, using
the `.AX` suffix for ASX tickers.

- **Delayed.** ASX quotes on Yahoo are delayed about 20 minutes. The
  dashboard shows when the snapshot was taken, not live prices.
- **Unofficial.** Yahoo has no public API. Endpoints can change or
  rate-limit without notice, and the package can break until it's updated.
- **Unadjusted prices.** The 52-week range uses raw daily highs and lows (the
  prices that actually traded), not dividend- or split-adjusted values. A
  large special dividend or capital return can therefore show up as a new
  low.
- **Value traded is approximate.** Close × volume stands in for turnover,
  since Yahoo's daily bars don't include VWAP. It reflects whatever volume
  Yahoo reports for the `.AX` listing, which may not match total
  cross-venue turnover.
- **Sectors** are Yahoo's (Morningstar-style: "Basic Materials", "Consumer
  Cyclical", …), not official GICS sectors.
- **Constituent list** is a point-in-time copy and goes stale after each
  quarterly rebalance until updated.

## How the metrics are calculated

All calculations live in [`src/lib/metrics.ts`](src/lib/metrics.ts), with
unit tests in `src/lib/metrics.test.ts`.

- **52-week high and low:** the highest daily high and lowest daily low from
  the same calendar date one year before the latest bar, through the latest
  bar. This matches Yahoo's own window. They're calculated from the bars
  rather than taken from Yahoo's quote fields, so every company is measured
  the same way. If the delayed current price is outside that range, the range
  is widened to include it.
- **% above 52-week low** = (price − low) / low × 100
- **Range position** = (price − low) / (high − low) × 100, where 0% means
  at the low. It's shown as "–" if high equals low.
- Companies are ranked by % above low, closest first, with ties broken by
  ticker.

The pipeline batches Yahoo requests (5 at a time, with a 500 ms pause between
batches) and retries each request once. A ticker is skipped and reported at
the end of the run if it still fails, has fewer than 30 sessions of history,
or hasn't traded in 10 days (suspended or delisted). A company with no Yahoo
sector profile is kept, using the fallback sector from `asx300.json` or
"Unknown".

## Project structure

```
data/
  asx300.json              S&P/ASX 300 constituents with type classification
  snapshot.json            Generated dataset (npm run fetch-data)
scripts/
  fetch-data.ts            Data pipeline
src/
  lib/
    types.ts               Data model
    metrics.ts             Metric calculations (+ metrics.test.ts)
    snapshot.ts            Server-side snapshot loader
    format.ts              Number/date formatting
  app/
    page.tsx               Dashboard page (server component)
    api/history/[ticker]/  12-month bars per company, from the snapshot
  components/              Table, summary cards, detail panel, charts
```
