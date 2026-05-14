package com.mintwise.expense.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.mintwise.expense.ui.theme.Expense
import com.mintwise.expense.ui.theme.Income
import com.mintwise.expense.ui.theme.TextSecondary

@Composable
fun TransactionsScreen(viewModel: ExpenseViewModel) {
    val state by viewModel.dashboard.collectAsState()

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("Ledger", style = MaterialTheme.typography.displayMedium)
        Text(
            state?.month ?: "",
            style = MaterialTheme.typography.bodyMedium,
            color = TextSecondary,
        )

        val txs = state?.transactions.orEmpty()
        if (txs.isEmpty()) {
            Text(
                "No transactions yet.",
                color = TextSecondary,
                modifier = Modifier.padding(top = 24.dp),
            )
        } else {
            Card(
                modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
            ) {
                LazyColumn(
                    contentPadding = PaddingValues(12.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    items(txs) { tx ->
                        Row(
                            Modifier.fillMaxWidth().padding(vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column(Modifier.weight(1f)) {
                                Text(tx.description, style = MaterialTheme.typography.bodyLarge)
                                Text(
                                    "${tx.occurredOn} · ${tx.category}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = TextSecondary,
                                )
                            }
                            Text(
                                "%s%.2f".format(if (tx.kind == "income") "+" else "-", tx.amount),
                                color = if (tx.kind == "income") Income else Expense,
                                style = MaterialTheme.typography.bodyLarge,
                            )
                        }
                        HorizontalDivider(color = MaterialTheme.colorScheme.outline)
                    }
                }
            }
        }
    }
}
