import type {
  BazarEntry,
  Bucket,
  Extra,
  FixedExpense,
  Income,
  Labor,
  Month,
} from "./types";

// Reconciliation math — handover §6. All scoped to one month + bucket.
// "Expense" = fixed + bazar + labor + extra.
//
// counted rules — what has actually left the wallet:
//   - Bazar entries & Extras count immediately.
//   - Fixed expenses count only when paid === true.
//   - Labor counts only when paid === true; pay = ratePerDay * daysWorked.
//
// Hero figure = cashOnHand. Secondary = onlineOnHand and unpaidObligations.
// Cash and online are NEVER merged into one balance.

export function laborPay(l: Pick<Labor, "ratePerDay" | "daysWorked">): number {
  return l.ratePerDay * l.daysWorked;
}

export interface MonthRecords {
  incomes: Income[];
  fixed: FixedExpense[];
  bazar: BazarEntry[];
  labor: Labor[];
  extras: Extra[];
}

export interface CategorySpend {
  /** counted toward cashOnHand/onlineOnHand (money already drained). */
  spent: number;
  /** full committed amount including not-yet-paid obligations. */
  committed: number;
}

export interface Reconciliation {
  bucket: Bucket;

  incomeCash: number;
  incomeOnline: number;
  incomeTotal: number;

  paidCashOut: number;
  paidOnlineOut: number;

  cashOnHand: number;
  onlineOnHand: number;

  unpaidCash: number;
  unpaidOnline: number;
  unpaidObligations: number;

  projectedRemaining: number;

  /** breakdown for the dashboard "where it went" rows. */
  byCategory: {
    fixed: CategorySpend;
    bazarMonthly: CategorySpend;
    bazarDaily: CategorySpend;
    labor: CategorySpend;
    extras: CategorySpend;
  };

  /** sum of all counted spending across categories. */
  totalSpent: number;
}

function byBucket<T extends { bucket: Bucket }>(rows: T[], bucket: Bucket): T[] {
  return rows.filter((r) => r.bucket === bucket);
}

export function reconcile(
  month: Pick<Month, "carryOverCash" | "carryOverOnline">,
  records: MonthRecords,
  bucket: Bucket,
): Reconciliation {
  const incomes = byBucket(records.incomes, bucket);
  const fixed = byBucket(records.fixed, bucket);
  const bazar = byBucket(records.bazar, bucket);
  const labor = byBucket(records.labor, bucket);
  const extras = byBucket(records.extras, bucket);

  const sumBy = <T>(rows: T[], pred: (r: T) => boolean, val: (r: T) => number) =>
    rows.reduce((acc, r) => (pred(r) ? acc + val(r) : acc), 0);

  // --- Income ---
  const incomeCash = sumBy(incomes, (i) => i.channel === "cash", (i) => i.amount);
  const incomeOnline = sumBy(incomes, (i) => i.channel === "online", (i) => i.amount);
  const incomeTotal = incomeCash + incomeOnline;

  // --- Counted (drained) spending, by channel ---
  const fixedPaidCash = sumBy(fixed, (f) => f.paid && f.channel === "cash", (f) => f.amount);
  const fixedPaidOnline = sumBy(fixed, (f) => f.paid && f.channel === "online", (f) => f.amount);

  const bazarCash = sumBy(bazar, (b) => b.channel === "cash", (b) => b.total);
  const bazarOnline = sumBy(bazar, (b) => b.channel === "online", (b) => b.total);

  const laborPaidCash = sumBy(labor, (l) => l.paid && l.channel === "cash", laborPay);
  const laborPaidOnline = sumBy(labor, (l) => l.paid && l.channel === "online", laborPay);

  const extrasCash = sumBy(extras, (e) => e.channel === "cash", (e) => e.amount);
  const extrasOnline = sumBy(extras, (e) => e.channel === "online", (e) => e.amount);

  const paidCashOut = fixedPaidCash + bazarCash + laborPaidCash + extrasCash;
  const paidOnlineOut = fixedPaidOnline + bazarOnline + laborPaidOnline + extrasOnline;

  const cashOnHand = month.carryOverCash + incomeCash - paidCashOut;
  const onlineOnHand = month.carryOverOnline + incomeOnline - paidOnlineOut;

  // --- Unpaid obligations (not yet drained), by channel ---
  const unpaidCash =
    sumBy(fixed, (f) => !f.paid && f.channel === "cash", (f) => f.amount) +
    sumBy(labor, (l) => !l.paid && l.channel === "cash", laborPay);
  const unpaidOnline =
    sumBy(fixed, (f) => !f.paid && f.channel === "online", (f) => f.amount) +
    sumBy(labor, (l) => !l.paid && l.channel === "online", laborPay);
  const unpaidObligations = unpaidCash + unpaidOnline;

  const projectedRemaining = cashOnHand + onlineOnHand - unpaidObligations;

  // --- Category breakdown (both channels combined) ---
  const fixedSpent = fixedPaidCash + fixedPaidOnline;
  const fixedCommitted = sumBy(fixed, () => true, (f) => f.amount);

  const monthlyBazar = bazar.filter((b) => b.mode === "monthly_shukna");
  const dailyBazar = bazar.filter((b) => b.mode === "daily_kacha");
  const monthlyBazarTotal = sumBy(monthlyBazar, () => true, (b) => b.total);
  const dailyBazarTotal = sumBy(dailyBazar, () => true, (b) => b.total);

  const laborSpent = laborPaidCash + laborPaidOnline;
  const laborCommitted = sumBy(labor, () => true, laborPay);

  const extrasSpent = extrasCash + extrasOnline;

  const byCategory = {
    fixed: { spent: fixedSpent, committed: fixedCommitted },
    bazarMonthly: { spent: monthlyBazarTotal, committed: monthlyBazarTotal },
    bazarDaily: { spent: dailyBazarTotal, committed: dailyBazarTotal },
    labor: { spent: laborSpent, committed: laborCommitted },
    extras: { spent: extrasSpent, committed: extrasSpent },
  };

  const totalSpent =
    fixedSpent + monthlyBazarTotal + dailyBazarTotal + laborSpent + extrasSpent;

  return {
    bucket,
    incomeCash,
    incomeOnline,
    incomeTotal,
    paidCashOut,
    paidOnlineOut,
    cashOnHand,
    onlineOnHand,
    unpaidCash,
    unpaidOnline,
    unpaidObligations,
    projectedRemaining,
    byCategory,
    totalSpent,
  };
}
