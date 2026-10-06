import { proximityBand, type ProximityBand } from "@/lib/metrics";
import type { CompanySummary } from "@/lib/types";

export type ViewKey = "lows" | "highs";

/**
 * Everything that differs between the "near lows" and "near highs" views.
 * Components take a ViewConfig instead of branching on the view themselves.
 */
export interface ViewConfig {
  key: ViewKey;
  /** Switch label. */
  label: string;
  title: string;
  /** "low" / "high", for building copy like "within 10% of their low". */
  anchor: "low" | "high";
  /** Distance from the anchor, in % (0 = at the 52-week low/high). */
  distance: (c: CompanySummary) => number;
  rank: (c: CompanySummary) => number;
  /** Table column header, e.g. "Above low". */
  distanceLabel: string;
  /** Short header for phones, e.g. "Above". */
  distanceShort: string;
  /** Phrase after a percentage, e.g. "3.2% above low". */
  distancePhrase: string;
  /** Chart axis label, e.g. "% above 52-week low". */
  axisLabel: string;
  /** Which end of the range rail the hatched "within 10%" zone sits at. */
  zone: "low" | "high";
  /** Chart mark colour per band (CSS vars, so they follow dark mode). */
  fill: Record<ProximityBand, string>;
  /** Table row treatment: tinted background plus a coloured left edge. */
  row: Record<ProximityBand, string>;
  text: Record<ProximityBand, string>;
  /** Legend swatches (Tailwind bg classes). */
  swatch: Record<ProximityBand, string>;
  bandLabel: Record<ProximityBand, string>;
  /** Scatter plot shading for the "within 10%" strip. */
  stripFill: string;
  /** Text colour (CSS var) for chart labels tied to the anchor, e.g. the "52w low" line. */
  anchorText: string;
}

export const VIEWS: Record<ViewKey, ViewConfig> = {
  lows: {
    key: "lows",
    label: "Near lows",
    title: "ASX 52-week lows",
    anchor: "low",
    distance: (c) => c.pctAboveLow,
    rank: (c) => c.rank,
    distanceLabel: "Above low",
    distanceShort: "Above",
    distancePhrase: "above low",
    axisLabel: "% above 52-week low",
    zone: "low",
    fill: { within5: "var(--red-mark)", within10: "var(--amber-mark)", beyond: "var(--neutral-mark)" },
    row: {
      within5: "bg-red-bg shadow-[inset_3px_0_0_var(--red-mark)]",
      within10: "bg-amber-bg shadow-[inset_3px_0_0_var(--amber-mark)]",
      beyond: "",
    },
    text: { within5: "text-red", within10: "text-amber", beyond: "text-ink" },
    swatch: { within5: "bg-red-mark", within10: "bg-amber-mark", beyond: "bg-neutral-mark" },
    bandLabel: {
      within5: "Within 5% of low",
      within10: "5–10% above low",
      beyond: "More than 10% above low",
    },
    stripFill: "var(--red-bg)",
    anchorText: "var(--red)",
  },
  highs: {
    key: "highs",
    label: "Near highs",
    title: "ASX 52-week highs",
    anchor: "high",
    distance: (c) => c.pctBelowHigh,
    rank: (c) => c.highRank,
    distanceLabel: "Below high",
    distanceShort: "Below",
    distancePhrase: "below high",
    axisLabel: "% below 52-week high",
    zone: "high",
    fill: { within5: "var(--up-mark)", within10: "var(--up2-mark)", beyond: "var(--neutral-mark)" },
    row: {
      within5: "bg-up-bg shadow-[inset_3px_0_0_var(--up-mark)]",
      within10: "bg-up2-bg shadow-[inset_3px_0_0_var(--up2-mark)]",
      beyond: "",
    },
    text: { within5: "text-up", within10: "text-up2", beyond: "text-ink" },
    swatch: { within5: "bg-up-mark", within10: "bg-up2-mark", beyond: "bg-neutral-mark" },
    bandLabel: {
      within5: "Within 5% of high",
      within10: "5–10% below high",
      beyond: "More than 10% below high",
    },
    stripFill: "var(--up-bg)",
    anchorText: "var(--up)",
  },
};

export const bandOf = (view: ViewConfig, c: CompanySummary) => proximityBand(view.distance(c));
