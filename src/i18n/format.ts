// Re-export the canonical money helpers plus light date formatting.
export { formatTaka, formatNumber, parseTakaInput } from "../domain/money";

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** ISO date ("2026-06-02") -> "2 Jun". Falls back to the raw string. */
export function formatShortDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  const day = parseInt(m[3], 10);
  const month = parseInt(m[2], 10);
  return `${day} ${MONTHS_SHORT[month - 1] ?? ""}`.trim();
}

/** Today's date as an ISO yyyy-mm-dd string (local). */
export function todayISO(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}
