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
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.mintwise.expense.ui.theme.Expense
import com.mintwise.expense.ui.theme.Income
import com.mintwise.expense.ui.theme.TextSecondary

@Composable
fun BudgetScreen(viewModel: ExpenseViewModel) {
    val state by viewModel.dashboard.collectAsState()
    val scroll = rememberScrollState()

    var category by remember { mutableStateOf("") }
    var amount by remember { mutableStateOf("") }
    var note by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(scroll)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text("Monthly Budgets", style = MaterialTheme.typography.displayMedium)
        Text(
            "Set caps here, or tell the agent (e.g. \"set entertainment budget to 150\").",
            style = MaterialTheme.typography.bodyMedium,
            color = TextSecondary,
        )

        Card(
            modifier = Modifier.fillMaxWidth(),
            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        ) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("Add or update", style = MaterialTheme.typography.headlineSmall)
                OutlinedTextField(
                    value = category,
                    onValueChange = { category = it },
                    label = { Text("Category (Food, Bills…)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = amount,
                    onValueChange = { amount = it.filter { ch -> ch.isDigit() || ch == '.' } },
                    label = { Text("Monthly cap") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = note,
                    onValueChange = { note = it },
                    label = { Text("Note (optional)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                Button(
                    enabled = category.isNotBlank() && amount.toDoubleOrNull() != null,
                    onClick = {
                        viewModel.setBudgetManual(
                            category = category.trim(),
                            amount = amount.toDouble(),
                            note = note.trim().ifBlank { null },
                        )
                        category = ""; amount = ""; note = ""
                    },
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text("Save budget")
                }
            }
        }

        state?.let { s ->
            Card(
                modifier = Modifier.fillMaxWidth(),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
            ) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("${s.month} budgets", style = MaterialTheme.typography.headlineSmall)
                    if (s.budgets.isEmpty()) {
                        Text("No budgets set.", color = TextSecondary,
                            style = MaterialTheme.typography.bodySmall)
                    } else {
                        s.budgets.forEach { b ->
                            val actual = s.spent[b.category] ?: 0.0
                            val remaining = b.amount - actual
                            Row(
                                Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Column(Modifier.weight(1f)) {
                                    Text(b.category, style = MaterialTheme.typography.bodyLarge)
                                    Text(
                                        "Cap %.2f · spent %.2f".format(b.amount, actual),
                                        style = MaterialTheme.typography.bodySmall,
                                        color = TextSecondary,
                                    )
                                    b.note?.takeIf { it.isNotBlank() }?.let { n ->
                                        Text(
                                            n,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = TextSecondary,
                                        )
                                    }
                                }
                                Spacer(Modifier.width(8.dp))
                                Column(horizontalAlignment = Alignment.End) {
                                    Text(
                                        "%.2f left".format(remaining),
                                        color = if (remaining < 0) Expense else Income,
                                        style = MaterialTheme.typography.bodyLarge,
                                    )
                                    TextButton(onClick = { viewModel.deleteBudget(b.id) }) {
                                        Text("remove", color = Expense)
                                    }
                                }
                            }
                            HorizontalDivider(color = MaterialTheme.colorScheme.outline)
                        }
                    }
                }
            }
        }

        Spacer(Modifier.padding(8.dp))
    }
}
