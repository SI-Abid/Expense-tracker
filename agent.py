"""
The Money Oracle — an eccentric LLM agent that tracks expenses, budgets, and funds.

It receives free-form natural language from the user, calls tools to mutate the
database, and writes a short witty reply. Powered by the Anthropic SDK.
"""

import json
import os
from datetime import date

import anthropic

import database as db

MODEL = "claude-opus-4-7"

SYSTEM_PROMPT = """You are MINTwise — the user's eccentric, slightly theatrical money oracle.

Your job: take free-form natural-language input from the user about their money
(expenses, income, budgets, funds, questions) and call the right tools to record
or retrieve the data. Then write a SHORT (1-3 sentences) witty reply.

Personality:
- Bohemian fiscal sage. Dry humor, occasional metaphor, never preachy.
- Use playful but never condescending language. Address the user warmly.
- Reference the data you saw. If the user blew their dining budget, say so.
- Avoid emojis. Avoid corporate finance-app banalities ("Great job!", "Nice spending!").

Rules:
- ALWAYS call tools to record transactions or set budgets — never just acknowledge.
- Infer category from the description (Food, Transport, Entertainment, Bills,
  Shopping, Health, Travel, Subscriptions, Income, Misc).
- If the user is asking a question (e.g. "how much did I spend on coffee?"), call
  list_transactions or get_summary first, then answer.
- If amount/category are ambiguous, make your best guess and mention it in the reply.
- Today's date is provided in the user message context. Use it.
- One transaction per tool call. For multiple items ("$5 coffee and $12 lunch"),
  call record_transaction twice.

Format your final reply as a single chat message. No headers, no bullets unless
quoting data. Be brief."""


TOOLS = [
    {
        "name": "record_transaction",
        "description": (
            "Record a single expense or income transaction. Call once per item; "
            "for compound inputs like '$5 coffee and $12 lunch', call twice."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "amount": {
                    "type": "number",
                    "description": "Absolute value in user's currency. Always positive.",
                },
                "kind": {
                    "type": "string",
                    "enum": ["expense", "income"],
                    "description": "Whether this is money leaving or entering the wallet.",
                },
                "category": {
                    "type": "string",
                    "description": (
                        "One-word category. Suggested: Food, Transport, Entertainment, "
                        "Bills, Shopping, Health, Travel, Subscriptions, Income, Misc."
                    ),
                },
                "description": {
                    "type": "string",
                    "description": "Short human-readable description (e.g. 'morning coffee').",
                },
                "occurred_on": {
                    "type": "string",
                    "description": "ISO date YYYY-MM-DD. Omit for today.",
                },
            },
            "required": ["amount", "kind", "category", "description"],
        },
    },
    {
        "name": "set_budget",
        "description": "Create or update a monthly budget allocation for a category.",
        "input_schema": {
            "type": "object",
            "properties": {
                "category": {"type": "string", "description": "Category name."},
                "amount": {"type": "number", "description": "Monthly cap in currency units."},
                "month": {
                    "type": "string",
                    "description": "YYYY-MM. Omit for current month.",
                },
                "note": {"type": "string", "description": "Optional intent or constraint."},
            },
            "required": ["category", "amount"],
        },
    },
    {
        "name": "list_transactions",
        "description": "Return recent transactions, optionally filtered to a month.",
        "input_schema": {
            "type": "object",
            "properties": {
                "month": {"type": "string", "description": "YYYY-MM filter. Omit for all."},
                "limit": {"type": "integer", "description": "Max rows. Default 20."},
            },
        },
    },
    {
        "name": "get_summary",
        "description": (
            "Get totals (income, expense, net, per-category) and budget status for a month."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "month": {"type": "string", "description": "YYYY-MM. Omit for current month."}
            },
        },
    },
]


def _execute_tool(name: str, args: dict) -> dict:
    """Run a tool call and return a JSON-serializable result."""
    if name == "record_transaction":
        tx_id = db.add_transaction(
            amount=float(args["amount"]),
            kind=args["kind"],
            category=args["category"],
            description=args["description"],
            occurred_on=args.get("occurred_on"),
        )
        return {"ok": True, "transaction_id": tx_id}

    if name == "set_budget":
        db.set_budget(
            category=args["category"],
            amount=float(args["amount"]),
            month=args.get("month"),
            note=args.get("note"),
        )
        return {"ok": True, "category": args["category"], "amount": args["amount"]}

    if name == "list_transactions":
        rows = db.get_transactions(
            limit=int(args.get("limit", 20)),
            month=args.get("month"),
        )
        return {"transactions": rows}

    if name == "get_summary":
        month = args.get("month") or db.current_month()
        summary = db.month_summary(month)
        budgets = db.get_budgets(month)
        spent_per_cat = db.category_totals(month)
        return {
            "summary": summary,
            "budgets": budgets,
            "spent_per_category": spent_per_cat,
        }

    return {"error": f"unknown tool {name}"}


def _build_client() -> anthropic.Anthropic | None:
    """Build an Anthropic client using a Claude OAuth token if available,
    otherwise fall back to ANTHROPIC_API_KEY.

    Claude OAuth tokens (e.g. from `claude login`) start with sk-ant-oat...
    and are passed via the auth_token parameter, which sends them as a
    Bearer header instead of x-api-key.
    """
    oauth_token = (
        os.environ.get("CLAUDE_CODE_OAUTH_TOKEN")
        or os.environ.get("ANTHROPIC_AUTH_TOKEN")
    )
    if oauth_token:
        return anthropic.Anthropic(auth_token=oauth_token)
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if api_key:
        return anthropic.Anthropic(api_key=api_key)
    return None


def converse(user_input: str) -> dict:
    """Send the user's input to MINTwise, run any tool calls, return reply + actions.

    Returns: {"reply": str, "actions": list[dict]}
    """
    client = _build_client()
    if client is None:
        return {
            "reply": (
                "The oracle is offline. Set CLAUDE_CODE_OAUTH_TOKEN "
                "(or ANTHROPIC_API_KEY) in your .env and restart."
            ),
            "actions": [],
        }

    today = date.today().isoformat()
    summary = db.month_summary()
    budgets = db.get_budgets()
    funds = db.get_funds()

    context = (
        f"Today is {today}. Current month: {summary['month']}. "
        f"Income MTD: {summary['income']:.2f}. Expense MTD: {summary['expense']:.2f}. "
        f"Net: {summary['net']:.2f}. Budgets set: {len(budgets)}. "
        f"Main wallet: {funds[0]['balance']:.2f} if funds else 0."
    )

    messages = [
        {
            "role": "user",
            "content": f"[Context: {context}]\n\nUser says: {user_input}",
        }
    ]

    actions: list[dict] = []

    for _ in range(6):
        response = client.messages.create(
            model=MODEL,
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            tools=TOOLS,
            messages=messages,
        )

        if response.stop_reason == "tool_use":
            messages.append({"role": "assistant", "content": response.content})
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    result = _execute_tool(block.name, block.input)
                    actions.append({
                        "tool": block.name,
                        "input": block.input,
                        "result": result,
                    })
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": json.dumps(result),
                    })
            messages.append({"role": "user", "content": tool_results})
            continue

        reply_text = "".join(
            block.text for block in response.content if block.type == "text"
        ).strip()

        if not reply_text:
            reply_text = "Done."

        db.log_agent_turn(user_input, reply_text, json.dumps(actions))
        return {"reply": reply_text, "actions": actions}

    return {
        "reply": "The oracle got stuck in a loop. Try rephrasing.",
        "actions": actions,
    }
