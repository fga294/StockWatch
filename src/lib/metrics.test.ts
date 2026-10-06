import { describe, expect, it } from "vitest";
import {
  averageDailyValue,
  barToTuple,
  fiftyTwoWeekRange,
  lastYearOfBars,
  oneYearBefore,
  pctAboveLow,
  pctBelowHigh,
  proximityBand,
  rangePosition,
  rankBy,
  sectorCountsNear,
  summarise,
  tupleToBar,
} from "./metrics";
import type { DailyBar } from "./types";

const bar = (date: string, low: number, high: number, close = (low + high) / 2, volume = 1000): DailyBar => ({
  date,
  open: close,
  high,
  low,
  close,
  volume,
});

describe("pctAboveLow", () => {
  it("is 0 when price is at the low", () => {
    expect(pctAboveLow(10, 10)).toBe(0);
  });

  it("computes percentage above the low", () => {
    expect(pctAboveLow(11, 10)).toBeCloseTo(10);
    expect(pctAboveLow(20, 10)).toBeCloseTo(100);
  });

  it("returns null for missing or non-positive inputs", () => {
    expect(pctAboveLow(NaN, 10)).toBeNull();
    expect(pctAboveLow(10, 0)).toBeNull();
    expect(pctAboveLow(10, -1)).toBeNull();
    expect(pctAboveLow(undefined as unknown as number, 10)).toBeNull();
  });
});

describe("rangePosition", () => {
  it("is 0 at the low and 100 at the high", () => {
    expect(rangePosition(10, 10, 20)).toBe(0);
    expect(rangePosition(20, 10, 20)).toBe(100);
    expect(rangePosition(15, 10, 20)).toBe(50);
  });

  it("returns null when high == low (zero-width range)", () => {
    expect(rangePosition(10, 10, 10)).toBeNull();
  });

  it("returns null when high < low (corrupt data)", () => {
    expect(rangePosition(10, 12, 11)).toBeNull();
  });

  it("clamps prices outside the range", () => {
    expect(rangePosition(9, 10, 20)).toBe(0);
    expect(rangePosition(25, 10, 20)).toBe(100);
  });

  it("returns null for missing inputs", () => {
    expect(rangePosition(NaN, 10, 20)).toBeNull();
    expect(rangePosition(15, NaN, 20)).toBeNull();
  });
});

describe("fiftyTwoWeekRange", () => {
  it("uses daily highs and lows, not closes", () => {
    const r = fiftyTwoWeekRange([
      bar("2026-01-02", 9, 12, 10),
      bar("2026-03-02", 8, 15, 14),
      bar("2026-06-01", 10, 11, 10.5),
    ]);
    expect(r).toEqual({ low: 8, high: 15, lowDate: "2026-03-02", highDate: "2026-03-02" });
  });

  it("only looks back one year from the latest bar", () => {
    const r = fiftyTwoWeekRange([
      bar("2025-01-01", 1, 100), // older than a year: ignored
      bar("2025-12-01", 9, 12),
      bar("2026-06-01", 10, 11),
    ]);
    expect(r?.low).toBe(9);
    expect(r?.high).toBe(12);
  });

  it("includes the bar on the same calendar date one year earlier", () => {
    const r = fiftyTwoWeekRange([
      bar("2025-10-05", 1, 100), // one day too old
      bar("2025-10-06", 9, 20), // boundary: included
      bar("2026-10-06", 10, 11),
    ]);
    expect(r).toMatchObject({ low: 9, high: 20, highDate: "2025-10-06" });
  });

  it("does not depend on input order", () => {
    const r = fiftyTwoWeekRange([bar("2026-06-01", 10, 11), bar("2025-01-01", 1, 100), bar("2025-12-01", 9, 12)]);
    expect(r).toMatchObject({ low: 9, high: 12 });
  });

  it("returns null when there is no data", () => {
    expect(fiftyTwoWeekRange([])).toBeNull();
  });

  it("skips bars with missing or invalid values", () => {
    const r = fiftyTwoWeekRange([
      bar("2026-01-02", NaN, 12),
      bar("2026-01-03", 0, 12),
      { date: "2026-01-04", open: 1, high: 5, low: 6, close: 5, volume: 1 }, // high < low
      bar("2026-01-05", 9, 11),
    ]);
    expect(r).toEqual({ low: 9, high: 11, lowDate: "2026-01-05", highDate: "2026-01-05" });
  });

  it("returns null when every bar is invalid", () => {
    expect(fiftyTwoWeekRange([bar("2026-01-02", NaN, NaN)])).toBeNull();
  });

  it("handles a flat history where high == low", () => {
    const r = fiftyTwoWeekRange([bar("2026-01-02", 5, 5), bar("2026-01-03", 5, 5)]);
    expect(r?.low).toBe(5);
    expect(r?.high).toBe(5);
    expect(rangePosition(5, r!.low, r!.high)).toBeNull();
    expect(pctAboveLow(5, r!.low)).toBe(0);
  });

  it("widens the range when the current price is outside it", () => {
    const bars = [bar("2026-01-02", 9, 12), bar("2026-01-05", 10, 11)];
    expect(fiftyTwoWeekRange(bars, 8.5)).toMatchObject({ low: 8.5, lowDate: "2026-01-05", high: 12 });
    expect(fiftyTwoWeekRange(bars, 13)).toMatchObject({ high: 13, highDate: "2026-01-05", low: 9 });
    expect(fiftyTwoWeekRange(bars, 10)).toMatchObject({ low: 9, high: 12 });
  });
});

