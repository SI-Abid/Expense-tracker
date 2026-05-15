package com.mintwise.expense.agent

import androidx.room.Room
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.mintwise.expense.data.AppDatabase
import com.mintwise.expense.data.ExpenseRepository
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/**
 * End-to-end exercise of the agent tool-use loop against a real in-memory
 * Room database and a scripted LLM client. This is where we catch wiring
 * regressions between the model's tool_use blocks and the repository.
 *
 * The HTTP layer is faked here — see AnthropicClientTest for that contract.
 */
@RunWith(AndroidJUnit4::class)
class ExpenseAgentInstrumentedTest {

    private lateinit var db: AppDatabase
    private lateinit var repo: ExpenseRepository

    @Before
    fun setUp() {
        val ctx = InstrumentationRegistry.getInstrumentation().targetContext
        db = Room.inMemoryDatabaseBuilder(ctx, AppDatabase::class.java)
            .allowMainThreadQueries()
            .build()
        repo = ExpenseRepository(db)
    }

    @After
    fun tearDown() {
        db.close()
    }

    @Test
    fun blankToken_returnsSettingsPrompt_andSkipsApiCall() = runBlocking {
        var calls = 0
        val agent = ExpenseAgent(repo, client = object : AnthropicClient() {
            override suspend fun messages(
                token: String, model: String, maxTokens: Int,
                system: String, tools: JsonArray, messages: JsonArray,
            ): JsonObject {
                calls++
                return endTurn("should not be called")
            }
        })

        val reply = agent.converse(token = "", userInput = "log $5 coffee")

        assertEquals(0, calls)
        assertTrue(reply.reply.contains("Settings", ignoreCase = true) ||
            reply.reply.contains("token", ignoreCase = true))
        assertTrue(reply.actions.isEmpty())
    }

    @Test
    fun toolUseRecordTransaction_persistsRowAndReturnsNarration() = runBlocking {
        val client = ScriptedClient(
            listOf(
                toolUse("record_transaction", buildJsonObject {
                    put("amount", 38.0)
                    put("kind", "expense")
                    put("category", "Food")
                    put("description", "sushi")
                }),
                endTurn("Logged 38 on Food."),
            )
        )
        val agent = ExpenseAgent(repo, client = client)

        val reply = agent.converse(token = "sk-ant-oat-x", userInput = "38 on sushi")

        assertEquals("Logged 38 on Food.", reply.reply)
        assertEquals(1, reply.actions.size)
        assertEquals("record_transaction", reply.actions[0].tool)

        // Row landed in the DB.
        val recent = repo.recentTransactions(limit = 5)
        assertEquals(1, recent.size)
        assertEquals(38.0, recent[0].amount, 0.0001)
        assertEquals("Food", recent[0].category)
        assertEquals("expense", recent[0].kind)
    }

    @Test
    fun compoundInput_recordsBothTransactionsInOneTurn() = runBlocking {
        // Single assistant turn emits two tool_use blocks — the loop must
        // execute both and feed results back.
        val client = ScriptedClient(
            listOf(
                toolUseMulti(
                    listOf(
                        "record_transaction" to buildJsonObject {
                            put("amount", 5.0); put("kind", "expense")
                            put("category", "Food"); put("description", "coffee")
                        },
                        "record_transaction" to buildJsonObject {
                            put("amount", 12.0); put("kind", "expense")
                            put("category", "Food"); put("description", "lunch")
                        },
                    )
                ),
                endTurn("Logged 5 and 12 on Food."),
            )
        )
        val agent = ExpenseAgent(repo, client = client)

        val reply = agent.converse("sk-ant-oat-x", "5 coffee and 12 lunch")

        assertEquals(2, reply.actions.size)
        val rows = repo.recentTransactions(limit = 10)
        assertEquals(2, rows.size)
        assertEquals(17.0, rows.sumOf { it.amount }, 0.0001)
    }

    @Test
    fun unknownTool_returnsErrorBlockButLoopContinues() = runBlocking {
        val client = ScriptedClient(
            listOf(
                toolUse("nonexistent_tool", buildJsonObject { put("x", 1) }),
                endTurn("Done."),
            )
        )
        val agent = ExpenseAgent(repo, client = client)

        val reply = agent.converse("sk-ant-oat-x", "do something weird")

        assertEquals(1, reply.actions.size)
        assertTrue(reply.actions[0].result.toString().contains("error"))
        // No row written.
        assertTrue(repo.recentTransactions(limit = 5).isEmpty())
    }

    @Test
    fun loopCap_returnsStuckMessage_whenModelKeepsCallingTools() = runBlocking {
        // Endless tool_use stream — the agent must give up after MAX_TURNS.
        val client = object : AnthropicClient() {
            var calls = 0
            override suspend fun messages(
                token: String, model: String, maxTokens: Int,
                system: String, tools: JsonArray, messages: JsonArray,
            ): JsonObject {
                calls++
                return toolUse("get_summary", buildJsonObject { })
            }
        }
        val agent = ExpenseAgent(repo, client = client)

        val reply = agent.converse("sk-ant-oat-x", "what's my summary?")

        assertTrue("expected stuck-in-loop reply, got: ${reply.reply}",
            reply.reply.contains("loop", ignoreCase = true))
        assertTrue(client.calls >= 3)
    }

    @Test
    fun agentLog_isPersistedAfterEachConversation() = runBlocking {
        val client = ScriptedClient(listOf(endTurn("hi back")))
        val agent = ExpenseAgent(repo, client = client)

        agent.converse("sk-ant-oat-x", "hello")

        val logs = db.agentLogDao().observeRecent(10).first()
        assertEquals(1, logs.size)
        assertEquals("hello", logs[0].userInput)
        assertEquals("hi back", logs[0].agentReply)
    }

    // --- helpers ---

    /** Replays a queued list of canned LLM responses, one per call. */
    private class ScriptedClient(private val responses: List<JsonObject>) : AnthropicClient() {
        private var idx = 0
        override suspend fun messages(
            token: String, model: String, maxTokens: Int,
            system: String, tools: JsonArray, messages: JsonArray,
        ): JsonObject {
            check(idx < responses.size) { "ScriptedClient ran out at call ${idx + 1}" }
            return responses[idx++]
        }
    }

    private fun endTurn(text: String): JsonObject = buildJsonObject {
        put("stop_reason", "end_turn")
        put("content", buildJsonArray {
            add(buildJsonObject {
                put("type", "text")
                put("text", text)
            })
        })
    }

    private fun toolUse(name: String, input: JsonObject, id: String = "toolu_1"): JsonObject =
        buildJsonObject {
            put("stop_reason", "tool_use")
            put("content", buildJsonArray {
                add(buildJsonObject {
                    put("type", "tool_use")
                    put("id", id)
                    put("name", name)
                    put("input", input)
                })
            })
        }

    private fun toolUseMulti(calls: List<Pair<String, JsonObject>>): JsonObject = buildJsonObject {
        put("stop_reason", "tool_use")
        put("content", buildJsonArray {
            calls.forEachIndexed { i, (name, input) ->
                add(buildJsonObject {
                    put("type", "tool_use")
                    put("id", "toolu_$i")
                    put("name", name)
                    put("input", input)
                })
            }
        })
    }
}
