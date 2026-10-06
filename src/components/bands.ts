import { proximityBand, type ProximityBand } from "@/lib/metrics";

/** Fill colour for chart marks in each band (CSS vars, so they follow dark mode). */
export const BAND_FILL: Record<ProximityBand, string> = {
  red: "var(--red-mark)",
  amber: "var(--amber-mark)",
  neutral: "var(--neutral-mark)",
};

/** Table row treatment: tinted background plus a coloured left edge. */
export const BAND_ROW: Record<ProximityBand, string> = {
  red: "bg-red-bg shadow-[inset_3px_0_0_var(--red-mark)]",
  amber: "bg-amber-bg shadow-[inset_3px_0_0_var(--amber-mark)]",
  neutral: "",
};

export const BAND_TEXT: Record<ProximityBand, string> = {
  red: "text-red",
  amber: "text-amber",
  neutral: "text-ink",
};

export const BAND_LABEL: Record<ProximityBand, string> = {
  red: "Within 5% of low",
  amber: "5–10% above low",
  neutral: "More than 10% above low",
};

export const bandFor = (pctAboveLow: number) => proximityBand(pctAboveLow);
