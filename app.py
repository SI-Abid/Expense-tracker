import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, redirect, render_template, request, url_for

import database as db
from agent import converse

load_dotenv(Path(__file__).parent / ".env")

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "dev-secret-change-me")

db.init()


@app.route("/")
def index():
    month = request.args.get("month") or db.current_month()
    summary = db.month_summary(month)
    budgets = db.get_budgets(month)
    spent = db.category_totals(month)
    transactions = db.get_transactions(limit=15, month=month)
    funds = db.get_funds()
    log = db.recent_agent_log(limit=5)

    budget_rows = []
    for b in budgets:
        actual = spent.get(b["category"], 0.0)
        pct = (actual / b["amount"] * 100) if b["amount"] else 0
        budget_rows.append({
            **b,
            "actual": actual,
            "pct": min(pct, 999),
            "over": actual > b["amount"],
        })

    uncategorized = {
        cat: total for cat, total in spent.items()
        if cat not in {b["category"] for b in budgets}
    }

    return render_template(
        "index.html",
        month=month,
        summary=summary,
        budget_rows=budget_rows,
        uncategorized=uncategorized,
        transactions=transactions,
        funds=funds,
        log=log,
        has_api_key=bool(
            os.environ.get("CLAUDE_CODE_OAUTH_TOKEN")
            or os.environ.get("ANTHROPIC_AUTH_TOKEN")
            or os.environ.get("ANTHROPIC_API_KEY")
        ),
    )


@app.route("/ask", methods=["POST"])
def ask():
    user_input = (request.form.get("message") or "").strip()
    if not user_input:
        return redirect(url_for("index"))
    result = converse(user_input)
    if request.headers.get("Accept") == "application/json":
        return jsonify(result)
    return redirect(url_for("index"))


@app.route("/api/ask", methods=["POST"])
def api_ask():
    data = request.get_json(silent=True) or {}
    user_input = (data.get("message") or "").strip()
    if not user_input:
        return jsonify({"error": "empty message"}), 400
    result = converse(user_input)
    return jsonify(result)


@app.route("/budget", methods=["GET", "POST"])
def budget():
    if request.method == "POST":
        category = (request.form.get("category") or "").strip()
        amount = request.form.get("amount", type=float)
        month = (request.form.get("month") or "").strip() or None
        note = (request.form.get("note") or "").strip() or None
        if category and amount is not None:
            db.set_budget(category, amount, month=month, note=note)
        return redirect(url_for("budget"))

    month = request.args.get("month") or db.current_month()
    budgets = db.get_budgets(month)
    spent = db.category_totals(month)
    return render_template(
        "budget.html",
        month=month,
        budgets=budgets,
        spent=spent,
    )


@app.route("/budget/<int:budget_id>/delete", methods=["POST"])
def budget_delete(budget_id: int):
    db.delete_budget(budget_id)
    return redirect(url_for("budget"))


@app.route("/transactions")
def transactions():
    month = request.args.get("month") or db.current_month()
    rows = db.get_transactions(limit=200, month=month)
    return render_template("transactions.html", month=month, transactions=rows)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