describe("oneYearBefore / lastYearOfBars", () => {
  it("subtracts a calendar year, rolling 29 Feb forward", () => {
    expect(oneYearBefore("2026-10-06")).toBe("2025-10-06");
    expect(oneYearBefore("2028-02-29")).toBe("2027-03-01");
  });

  it("returns valid bars in the window, sorted", () => {
    const out = lastYearOfBars([bar("2026-03-01", 1, 2), bar("2024-01-01", 1, 2), bar("2026-01-01", NaN, 2)]);
    expect(out.map((b) => b.date)).toEqual(["2026-03-01"]);
    expect(lastYearOfBars([])).toEqual([]);
  });
});

describe("averageDailyValue", () => {
  it("averages close × volume over the last N bars", () => {
    const bars = [
      bar("2026-01-01", 1, 1, 100, 1), // outside the window
      bar("2026-01-02", 1, 2, 2, 100),
      bar("2026-01-03", 1, 4, 4, 50),
    ];
    expect(averageDailyValue(bars, 2)).toBe(200);
  });

  it("uses whatever bars exist when fewer than N", () => {
    expect(averageDailyValue([bar("2026-01-02", 1, 2, 2, 10)], 30)).toBe(20);
  });

  it("counts zero-volume days (they are real, untraded sessions)", () => {
    const bars = [bar("2026-01-02", 1, 2, 2, 100), bar("2026-01-03", 1, 2, 2, 0)];
    expect(averageDailyValue(bars, 30)).toBe(100);
  });

  it("returns null with no usable data", () => {
    expect(averageDailyValue([])).toBeNull();
    expect(averageDailyValue([bar("2026-01-02", NaN, NaN)])).toBeNull();
  });
});

describe("pctBelowHigh", () => {
  it("is 0 when price is at the high", () => {
    expect(pctBelowHigh(20, 20)).toBe(0);
  });

  it("computes percentage below the high", () => {
    expect(pctBelowHigh(18, 20)).toBeCloseTo(10);
    expect(pctBelowHigh(10, 20)).toBeCloseTo(50);
  });

  it("is 0 at the high when high == low (flat range)", () => {
    const r = fiftyTwoWeekRange([bar("2026-01-02", 5, 5)]);
    expect(pctBelowHigh(5, r!.high)).toBe(0);
  });

  it("is never negative once the range is widened to the current price", () => {
    const r = fiftyTwoWeekRange([bar("2026-01-02", 9, 12)], 13);
    expect(pctBelowHigh(13, r!.high)).toBe(0);
  });

  it("returns null for missing or non-positive inputs", () => {
    expect(pctBelowHigh(NaN, 20)).toBeNull();
    expect(pctBelowHigh(10, 0)).toBeNull();
    expect(pctBelowHigh(0, 20)).toBeNull();
  });
});

