// Money & numeral helpers. All currency is integer BDT.

const BENGALI_DIGITS = "০১২৩৪৫৬৭৮৯";

/** Convert any Bengali digits in a string to English (0-9). Non-digits pass through. */
export function bengaliToEnglishDigits(input: string): string {
  let out = "";
  for (const ch of input) {
    const idx = BENGALI_DIGITS.indexOf(ch);
    out += idx >= 0 ? String(idx) : ch;
  }
  return out;
}

/**
 * Parse a numeric expression into an integer.
 * Accepts Bengali/English digits and additive expressions like "৫০+১৬+১৬" → 116.
 * Returns null if no digits are found.
 */
export function parseAmountExpression(raw: string): number | null {
  const normalized = bengaliToEnglishDigits(raw).trim();
  if (!normalized) return null;

  // Additive: split on "+" and sum the integer parts of each term.
  if (normalized.includes("+")) {
    const terms = normalized.split("+");
    let sum = 0;
    let sawDigit = false;
    for (const term of terms) {
      const m = term.match(/\d+/);
      if (m) {
        sum += parseInt(m[0], 10);
        sawDigit = true;
      }
    }
    return sawDigit ? sum : null;
  }

  const m = normalized.match(/\d+/);
  if (!m) return null;
  return parseInt(m[0], 10);
}

/**
 * Parse free user input (Bengali or English digits) into an integer Taka value.
 * Used by amount input fields. Returns 0 for empty/invalid.
 */
export function parseTakaInput(raw: string): number {
  const v = parseAmountExpression(raw);
  return v == null ? 0 : v;
}

/**
 * Format an integer Taka value for display: "৳ 14,840".
 * Thousands grouping, no decimals, English digits with the ৳ sign.
 */
export function formatTaka(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(Math.round(n));
  return `${sign}৳ ${abs.toLocaleString("en-US")}`;
}

/** Plain grouped number without the currency symbol: "14,840". */
export function formatNumber(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}
