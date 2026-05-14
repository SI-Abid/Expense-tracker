package com.mintwise.expense.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material.icons.outlined.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import com.mintwise.expense.ui.theme.Expense
import com.mintwise.expense.ui.theme.Income
import com.mintwise.expense.ui.theme.TextSecondary

@Composable
fun SettingsScreen(viewModel: ExpenseViewModel) {
    val savedToken by viewModel.token.collectAsState()
    var draft by remember { mutableStateOf("") }
    var revealed by remember { mutableStateOf(false) }
    var saved by remember { mutableStateOf(false) }
    val scroll = rememberScrollState()

    LaunchedEffect(savedToken) {
        if (draft.isEmpty()) draft = savedToken
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(scroll)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text("Settings", style = MaterialTheme.typography.displayMedium)

        Card(
            modifier = Modifier.fillMaxWidth(),
            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        ) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("Claude auth token", style = MaterialTheme.typography.headlineSmall)
                Text(
                    "Paste a Claude OAuth token (sk-ant-oat…) or an API key. Stored on " +
                        "this device. Tokens beginning with sk-ant-oat use the OAuth " +
                        "bearer header; anything else is sent as x-api-key.",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextSecondary,
                )
                OutlinedTextField(
                    value = draft,
                    onValueChange = { draft = it; saved = false },
                    label = { Text("Token") },
                    singleLine = true,
                    visualTransformation = if (revealed) VisualTransformation.None else PasswordVisualTransformation(),
                    trailingIcon = {
                        IconButton(onClick = { revealed = !revealed }) {
                            Icon(
                                if (revealed) Icons.Outlined.VisibilityOff else Icons.Outlined.Visibility,
                                contentDescription = null,
                            )
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(
                        onClick = {
                            viewModel.setToken(draft)
                            saved = true
                        },
                        enabled = draft.isNotBlank(),
                    ) { Text("Save") }
                    OutlinedButton(
                        onClick = {
                            viewModel.clearToken()
                            draft = ""
                            saved = false
                        },
                    ) { Text("Clear") }
                }
                if (saved) {
                    Text("Saved.", color = Income, style = MaterialTheme.typography.bodySmall)
                }
                if (savedToken.isNotBlank()) {
                    Text(
                        "Active token: ${savedToken.take(10)}… (${savedToken.length} chars)",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextSecondary,
                    )
                } else {
                    Text(
                        "No token set — the agent stays silent until you add one.",
                        color = Expense,
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
            }
        }

        Card(
            modifier = Modifier.fillMaxWidth(),
            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        ) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text("About", style = MaterialTheme.typography.headlineSmall)
                Text(
                    "Agentic records expenses, income, budgets, goals, and bills via an " +
                        "LLM agent (Claude) that calls tools to mutate a local SQLite " +
                        "database. All data lives on this device.",
                    style = MaterialTheme.typography.bodyMedium,
                )
                Spacer(Modifier.width(4.dp))
                Text(
                    "Model: claude-opus-4-7  ·  Endpoint: api.anthropic.com",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextSecondary,
                )
            }
        }
    }
}
