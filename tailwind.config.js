/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // Bengali-capable stack — see handover §3.
        sans: [
          "Hind Siliguri",
          "Noto Sans Bengali",
          "system-ui",
          "sans-serif",
        ],
        // Tabular figures for money columns.
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        // Calm, ledger-paper palette. Teal = household, amber = personal ("Our").
        ink: {
          DEFAULT: "#1e293b",
          soft: "#475569",
          faint: "#94a3b8",
        },
        paper: {
          DEFAULT: "#f8fafc",
          card: "#ffffff",
          line: "#e2e8f0",
        },
        household: {
          DEFAULT: "#0f766e",
          soft: "#14b8a6",
          tint: "#ccfbf1",
        },
        our: {
          DEFAULT: "#b45309",
          soft: "#f59e0b",
          tint: "#fef3c7",
        },
        cash: "#0f766e",
        online: "#6366f1",
        danger: "#dc2626",
        ok: "#16a34a",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,0.06), 0 1px 3px rgba(15,23,42,0.04)",
        hero: "0 8px 30px rgba(15,118,110,0.18)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
