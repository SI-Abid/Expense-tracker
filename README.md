# Songsar — Household Ledger

A fast, **offline-first** household budget & expense app for a single operator —
built to replace a handwritten paper ledger for managing a Bangladeshi family's
monthly money. It preserves the real mental model: **pooled income, two budgets
(personal vs household), fixed bills, two bazar modes, and labor paid by days** —
and resolves everything to one trusted figure: **cash remaining**.

This is **not** a category-pie expense tracker. It's built around *income
pooling + dual-wallet cash reconciliation*.

> Local-first by design: all data lives on your device (IndexedDB), all logic
> runs in the browser, and the app is a static bundle that needs **no backend**.
> No accounts, no telemetry, no third-party network calls.

---

## Quick start

```bash
npm install
npm run dev        # local development at http://localhost:5173
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with hot reload |
| `npm run test` | Run the unit + integration tests (Vitest) |
| `npm run build` | Type-check and produce a static `dist/` bundle |
| `npm run preview` | Serve the built `dist/` locally |
| `npm run lint` | Type-check only (`tsc --noEmit`) |

The first launch **seeds a sample June 2026 month** (pooled ৳75,000 income,
fixed bills, shukna + kacha bazar with Bengali items, two maids, an oven
repair). Wipe it any time from **Settings → Reset to sample data**.

---

## Concepts

- **Two wallets, never merged.** Every amount is either **Cash** or **Online**.
  The dashboard shows them as two separate balances — cash on hand is the hero
  figure you physically reconcile.
- **Two buckets.** **Household** (songsar) and **Our** (personal). The Our tab
  is a fully isolated mirror — its money never enters the household balance.
  Toggle between them in the header.
- **Counted vs. obligation.** Bazar and Extras drain your wallet immediately.
  Fixed bills and Labor only count once marked **Paid** — until then they show
  under *“still to pay.”*
- **Month-scoped.** Every record belongs to a month, so amount history comes for
  free (last summer's electricity is just last July's record).

### The math (see `src/domain/reconcile.ts`)

```
cashOnHand        = carryOverCash   + incomeCash   - paidCashOut
onlineOnHand      = carryOverOnline + incomeOnline - paidOnlineOut
unpaidObligations = Σ unpaid fixed + Σ unpaid labor pay
projectedRemaining = cashOnHand + onlineOnHand - unpaidObligations
```

Money is stored as **integer Taka** (no floats). The `src/domain/` layer is pure
and fully unit-tested.

---

## Daily bazar — natural-language entry

The most frequent action. Type a trip in free text; it parses instantly and
**offline**:

```
কুমড়া ৭০, মুরগী ৬৭৫, ডিম ১৩৫, আলু ৬০, চিংড়ি ৫৫০
```

- Items separated by **commas or new lines**.
- Bengali (`০-৯`) **and** English digits accepted.
- Separators between name and amount may be space, `-`, or `:`.
- **Additive amounts** are summed: `মশলা ৫০+১৬+১৬` → 82.
- Anything without a detectable amount becomes an **editable chip** you fix —
  nothing is silently dropped.
- A half-typed trip is **autosaved** and survives a reload.

---

## Month lifecycle

- The app always opens on the **active** month; use the header arrows to view
  past months (they remain editable).
- **Settings → Close month** snapshots this month's closing cash/online into the
  next month's carry-over, marks this month closed, and creates the next active
  month with bills prefilled (unpaid, last amounts) and labor prefilled (rates
  kept, 0 days).
- Editing a *closed* month does **not** auto-propagate forward. Use **Recompute
  carry-over** on the following month to refresh its opening balances.

---

## Install as a PWA (Android / desktop)

1. `npm run build`, then serve `dist/` from any static host (e.g. nginx on a
   private VPS), or run `npm run preview`.
2. Open it in Chrome on your phone → menu → **Install app** / **Add to Home
   screen**.
3. After the first load it works **fully offline** — the app shell is precached
   and all data is local.

---

## Backup & restore (your only safety net)

Local-first means there is no cloud copy. Back up regularly:

- **Settings → Export all data** downloads a JSON file with everything.
- **Settings → Import data** restores from such a file (replaces current data;
  malformed files are rejected before anything is touched).

Export → wipe → import is verified to round-trip losslessly (`src/store/flow.test.ts`).

---

## Project structure

```
src/
  db/         Dexie schema, seed (June 2026 sample), export/import
  domain/     pure money math: reconciliation, rollover, parser, formatting  ← unit-tested
  store/      Zustand app state + reconciliation selectors
  components/ UI primitives, app shell, bazar entry form
  screens/    Dashboard, Income, Fixed, Bazar, Labor, Extras, Settings
  i18n/       English UI strings + BDT / date formatting
scripts/      PWA icon generator (no deps)
```

## Tech

React + TypeScript + Vite · Tailwind CSS · Dexie (IndexedDB) · Zustand ·
`vite-plugin-pwa`. No backend. Bengali-capable on-device font stack
(`Noto Sans Bengali`, `Hind Siliguri`, `system-ui`) — no web-font CDN, so there
are zero third-party network calls.

## Privacy

Single user, no authentication, no analytics, no third-party calls in any core
flow. Your financial data never leaves the device unless you export it yourself.