describe("proximityBand", () => {
  it("bands at 5% and 10% inclusive", () => {
    expect(proximityBand(0)).toBe("within5");
    expect(proximityBand(5)).toBe("within5");
    expect(proximityBand(5.01)).toBe("within10");
    expect(proximityBand(10)).toBe("within10");
    expect(proximityBand(10.01)).toBe("beyond");
  });
});

describe("rankBy", () => {
  const items = [
    { ticker: "CCC", pctAboveLow: 12, pctBelowHigh: 1 },
    { ticker: "BBB", pctAboveLow: 1, pctBelowHigh: 30 },
    { ticker: "AAA", pctAboveLow: 1, pctBelowHigh: 20 },
  ];

  it("ranks closest-to-low first with deterministic ties", () => {
    const ranked = rankBy(items, (c) => c.pctAboveLow);
    expect(ranked.map((r) => [r.ticker, r.rank])).toEqual([
      ["AAA", 1],
      ["BBB", 2],
      ["CCC", 3],
    ]);
  });

  it("ranks closest-to-high first with the other accessor", () => {
    const ranked = rankBy(items, (c) => c.pctBelowHigh);
    expect(ranked.map((r) => r.ticker)).toEqual(["CCC", "AAA", "BBB"]);
  });

  it("does not mutate its input", () => {
    rankBy(items, (c) => c.pctAboveLow);
    expect(items[0].ticker).toBe("CCC");
  });
});

describe("summarise / sectorCountsNear", () => {
  const companies = [
    { sector: "Energy", pctAboveLow: 1, pctBelowHigh: 40 },
    { sector: "Energy", pctAboveLow: 8, pctBelowHigh: 30 },
    { sector: "Materials", pctAboveLow: 4, pctBelowHigh: 2 },
    { sector: "Materials", pctAboveLow: 40, pctBelowHigh: 3 },
    { sector: "Tech", pctAboveLow: 10, pctBelowHigh: 9 },
  ];
  const toLow = (c: (typeof companies)[number]) => c.pctAboveLow;
  const toHigh = (c: (typeof companies)[number]) => c.pctBelowHigh;

  it("counts within 5% and 10% of the low", () => {
    const s = summarise(companies, toLow);
    expect(s.analysed).toBe(5);
    expect(s.within5).toBe(2);
    expect(s.within10).toBe(4);
    expect(s.topSector).toEqual({ sector: "Energy", count: 2 });
  });

  it("counts within 5% and 10% of the high", () => {
    const s = summarise(companies, toHigh);
    expect(s.within5).toBe(2);
    expect(s.within10).toBe(3);
    expect(s.topSector).toEqual({ sector: "Materials", count: 2 });
  });

  it("returns a null top sector when nothing is near", () => {
    expect(summarise([{ sector: "X", pctAboveLow: 50 }], (c) => c.pctAboveLow).topSector).toBeNull();
    expect(summarise([], toLow).topSector).toBeNull();
  });

  it("sorts sectors by count then name", () => {
    expect(sectorCountsNear(companies, toLow)).toEqual([
      { sector: "Energy", count: 2 },
      { sector: "Materials", count: 1 },
      { sector: "Tech", count: 1 },
    ]);
  });
});

describe("bar tuple encoding", () => {
  it("round-trips and rounds prices to 4dp", () => {
    const b: DailyBar = { date: "2026-01-02", open: 1.234567, high: 2, low: 1, close: 1.5, volume: 10.6 };
    expect(tupleToBar(barToTuple(b))).toEqual({ ...b, open: 1.2346, volume: 11 });
  });
});
