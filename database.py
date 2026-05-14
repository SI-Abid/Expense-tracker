import sqlite3
from contextlib import contextmanager
from datetime import datetime, date
from pathlib import Path

DB_PATH = Path(__file__).parent / "expense_tracker.db"


SCHEMA = """
CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    month TEXT NOT NULL,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    note TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(month, category)
);

CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    occurred_on TEXT NOT NULL,
    amount REAL NOT NULL,
    kind TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    raw_input TEXT,
    agent_quip TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS funds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    balance REAL NOT NULL DEFAULT 0,
    note TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agent_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_input TEXT NOT NULL,
    agent_reply TEXT NOT NULL,
    actions_json TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
"""


@contextmanager
def conn():
    c = sqlite3.connect(DB_PATH)
    c.row_factory = sqlite3.Row
    c.execute("PRAGMA foreign_keys = ON")
    try:
        yield c
        c.commit()
    finally:
        c.close()


def init():
    with conn() as c:
        c.executescript(SCHEMA)
        existing = c.execute("SELECT COUNT(*) FROM funds").fetchone()[0]
        if existing == 0:
            c.execute(
                "INSERT INTO funds (name, balance, note) VALUES (?, ?, ?)",
                ("Main Wallet", 0.0, "Default fund"),
            )


def current_month() -> str:
    return date.today().strftime("%Y-%m")


def set_budget(category: str, amount: float, month: str | None = None, note: str | None = None):
    month = month or current_month()
    with conn() as c:
        c.execute(
            """
            INSERT INTO budgets (month, category, amount, note)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(month, category) DO UPDATE SET
                amount = excluded.amount,
                note = COALESCE(excluded.note, budgets.note)
            """,
            (month, category, amount, note),
        )


def get_budgets(month: str | None = None) -> list[dict]:
    month = month or current_month()
    with conn() as c:
        rows = c.execute(
            "SELECT * FROM budgets WHERE month = ? ORDER BY category",
            (month,),
        ).fetchall()
        return [dict(r) for r in rows]


def delete_budget(budget_id: int):
    with conn() as c:
        c.execute("DELETE FROM budgets WHERE id = ?", (budget_id,))


def add_transaction(
    amount: float,
    kind: str,
    category: str,
    description: str,
    occurred_on: str | None = None,
    raw_input: str | None = None,
    agent_quip: str | None = None,
    fund_name: str = "Main Wallet",
) -> int:
    occurred_on = occurred_on or date.today().isoformat()
    with conn() as c:
        cur = c.execute(
            """
            INSERT INTO transactions
            (occurred_on, amount, kind, category, description, raw_input, agent_quip)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (occurred_on, amount, kind, category, description, raw_input, agent_quip),
        )
        delta = amount if kind == "income" else -amount
        c.execute(
            """
            INSERT INTO funds (name, balance) VALUES (?, ?)
            ON CONFLICT(name) DO UPDATE SET
                balance = funds.balance + ?,
                updated_at = CURRENT_TIMESTAMP
            """,
            (fund_name, delta, delta),
        )
        return cur.lastrowid


def get_transactions(limit: int = 50, month: str | None = None) -> list[dict]:
    with conn() as c:
        if month:
            rows = c.execute(
                """
                SELECT * FROM transactions
                WHERE substr(occurred_on, 1, 7) = ?
                ORDER BY occurred_on DESC, id DESC
                LIMIT ?
                """,
                (month, limit),
            ).fetchall()
        else:
            rows = c.execute(
                "SELECT * FROM transactions ORDER BY occurred_on DESC, id DESC LIMIT ?",
                (limit,),
            ).fetchall()
        return [dict(r) for r in rows]


def get_funds() -> list[dict]:
    with conn() as c:
        rows = c.execute("SELECT * FROM funds ORDER BY name").fetchall()
        return [dict(r) for r in rows]


def category_totals(month: str | None = None) -> dict[str, float]:
    month = month or current_month()
    with conn() as c:
        rows = c.execute(
            """
            SELECT category, SUM(amount) AS total
            FROM transactions
            WHERE kind = 'expense' AND substr(occurred_on, 1, 7) = ?
            GROUP BY category
            """,
            (month,),
        ).fetchall()
        return {r["category"]: r["total"] for r in rows}


def month_summary(month: str | None = None) -> dict:
    month = month or current_month()
    with conn() as c:
        row = c.execute(
            """
            SELECT
                COALESCE(SUM(CASE WHEN kind = 'income' THEN amount END), 0) AS income,
                COALESCE(SUM(CASE WHEN kind = 'expense' THEN amount END), 0) AS expense,
                COUNT(*) AS count
            FROM transactions
            WHERE substr(occurred_on, 1, 7) = ?
            """,
            (month,),
        ).fetchone()
        budgeted = c.execute(
            "SELECT COALESCE(SUM(amount), 0) AS total FROM budgets WHERE month = ?",
            (month,),
        ).fetchone()
        return {
            "month": month,
            "income": row["income"],
            "expense": row["expense"],
            "net": row["income"] - row["expense"],
            "count": row["count"],
            "budgeted": budgeted["total"],
        }


def log_agent_turn(user_input: str, agent_reply: str, actions_json: str | None = None):
    with conn() as c:
        c.execute(
            "INSERT INTO agent_log (user_input, agent_reply, actions_json) VALUES (?, ?, ?)",
            (user_input, agent_reply, actions_json),
        )


def recent_agent_log(limit: int = 10) -> list[dict]:
    with conn() as c:
        rows = c.execute(
            "SELECT * FROM agent_log ORDER BY id DESC LIMIT ?",
            (limit,),
        ).fetchall()
        return [dict(r) for r in rows]
