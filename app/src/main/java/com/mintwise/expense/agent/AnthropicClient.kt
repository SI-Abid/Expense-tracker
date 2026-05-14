package com.mintwise.expense.agent

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.contentOrNull
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.util.concurrent.TimeUnit

/**
 * Thin wrapper around the Anthropic Messages API.
 *
 * Auth: pass a Claude OAuth token (sk-ant-oat...) — sent as `Authorization: Bearer`.
 * If the token starts with anything else it is treated as an API key and sent
 * via the `x-api-key` header.
 *
 * No SDK dependency — uses OkHttp and kotlinx-serialization directly. This keeps
 * the APK small and avoids transitive desugaring issues that the Java SDK can
 * introduce on Android.
 */
class AnthropicClient(
    private val httpClient: OkHttpClient = defaultClient,
    private val json: Json = jsonCodec,
) {
    suspend fun messages(
        token: String,
        model: String,
        maxTokens: Int,
        system: String,
        tools: JsonArray,
        messages: JsonArray,
    ): JsonObject = withContext(Dispatchers.IO) {
        val body = buildJsonObject {
            put("model", model)
            put("max_tokens", maxTokens)
            put("system", system)
            put("tools", tools)
            put("messages", messages)
        }
        val request = Request.Builder()
            .url(MESSAGES_URL)
            .addHeader("anthropic-version", ANTHROPIC_VERSION)
            .addHeader("content-type", "application/json")
            .also { applyAuth(it, token) }
            .post(json.encodeToString(JsonObject.serializer(), body).toRequestBody(JSON_MEDIA))
            .build()

        httpClient.newCall(request).execute().use { resp ->
            val responseBody = resp.body?.string().orEmpty()
            if (!resp.isSuccessful) {
                val message = extractErrorMessage(responseBody) ?: responseBody.take(200)
                throw IOException("Anthropic API ${resp.code}: $message")
            }
            json.parseToJsonElement(responseBody).jsonObject
        }
    }

    private fun applyAuth(builder: Request.Builder, token: String) {
        val trimmed = token.trim()
        if (trimmed.startsWith("sk-ant-oat")) {
            builder.addHeader("Authorization", "Bearer $trimmed")
        } else {
            builder.addHeader("x-api-key", trimmed)
        }
    }

    private fun extractErrorMessage(body: String): String? = runCatching {
        json.parseToJsonElement(body).jsonObject["error"]
            ?.jsonObject?.get("message")
            ?.jsonPrimitive?.contentOrNull
    }.getOrNull()

    companion object {
        const val MESSAGES_URL = "https://api.anthropic.com/v1/messages"
        const val ANTHROPIC_VERSION = "2023-06-01"
        const val DEFAULT_MODEL = "claude-opus-4-7"

        private val JSON_MEDIA = "application/json; charset=utf-8".toMediaType()

        val defaultClient: OkHttpClient = OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()

        val jsonCodec: Json = Json {
            ignoreUnknownKeys = true
            encodeDefaults = true
        }
    }
}

// Small DSL helpers used by ExpenseAgent.

internal fun toolDefinition(
    name: String,
    description: String,
    schema: JsonObject,
): JsonObject = buildJsonObject {
    put("name", name)
    put("description", description)
    put("input_schema", schema)
}

internal fun userMessage(text: String): JsonObject = buildJsonObject {
    put("role", "user")
    put("content", text)
}

internal fun assistantContentMessage(content: JsonArray): JsonObject = buildJsonObject {
    put("role", "assistant")
    put("content", content)
}

internal fun userToolResults(blocks: List<JsonObject>): JsonObject = buildJsonObject {
    put("role", "user")
    put("content", buildJsonArray { blocks.forEach { add(it) } })
}

internal fun toolResultBlock(toolUseId: String, content: String): JsonObject = buildJsonObject {
    put("type", "tool_result")
    put("tool_use_id", toolUseId)
    put("content", content)
}

internal fun JsonElement.asString(): String? = (this as? kotlinx.serialization.json.JsonPrimitive)?.contentOrNull
