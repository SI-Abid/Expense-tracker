# MINTwise — Eccentric Agentic Expense Tracker

A monthly-budget + daily-expense tracker where every fund movement is recorded
by an LLM agent. You type "blew 38 bucks on sushi" and the Oracle (Claude,
calling tools in an agent loop) parses it, categorises it, persists it, updates
your funds, and writes back a brief witty reply.

## What's eccentric about it

- **No forms for the common case.** A single text box on the dashboard. Talk to
  it like a person. The agent calls `record_transaction`, `set_budget`,
  `list_transactions`, or `get_summary` as needed — sometimes multiple in one
  turn (e.g. "$5 coffee and $12 lunch" → two tool calls).
- **Agentic loop, not a one-shot prompt.** The server runs Claude in a
  tool-use loop until `stop_reason == end_turn`. Multiple tool calls per turn
  are normal.
- **A persona, not a chatbot.** MINTwise is dry, bohemian, and brief. It will
  notice when you've blown your dining budget without lecturing.
- **Funds and category budgets are reconciled in SQLite.** No spreadsheets.

## Stack

- Python 3, Flask, SQLite
- Anthropic Python SDK (`anthropic`), model `claude-opus-4-7`
- Vanilla HTML / CSS / JS — no frontend build step

## Setup

```bash
pip install -r requirements.txt
cp .env.example .env
# Edit .env and add your Claude OAuth token (preferred) or API key.
python app.py
```

Open <http://127.0.0.1:5000/>.

### Auth

The Oracle authenticates via the Anthropic SDK using **either**:

1. `CLAUDE_CODE_OAUTH_TOKEN` — a Claude OAuth token (e.g. from `claude login`).
   Preferred; passed via `Authorization: Bearer …`.
2. `ANTHROPIC_API_KEY` — standard API key. Fallback.

If neither is set, the dashboard still works — you'll see a warning, and you
can use the manual budget form. The Oracle won't respond.

## Usage examples

Type these into the dashboard text box:

| You say | What the agent does |
| --- | --- |
| `spent 12 on lunch` | calls `record_transaction(12, expense, Food, "lunch")` |
| `blew 38 on sushi and 4 on a metro card` | two `record_transaction` calls |
| `got paid 2500` | `record_transaction(2500, income, Income, "paycheck")` |
| `set food budget to 400` | `set_budget("Food", 400)` |
| `how much have I spent on food this month?` | `get_summary` then narrates |
| `what's left in my budget?` | `get_summary` + commentary |

## File layout

```
app.py            Flask routes (dashboard, /ask, /budget, /transactions)
agent.py          Claude tool-use loop + MINTwise system prompt
database.py       SQLite schema + CRUD helpers
templates/        Jinja templates (base, index, budget, transactions)
static/           CSS + JS
requirements.txt  flask, anthropic, python-dotenv
.env.example      Auth + secret key template
```

## How the agent works

`agent.converse(user_input)` builds a small context block (today's date,
month-to-date totals, fund balance, number of budgets) and sends it to Claude
along with four tools:

- `record_transaction(amount, kind, category, description, occurred_on?)`
- `set_budget(category, amount, month?, note?)`
- `list_transactions(month?, limit?)`
- `get_summary(month?)`

It then loops: call API → if `stop_reason == "tool_use"`, run the tools,
append `tool_result` blocks, call again. Bounded at 6 iterations. Every turn
is logged to `agent_log` so the dashboard can show recent Oracle whispers.

## Caveats

- Single-user. No auth on the Flask app — run locally only.
- SQLite. Fine for personal use; not concurrent-write safe.
- The Oracle infers categories. If it picks something you don't like, just say
  "actually that was Entertainment not Food" and it'll re-record.
- The model can in principle hallucinate amounts; the action log on the
  dashboard shows exactly what was recorded so you can spot-check.
