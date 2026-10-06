import { NEAR_LOW_AMBER_PCT } from "@/lib/metrics";

interface RangeRailProps {
  /** 0–100, or null when the 52-week range has zero width. */
  position: number | null;
  low: number;
  high: number;
  size?: "sm" | "lg";
}

/**
 * A 52-week range as a horizontal rail: low on the left, high on the right,
 * and a marker for the current price. The hatched zone is the part of the
 * range within 10% of the low *price* (the same threshold as the amber band),
 * so its width differs per company: wide for a stock that barely moved,
 * narrow for one that doubled.
 */
export function RangeRail({ position, low, high, size = "sm" }: RangeRailProps) {
  const lg = size === "lg";
  const width = high - low;
  const zonePct = width > 0 ? Math.min(100, ((low * NEAR_LOW_AMBER_PCT) / 100 / width) * 100) : 100;
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
      <div className="near-low-zone absolute inset-y-0 left-0" style={{ width: `${zonePct}%` }} />
      {position !== null && (
        <div
          className={`absolute inset-y-0 -translate-x-1/2 rounded-full bg-ink ${lg ? "w-1.5" : "w-1"}`}
          style={{ left: `clamp(2px, ${position}%, calc(100% - 2px))` }}
        />
      )}
    </div>
  );
}
