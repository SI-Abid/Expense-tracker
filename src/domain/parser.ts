import { parseAmountExpression } from "./money";
import type { LineItem } from "./types";

// Natural-language bazar parser. Pure & offline — see handover §8.
//
//   Input:  free text, items separated by commas or newlines.
//           e.g. "কুমড়া ৭০, মুরগী ৬৭৫, ডিম ১৩৫, আলু ৬০, চিংড়ি ৫৫০"
//   Per item: name = text before the trailing amount; amount = trailing number.
//             separators between name and amount may be space / "-" / ":".
//   Digits:  Bengali ০-৯ and English 0-9, normalized to integers.
//   Amounts: additive expressions like "৫০+১৬+১৬" are summed.
//   Output:  parsed line items + live total; unparseable tokens are surfaced
//            (amount === null) so the user can fix them — never silently dropped.

export interface ParsedItem {
  name: string;
  /** null = no detectable amount; surface as an editable chip to fix. */
  amount: number | null;
  /** the original token, kept for display/repair of unparseable chips. */
  raw: string;
}

export interface ParseResult {
  items: ParsedItem[];
  /** sum of all successfully parsed amounts. */
  total: number;
}

// A trailing amount: digits (either script) optionally joined by "+".
const TRAILING_AMOUNT =
  /([0-9০-৯]+(?:\s*\+\s*[0-9০-৯]+)*)\s*$/;

// Trailing name/amount separators to strip from the name.
const TRAILING_SEPARATORS = /[\s\-:]+$/;

function parseToken(token: string): ParsedItem {
  const raw = token.trim();
  const match = raw.match(TRAILING_AMOUNT);

  if (!match) {
    // No detectable amount — surface for repair.
    return { name: raw, amount: null, raw };
  }

  const amountStr = match[1];
  const amount = parseAmountExpression(amountStr);
  const name = raw.slice(0, match.index).replace(TRAILING_SEPARATORS, "").trim();

  if (amount == null) {
    return { name: raw, amount: null, raw };
  }

  return { name, amount, raw };
}

export function parseBazarText(input: string): ParseResult {
  const tokens = input
    .split(/[,\n]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  const items = tokens.map(parseToken);
  const total = items.reduce(
    (sum, item) => sum + (item.amount ?? 0),
    0,
  );

  return { items, total };
}

/** Sum of an array of line items (the canonical total for a stored entry). */
export function sumLineItems(items: LineItem[]): number {
  return items.reduce((sum, item) => sum + (item.amount || 0), 0);
}
