package com.mintwise.expense.agent

import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Before
import org.junit.Test
import java.io.IOException
import java.util.concurrent.TimeUnit

/**
 * Verifies the HTTP/auth/retry contract with the Anthropic Messages API.
 * The agent depends on these guarantees — a regression here breaks every
 * user message regardless of the model behind it.
 */
class AnthropicClientTest {

    private lateinit var server: MockWebServer
    private lateinit var client: AnthropicClient

    @Before
    fun setUp() {
        server = MockWebServer()
        server.start()
        // Aggressive timeouts so a hung test doesn't stall CI for 60s.
        val http = OkHttpClient.Builder()
            .connectTimeout(2, TimeUnit.SECONDS)
            .readTimeout(2, TimeUnit.SECONDS)
            .build()
        client = AnthropicClient(
            httpClient = http,
            baseUrl = server.url("/v1/messages").toString(),
        )
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    @Test
    fun `oauth token uses Authorization Bearer header`() = runTest {
        server.enqueue(okResponse())

        client.messages(
            token = "sk-ant-oat-fake-token",
            model = "claude-opus-4-7",
            maxTokens = 512,
            system = "test",
            tools = JsonArray(emptyList()),
            messages = buildJsonArray { add(userMessage("hi")) },
        )

        val recorded = server.takeRequest()
        assertEquals("Bearer sk-ant-oat-fake-token", recorded.getHeader("Authorization"))
        assertNull(recorded.getHeader("x-api-key"))
        assertEquals("2023-06-01", recorded.getHeader("anthropic-version"))
    }

    @Test
    fun `non-oauth token uses x-api-key header`() = runTest {
        server.enqueue(okResponse())

        client.messages(
            token = "sk-ant-api-fake-key",
            model = "claude-opus-4-7",
            maxTokens = 512,
            system = "test",
            tools = JsonArray(emptyList()),
            messages = buildJsonArray { add(userMessage("hi")) },
        )

        val recorded = server.takeRequest()
        assertEquals("sk-ant-api-fake-key", recorded.getHeader("x-api-key"))
        assertNull(recorded.getHeader("Authorization"))
    }

    @Test
    fun `request body contains model max_tokens system tools and messages`() = runTest {
        server.enqueue(okResponse())

        client.messages(
            token = "sk-ant-oat-x",
            model = "claude-haiku-4-5",
            maxTokens = 256,
            system = "You are Agentic.",
            tools = buildJsonArray {
                add(buildJsonObject {
                    put("name", "ping")
                    put("description", "ping")
                    put("input_schema", buildJsonObject { put("type", "object") })
                })
            },
            messages = buildJsonArray { add(userMessage("hello")) },
        )

        val body = Json.parseToJsonElement(server.takeRequest().body.readUtf8()).jsonObject
        assertEquals("claude-haiku-4-5", body["model"]!!.jsonPrimitive.content)
        assertEquals(256, body["max_tokens"]!!.jsonPrimitive.content.toInt())
        assertEquals("You are Agentic.", body["system"]!!.jsonPrimitive.content)
        assertEquals(1, body["tools"]!!.jsonArray.size)
        assertEquals(1, body["messages"]!!.jsonArray.size)
    }

    @Test
    fun `429 is retried with exponential backoff and then succeeds`() = runTest {
        server.enqueue(MockResponse().setResponseCode(429).setBody("{\"error\":{\"message\":\"rate limited\"}}"))
        server.enqueue(okResponse())

        val response = client.messages(
            token = "sk-ant-oat-x",
            model = "claude-opus-4-7",
            maxTokens = 64,
            system = "s",
            tools = JsonArray(emptyList()),
            messages = buildJsonArray { add(userMessage("hi")) },
        )

        assertEquals("end_turn", response["stop_reason"]!!.jsonPrimitive.content)
        assertEquals(2, server.requestCount)
    }

    @Test
    fun `500 is retried then surfaces failure after max attempts`() = runTest {
        repeat(3) {
            server.enqueue(MockResponse().setResponseCode(500).setBody("{\"error\":{\"message\":\"boom\"}}"))
        }

        try {
            client.messages(
                token = "sk-ant-oat-x",
                model = "claude-opus-4-7",
                maxTokens = 64,
                system = "s",
                tools = JsonArray(emptyList()),
                messages = buildJsonArray { add(userMessage("hi")) },
            )
            fail("expected IOException")
        } catch (e: IOException) {
            assertTrue(e.message!!.contains("500"))
            assertTrue(e.message!!.contains("boom"))
        }
        assertEquals(3, server.requestCount)
    }

    @Test
    fun `400 fails immediately without retry`() = runTest {
        server.enqueue(MockResponse().setResponseCode(400).setBody(
            "{\"error\":{\"message\":\"invalid model\"}}"
        ))

        try {
            client.messages(
                token = "sk-ant-oat-x",
                model = "bad",
                maxTokens = 64,
                system = "s",
                tools = JsonArray(emptyList()),
                messages = buildJsonArray { add(userMessage("hi")) },
            )
            fail("expected IOException")
        } catch (e: IOException) {
            assertTrue(e.message!!.contains("invalid model"))
        }
        assertEquals(1, server.requestCount)
    }

    @Test
    fun `Retry-After header is honored as seconds`() = runTest {
        // 0-second Retry-After so the test doesn't actually sleep.
        server.enqueue(MockResponse().setResponseCode(429).setHeader("Retry-After", "0"))
        server.enqueue(okResponse())

        val start = System.currentTimeMillis()
        client.messages(
            token = "sk-ant-oat-x",
            model = "claude-opus-4-7",
            maxTokens = 64,
            system = "s",
            tools = JsonArray(emptyList()),
            messages = buildJsonArray { add(userMessage("hi")) },
        )
        val elapsed = System.currentTimeMillis() - start

        // Must have retried, and the 0-second hint short-circuits the 1s default backoff.
        assertEquals(2, server.requestCount)
        assertTrue("Retry-After=0 should skip default backoff, elapsed=$elapsed", elapsed < 800)
    }

    @Test
    fun `success response is parsed into JsonObject`() = runTest {
        server.enqueue(okResponse())

        val response = client.messages(
            token = "sk-ant-oat-x",
            model = "claude-opus-4-7",
            maxTokens = 64,
            system = "s",
            tools = JsonArray(emptyList()),
            messages = buildJsonArray { add(userMessage("hi")) },
        )

        assertNotNull(response["content"])
        assertEquals("end_turn", response["stop_reason"]!!.jsonPrimitive.content)
    }

    private fun okResponse(): MockResponse = MockResponse()
        .setResponseCode(200)
        .setBody(
            """{
              "id": "msg_test",
              "type": "message",
              "role": "assistant",
              "stop_reason": "end_turn",
              "content": [ { "type": "text", "text": "ok" } ]
            }""".trimIndent()
        )
}
