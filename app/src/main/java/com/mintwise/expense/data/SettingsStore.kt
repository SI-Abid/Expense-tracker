package com.mintwise.expense.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore(name = "mintwise_settings")

/**
 * Persists the Claude auth token on-device. Stored in DataStore unencrypted —
 * fine for personal builds; for a published app use EncryptedSharedPreferences
 * or a remote proxy instead.
 */
class SettingsStore(private val context: Context) {

    val tokenFlow: Flow<String?> = context.dataStore.data.map { it[TOKEN_KEY] }

    suspend fun setToken(token: String) {
        context.dataStore.edit { prefs ->
            if (token.isBlank()) prefs.remove(TOKEN_KEY) else prefs[TOKEN_KEY] = token.trim()
        }
    }

    suspend fun clearToken() {
        context.dataStore.edit { it.remove(TOKEN_KEY) }
    }

    companion object {
        private val TOKEN_KEY = stringPreferencesKey("claude_auth_token")
    }
}
