import { OUTER_BAND_PCT } from "@/lib/metrics";

interface RangeRailProps {
  /** 0–100, or null when the 52-week range has zero width. */
  position: number | null;
  low: number;
  high: number;
  /** Which end the hatched "within 10%" zone is measured from. */
  zone?: "low" | "high";
  size?: "sm" | "lg";
}

/**
 * A 52-week range as a horizontal rail: low on the left, high on the right,
 * and a marker for the current price. The hatched zone is the part of the
 * range within 10% of the low price (or 10% below the high price), the same
 * threshold as the second colour band. Its width therefore differs per
 * company: wide for a stock that barely moved, narrow for one that doubled.
 */
export function RangeRail({ position, low, high, zone = "low", size = "sm" }: RangeRailProps) {
  const lg = size === "lg";
  const width = high - low;
  const anchor = zone === "low" ? low : high;
  const zonePct = width > 0 ? Math.min(100, ((anchor * OUTER_BAND_PCT) / 100 / width) * 100) : 100;
  const label =
    position === null
      ? "Range position unavailable: the 52-week high equals the low"
      : `${position.toFixed(0)}% of the way from the 52-week low to the high`;

  return (
    <div
      role="img"
      aria-label={label}
      className={`relative w-full overflow-hidden rounded-full bg-surface-2 ${lg ? "h-3" : "h-2"}`}
    >
      <div
        className={`absolute inset-y-0 ${zone === "low" ? "near-low-zone left-0" : "near-high-zone right-0"}`}
        style={{ width: `${zonePct}%` }}
      />
      {position !== null && (
        <div
          className={`absolute inset-y-0 -translate-x-1/2 rounded-full bg-ink ${lg ? "w-1.5" : "w-1"}`}
          style={{ left: `clamp(2px, ${position}%, calc(100% - 2px))` }}
        />
      )}
    </div>
  );
}
