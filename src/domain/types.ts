// Core domain types. Currency is always integer BDT (whole Taka, never floats).
// Every record below the Month level is month-scoped via `monthId` ("2026-06").

export type Channel = "cash" | "online";
export type Bucket = "our" | "songsar";
export type MonthStatus = "active" | "closed";

export type BazarMode = "monthly_shukna" | "daily_kacha";
export type FixedKind = "stable" | "variable";

export interface Month {
  id: string; // "2026-06"
  label: string; // "June 2026"
  status: MonthStatus;
  carryOverCash: number; // closing cash from previous month
  carryOverOnline: number; // closing online balance from previous month
}

export interface Income {
  id: string;
  monthId: string;
  source: string; // "Ma", "Abid", "Online pay"
  amount: number;
  channel: Channel;
  bucket: Bucket;
  date: string; // ISO date
}

export interface FixedExpense {
  id: string;
  monthId: string;
  name: string; // "House rent", "Current bill"
  amount: number;
  paid: boolean;
  kind: FixedKind; // variable bills prompt monthly confirmation
  channel: Channel;
  bucket: Bucket;
  paidDate?: string;
}

export interface LineItem {
  name: string; // may be Bengali
  amount: number;
}

export interface BazarEntry {
  id: string;
  monthId: string;
  mode: BazarMode;
  date: string;
  channel: Channel;
  bucket: Bucket;
  lineItems: LineItem[];
  total: number; // derived = sum(lineItems)
}

export interface Labor {
  id: string;
  monthId: string;
  name: string; // "Notun Bua", "Rubina"
  ratePerDay: number;
  daysWorked: number;
  paid: boolean;
  channel: Channel;
  bucket: Bucket;
  // pay = ratePerDay * daysWorked
}

export interface Extra {
  id: string;
  monthId: string;
  name: string;
  amount: number;
  channel: Channel;
  bucket: Bucket;
  date: string;
}

/** A snapshot of all data — used for export / import round-trips. */
export interface BackupData {
  version: number;
  exportedAt: string;
  months: Month[];
  incomes: Income[];
  fixed: FixedExpense[];
  bazar: BazarEntry[];
  labor: Labor[];
  extras: Extra[];
}
