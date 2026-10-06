import { describe, expect, it } from "vitest";
import {
  averageDailyValue,
  barToTuple,
  fiftyTwoWeekRange,
  pctAboveLow,
  proximityBand,
  rangePosition,
  rankByProximityToLow,
  sectorCountsNearLow,
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

  it("only looks back 365 days from the latest bar", () => {
    const r = fiftyTwoWeekRange([
      bar("2025-01-01", 1, 100), // older than 52 weeks: ignored
      bar("2025-12-01", 9, 12),
      bar("2026-06-01", 10, 11),
    ]);
    expect(r?.low).toBe(9);
    expect(r?.high).toBe(12);
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

describe("proximityBand", () => {
  it("bands at 5% and 10% inclusive", () => {
    expect(proximityBand(0)).toBe("red");
    expect(proximityBand(5)).toBe("red");
    expect(proximityBand(5.01)).toBe("amber");
    expect(proximityBand(10)).toBe("amber");
    expect(proximityBand(10.01)).toBe("neutral");
  });
});

describe("rankByProximityToLow", () => {
  it("ranks closest-to-low first with deterministic ties", () => {
    const ranked = rankByProximityToLow([
      { ticker: "CCC", pctAboveLow: 12 },
      { ticker: "BBB", pctAboveLow: 1 },
      { ticker: "AAA", pctAboveLow: 1 },
    ]);
    expect(ranked.map((r) => [r.ticker, r.rank])).toEqual([
      ["AAA", 1],
      ["BBB", 2],
      ["CCC", 3],
    ]);
  });

  it("does not mutate its input", () => {
    const input = [
      { ticker: "B", pctAboveLow: 2 },
      { ticker: "A", pctAboveLow: 1 },
    ];
    rankByProximityToLow(input);
    expect(input[0].ticker).toBe("B");
  });
});

describe("summarise / sectorCountsNearLow", () => {
  const companies = [
    { sector: "Energy", pctAboveLow: 1 },
    { sector: "Energy", pctAboveLow: 8 },
    { sector: "Materials", pctAboveLow: 4 },
    { sector: "Materials", pctAboveLow: 40 },
    { sector: "Tech", pctAboveLow: 10 },
  ];

  it("counts within 5% and 10%", () => {
    const s = summarise(companies);
    expect(s.analysed).toBe(5);
    expect(s.within5).toBe(2);
    expect(s.within10).toBe(4);
    expect(s.topSector).toEqual({ sector: "Energy", count: 2 });
  });

  it("returns a null top sector when nothing is near its low", () => {
    expect(summarise([{ sector: "X", pctAboveLow: 50 }]).topSector).toBeNull();
    expect(summarise([]).topSector).toBeNull();
  });

  it("sorts sectors by count then name", () => {
    expect(sectorCountsNearLow(companies)).toEqual([
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
