package com.mintwise.expense.agent

import androidx.room.Room
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.mintwise.expense.data.AppDatabase
import com.mintwise.expense.data.ExpenseRepository
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Live smoke test against the real Anthropic API. Skipped (via JUnit
 * Assume) unless `CLAUDE_OAUTH_TOKEN` is provided as an instrumentation
 * argument or environment variable. CI injects it via repo secrets;
 * local runs without the secret simply skip.
 *
 * Pass at runtime with:
 *   gradle :app:connectedDebugAndroidTest \
 *     -Pandroid.testInstrumentationRunnerArguments.CLAUDE_OAUTH_TOKEN=sk-ant-oat-...
 *
 * Or set the env var on the gradle process — the build script forwards it
 * into the instrumentation args.
 */
@RunWith(AndroidJUnit4::class)
class AnthropicLiveSmokeTest {

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

    private fun token(): String {
        val args = InstrumentationRegistry.getArguments()
        return args.getString("CLAUDE_OAUTH_TOKEN").orEmpty()
            .ifBlank { System.getenv("CLAUDE_OAUTH_TOKEN").orEmpty() }
    }

    @Test
    fun realAgentRecordsAnExpense() = runBlocking {
        val tok = token()
        assumeTrue("CLAUDE_OAUTH_TOKEN not set — skipping live smoke", tok.isNotBlank())

        val agent = ExpenseAgent(repo)
        val reply = agent.converse(tok, "log a 7 dollar coffee from this morning")

        // We don't pin the exact reply text — that depends on the model. We
        // only require that the tool loop fired and a row landed.
        assertFalse("agent produced no actions: ${reply.reply}", reply.actions.isEmpty())
        val rows = repo.recentTransactions(limit = 5)
        assertTrue("no transaction persisted, actions=${reply.actions}", rows.isNotEmpty())
        assertTrue("expected an expense around 7, got ${rows.map { it.amount }}",
            rows.any { it.kind == "expense" && it.amount in 5.0..15.0 })
    }
}
