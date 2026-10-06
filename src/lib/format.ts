/** Display formatting shared by the table, charts and tooltips. */

/** Share price: 3 decimals under $2 (ASX tick sizes), otherwise 2. */
export function formatPrice(n: number, currency = "AUD"): string {
  const digits = n < 2 ? 3 : 2;
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}

/** "50.0" → "50" so axis ticks read cleanly. */
const trim = (s: string) => s.replace(/\.0$/, "");

/** Large dollar values as $49.2m / $1.3b. */
export function formatValue(n: number): string {
  if (n >= 1e9) return `$${trim((n / 1e9).toFixed(1))}b`;
  if (n >= 1e6) return `$${trim((n / 1e6).toFixed(1))}m`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}k`;
  return `$${n.toFixed(0)}`;
}

export function formatPct(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`;
}

const dateFmt = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" });
const shortDateFmt = new Intl.DateTimeFormat("en-AU", { month: "short", year: "2-digit" });

/** "6 Oct 2026" from YYYY-MM-DD. */
export function formatDate(isoDate: string): string {
  return dateFmt.format(new Date(`${isoDate}T00:00:00`));
}

/** "Oct 26" from YYYY-MM-DD (chart axis). */
export function formatMonth(isoDate: string): string {
  return shortDateFmt.format(new Date(`${isoDate}T00:00:00`));
}

/** "6 Oct 2026, 12:40 pm AEDT" from an ISO timestamp, in Sydney time. */
export function formatTimestamp(iso: string): string {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Australia/Sydney",
    timeZoneName: "short",
  }).format(new Date(iso));
}
