package com.mintwise.expense.agent

import com.mintwise.expense.data.ExpenseRepository
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.add
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.contentOrNull

data class AgentReply(val reply: String, val actions: List<AgentAction>)

data class AgentAction(val tool: String, val input: JsonObject, val result: JsonObject)

/**
 * MINTwise — the Claude tool-use loop. Receives free-form user input, calls
 * the four expense tools as needed, returns a short reply and the list of
 * actions taken (so the UI can show "recorded expense 38 · Food" etc).
 */
class ExpenseAgent(
    private val repo: ExpenseRepository,
    private val client: AnthropicClient = AnthropicClient(),
    private val model: String = AnthropicClient.DEFAULT_MODEL,
) {

    suspend fun converse(token: String, userInput: String): AgentReply {
        if (token.isBlank()) {
            return AgentReply(
                reply = "Set your Claude token in Settings to wake the Oracle.",
                actions = emptyList(),
            )
        }

        val today = ExpenseRepository.today()
        val summary = repo.monthSummary()
        val budgets = repo.budgetsFor()
        // Compact context — every char is input tokens.
        val ctx = "Today $today. MTD income/expense ${"%.0f".format(summary.income)}/" +
            "${"%.0f".format(summary.expense)}. Budgets ${budgets.size}."

        val messages = mutableListOf<JsonObject>(
            userMessage("[$ctx]\n\n$userInput")
        )
        val actions = mutableListOf<AgentAction>()

        repeat(MAX_TURNS) {
            val response = client.messages(
                token = token,
                model = model,
                maxTokens = 512,
                system = SYSTEM_PROMPT,
                tools = TOOLS,
                messages = JsonArray(messages),
            )

            val stopReason = response["stop_reason"]?.asString()
            val content = response["content"]?.jsonArray ?: buildJsonArray { }

            if (stopReason == "tool_use") {
                messages.add(assistantContentMessage(content))
                val toolResults = mutableListOf<JsonObject>()
                for (block in content) {
                    val obj = block.jsonObject
                    if (obj["type"]?.asString() != "tool_use") continue
                    val id = obj["id"]?.asString() ?: continue
                    val name = obj["name"]?.asString() ?: continue
                    val input = obj["input"]?.jsonObject ?: JsonObject(emptyMap())
                    val result = executeTool(name, input)
                    actions.add(AgentAction(name, input, result))
                    toolResults.add(toolResultBlock(id, result.toString()))
                }
                messages.add(userToolResults(toolResults))
                return@repeat
            }

            // end_turn or unknown — pull text and return.
            val text = content
                .filter { it.jsonObject["type"]?.asString() == "text" }
                .joinToString(separator = "") { it.jsonObject["text"]?.asString().orEmpty() }
                .trim()
                .ifEmpty { "Done." }

            val actionsJson = if (actions.isEmpty()) null
                else buildJsonArray { actions.forEach { a ->
                    add(buildJsonObject {
                        put("tool", a.tool)
                        put("input", a.input)
                        put("result", a.result)
                    })
                } }.toString()
            repo.logAgent(userInput, text, actionsJson)
            return AgentReply(text, actions)
        }

        return AgentReply("The Oracle got stuck in a loop. Try rephrasing.", actions)
    }

    private suspend fun executeTool(name: String, input: JsonObject): JsonObject = when (name) {
        "record_transaction" -> {
            val amount = input["amount"]?.jsonPrimitive?.doubleOrNull ?: 0.0
            val kind = input["kind"]?.asString() ?: "expense"
            val category = input["category"]?.asString() ?: "Misc"
            val description = input["description"]?.asString() ?: ""
            val occurredOn = input["occurred_on"]?.asString()
            val id = repo.recordTransaction(
                amount = amount,
                kind = kind,
                category = category,
                description = description,
                occurredOn = occurredOn,
            )
            buildJsonObject {
                put("ok", true)
                put("transaction_id", id)
                put("category", category)
                put("amount", amount)
            }
        }
        "set_budget" -> {
            val category = input["category"]?.asString() ?: "Misc"
            val amount = input["amount"]?.jsonPrimitive?.doubleOrNull ?: 0.0
            val month = input["month"]?.asString()
            val note = input["note"]?.asString()
            repo.setBudget(category, amount, month, note)
            buildJsonObject {
                put("ok", true)
                put("category", category)
                put("amount", amount)
            }
        }
        "list_transactions" -> {
            val month = input["month"]?.asString()
            val limit = input["limit"]?.jsonPrimitive?.intOrNull ?: 20
            val rows = repo.recentTransactions(month = month, limit = limit)
            buildJsonObject {
                put("transactions", buildJsonArray {
                    rows.forEach { tx ->
                        add(buildJsonObject {
                            put("date", tx.occurredOn)
                            put("amount", tx.amount)
                            put("kind", tx.kind)
                            put("category", tx.category)
                            put("description", tx.description)
                        })
                    }
                })
            }
        }
        "get_summary" -> {
            val month = input["month"]?.asString()
            val sum = repo.monthSummary(month)
            val budgetsList = repo.budgetsFor(month)
            val totals = repo.categoryTotals(month)
            buildJsonObject {
                put("summary", buildJsonObject {
                    put("month", sum.month)
                    put("income", sum.income)
                    put("expense", sum.expense)
                    put("net", sum.net)
                    put("budgeted", sum.budgeted)
                })
                put("budgets", buildJsonArray {
                    budgetsList.forEach { b ->
                        add(buildJsonObject {
                            put("category", b.category)
                            put("amount", b.amount)
                            put("note", b.note ?: "")
                        })
                    }
                })
                put("spent_per_category", buildJsonObject {
                    totals.forEach { (cat, total) -> put(cat, total) }
                })
            }
        }
        "set_goal" -> {
            val nm = input["name"]?.asString() ?: "Goal"
            val target = input["target_amount"]?.jsonPrimitive?.doubleOrNull ?: 0.0
            val saved = input["saved_amount"]?.jsonPrimitive?.doubleOrNull
            val deadline = input["deadline"]?.asString()
            val note = input["note"]?.asString()
            val id = repo.upsertGoal(nm, target, saved, deadline, note)
            buildJsonObject {
                put("ok", true); put("goal_id", id); put("name", nm); put("target", target)
            }
        }
        "add_goal_progress" -> {
            val nm = input["name"]?.asString() ?: ""
            val delta = input["amount"]?.jsonPrimitive?.doubleOrNull ?: 0.0
            if (nm.isNotBlank()) repo.addGoalProgress(nm, delta)
            buildJsonObject {
                put("ok", nm.isNotBlank()); put("name", nm); put("delta", delta)
            }
        }
        "list_goals" -> {
            val goals = repo.goals()
            buildJsonObject {
                put("goals", buildJsonArray {
                    goals.forEach { g ->
                        add(buildJsonObject {
                            put("name", g.name)
                            put("target", g.targetAmount)
                            put("saved", g.savedAmount)
                            put("deadline", g.deadline ?: "")
                        })
                    }
                })
            }
        }
        "add_bill" -> {
            val nm = input["name"]?.asString() ?: "Bill"
            val amount = input["amount"]?.jsonPrimitive?.doubleOrNull ?: 0.0
            val dueOn = input["due_on"]?.asString() ?: ExpenseRepository.today()
            val recurring = input["recurring"]?.jsonPrimitive?.contentOrNull
                ?.equals("true", ignoreCase = true) ?: false
            val id = repo.addBill(nm, amount, dueOn, recurring)
            buildJsonObject {
                put("ok", true); put("bill_id", id); put("name", nm)
                put("amount", amount); put("due_on", dueOn)
            }
        }
        "list_bills" -> {
            val bills = repo.upcomingBills(20)
            buildJsonObject {
                put("bills", buildJsonArray {
                    bills.forEach { b ->
                        add(buildJsonObject {
                            put("name", b.name)
                            put("amount", b.amount)
                            put("due_on", b.dueOn)
                            put("recurring", b.recurring)
                        })
                    }
                })
            }
        }
        else -> buildJsonObject { put("error", "unknown tool $name") }
    }

    companion object {
        // Cap the agent loop. Typical flow finishes in 2 turns (call tool → narrate
        // result). 3 covers compound inputs without enabling runaway loops.
        private const val MAX_TURNS = 3

        // Kept terse on purpose — every char is billed input tokens that recur on
        // every turn of the loop. Personality lives in 'Be brief.' + 'No emojis.'
        private val SYSTEM_PROMPT = """
            You are Agentic, a financial assistant. Call tools to record or read
            data, then reply in ONE sentence.

            Rules:
            - ALWAYS call a tool — never just acknowledge.
            - One tool call per transaction; compound input means multiple calls.
            - Categories: Food, Transport, Entertainment, Bills, Shopping,
              Utilities, Health, Travel, Subscriptions, Income, Misc.
            - For questions, call get_summary or list_transactions first.
            - No emojis. No praise. Be brief.
        """.trimIndent()

        private val TOOLS: JsonArray = buildJsonArray {
            add(toolDefinition(
                name = "record_transaction",
                description = "Record one expense or income. Call once per item.",
                schema = buildJsonObject {
                    put("type", "object")
                    put("properties", buildJsonObject {
                        put("amount", buildJsonObject {
                            put("type", "number")
                            put("description", "Positive absolute amount.")
                        })
                        put("kind", buildJsonObject {
                            put("type", "string")
                            put("enum", buildJsonArray { add("expense"); add("income") })
                        })
                        put("category", buildJsonObject {
                            put("type", "string")
                            put("description", "Category name (Food, Bills, etc).")
                        })
                        put("description", buildJsonObject {
                            put("type", "string")
                            put("description", "Short human-readable description.")
                        })
                        put("occurred_on", buildJsonObject {
                            put("type", "string")
                            put("description", "ISO date YYYY-MM-DD. Omit for today.")
                        })
                    })
                    put("required", buildJsonArray {
                        add("amount"); add("kind"); add("category"); add("description")
                    })
                },
            ))
            add(toolDefinition(
                name = "set_budget",
                description = "Create or update a monthly budget allocation for a category.",
                schema = buildJsonObject {
                    put("type", "object")
                    put("properties", buildJsonObject {
                        put("category", buildJsonObject { put("type", "string") })
                        put("amount", buildJsonObject { put("type", "number") })
                        put("month", buildJsonObject {
                            put("type", "string")
                            put("description", "YYYY-MM. Omit for current month.")
                        })
                        put("note", buildJsonObject { put("type", "string") })
                    })
                    put("required", buildJsonArray { add("category"); add("amount") })
                },
            ))
            add(toolDefinition(
                name = "list_transactions",
                description = "Return recent transactions for inspection.",
                schema = buildJsonObject {
                    put("type", "object")
                    put("properties", buildJsonObject {
                        put("month", buildJsonObject { put("type", "string") })
                        put("limit", buildJsonObject { put("type", "integer") })
                    })
                },
            ))
            add(toolDefinition(
                name = "get_summary",
                description = "Totals (income, expense, net, per-category) + budgets for a month.",
                schema = buildJsonObject {
                    put("type", "object")
                    put("properties", buildJsonObject {
                        put("month", buildJsonObject { put("type", "string") })
                    })
                },
            ))
            add(toolDefinition(
                name = "set_goal",
                description = "Create or update a savings goal (e.g. Europe Trip, Emergency Fund).",
                schema = buildJsonObject {
                    put("type", "object")
                    put("properties", buildJsonObject {
                        put("name", buildJsonObject { put("type", "string") })
                        put("target_amount", buildJsonObject { put("type", "number") })
                        put("saved_amount", buildJsonObject {
                            put("type", "number")
                            put("description", "Already-saved amount. Optional.")
                        })
                        put("deadline", buildJsonObject {
                            put("type", "string")
                            put("description", "ISO date or month, optional.")
                        })
                        put("note", buildJsonObject { put("type", "string") })
                    })
                    put("required", buildJsonArray { add("name"); add("target_amount") })
                },
            ))
            add(toolDefinition(
                name = "add_goal_progress",
                description = "Add to the saved amount of an existing goal.",
                schema = buildJsonObject {
                    put("type", "object")
                    put("properties", buildJsonObject {
                        put("name", buildJsonObject { put("type", "string") })
                        put("amount", buildJsonObject { put("type", "number") })
                    })
                    put("required", buildJsonArray { add("name"); add("amount") })
                },
            ))
            add(toolDefinition(
                name = "list_goals",
                description = "List all savings goals with target and saved amount.",
                schema = buildJsonObject {
                    put("type", "object")
                    put("properties", buildJsonObject { })
                },
            ))
            add(toolDefinition(
                name = "add_bill",
                description = "Add a recurring or one-off upcoming bill with a due date.",
                schema = buildJsonObject {
                    put("type", "object")
                    put("properties", buildJsonObject {
                        put("name", buildJsonObject { put("type", "string") })
                        put("amount", buildJsonObject { put("type", "number") })
                        put("due_on", buildJsonObject {
                            put("type", "string")
                            put("description", "ISO date YYYY-MM-DD.")
                        })
                        put("recurring", buildJsonObject {
                            put("type", "string")
                            put("description", "\"true\" if monthly recurring, else \"false\".")
                        })
                    })
                    put("required", buildJsonArray { add("name"); add("amount"); add("due_on") })
                },
            ))
            add(toolDefinition(
                name = "list_bills",
                description = "List upcoming unpaid bills sorted by due date.",
                schema = buildJsonObject {
                    put("type", "object")
                    put("properties", buildJsonObject { })
                },
            ))
        }
    }
}
