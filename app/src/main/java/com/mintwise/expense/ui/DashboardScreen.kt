package com.mintwise.expense.ui

import android.content.ActivityNotFoundException
import android.content.Intent
import android.speech.RecognizerIntent
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AccountBalanceWallet
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.outlined.Bolt
import androidx.compose.material.icons.outlined.CalendarToday
import androidx.compose.material.icons.outlined.Flag
import androidx.compose.material.icons.outlined.Lightbulb
import androidx.compose.material.icons.outlined.Mic
import androidx.compose.material.icons.outlined.Receipt
import androidx.compose.material.icons.outlined.Send
import androidx.compose.material.icons.outlined.TrendingDown
import androidx.compose.material.icons.outlined.TrendingUp
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import java.util.Locale
import com.mintwise.expense.ui.theme.Expense
import com.mintwise.expense.ui.theme.ExpenseSoft
import com.mintwise.expense.ui.theme.Income
import com.mintwise.expense.ui.theme.IncomeSoft
import com.mintwise.expense.ui.theme.Indigo
import com.mintwise.expense.ui.theme.IndigoDeep
import com.mintwise.expense.ui.theme.IndigoSoft
import com.mintwise.expense.ui.theme.TextSecondary
import com.mintwise.expense.ui.theme.Warn
import com.mintwise.expense.ui.theme.WarnSoft

@Composable
fun DashboardScreen(viewModel: ExpenseViewModel) {
    val state by viewModel.dashboard.collectAsState()
    val oracle by viewModel.oracle.collectAsState()
    val scroll = rememberScrollState()

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .verticalScroll(scroll)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        GreetingHeader(state?.month ?: "")
        state?.let { TopStats(it) }
        state?.let { CategoryBreakdownCard(it) }
        state?.let { BudgetVsActualCard(it) }
        AgentChatCard(oracle = oracle, hasToken = state?.hasToken ?: false, onAsk = viewModel::ask)
        state?.let { AgentInsightsCard(it) }
        state?.let { UpcomingBillsCard(it, onPaid = viewModel::markBillPaid) }
        state?.let { GoalsCard(it) }
        state?.let { RecentTransactionsCard(it) }
        Spacer(Modifier.height(24.dp))
    }
}

@Composable
private fun GreetingHeader(month: String) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text("Good day,", style = MaterialTheme.typography.bodyMedium, color = TextSecondary)
            Text("here is your financial overview",
                style = MaterialTheme.typography.displayLarge)
            Spacer(Modifier.height(4.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Outlined.CalendarToday,
                    contentDescription = null,
                    tint = TextSecondary,
                    modifier = Modifier.size(14.dp),
                )
                Spacer(Modifier.width(6.dp))
                Text(month, style = MaterialTheme.typography.bodySmall, color = TextSecondary)
            }
        }
        Box(
            modifier = Modifier
                .size(44.dp)
                .clip(CircleShape)
                .background(Indigo),
            contentAlignment = Alignment.Center,
        ) {
            Text("A", color = Color.White,
                style = MaterialTheme.typography.titleLarge)
        }
    }
}

@Composable
private fun TopStats(state: DashboardState) {
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        StatTile(
            icon = Icons.Outlined.AccountBalanceWallet,
            iconTint = Indigo,
            iconBg = IndigoSoft,
            label = "Balance",
            value = formatAmount(state.funds.firstOrNull()?.balance ?: 0.0),
            modifier = Modifier.weight(1f),
        )
        StatTile(
            icon = Icons.Outlined.TrendingDown,
            iconTint = Expense,
            iconBg = ExpenseSoft,
            label = "Spent",
            value = formatAmount(state.summary.expense),
            modifier = Modifier.weight(1f),
        )
    }
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        StatTile(
            icon = Icons.Outlined.TrendingUp,
            iconTint = Income,
            iconBg = IncomeSoft,
            label = "Income",
            value = formatAmount(state.summary.income),
            modifier = Modifier.weight(1f),
        )
        val rate = if (state.summary.income > 0)
            (state.summary.net / state.summary.income * 100).coerceIn(-99.0, 99.0)
        else 0.0
        StatTile(
            icon = Icons.Outlined.Bolt,
            iconTint = Warn,
            iconBg = WarnSoft,
            label = "Savings Rate",
            value = "%.0f%%".format(rate),
            modifier = Modifier.weight(1f),
        )
    }
}

@Composable
private fun StatTile(
    icon: ImageVector,
    iconTint: Color,
    iconBg: Color,
    label: String,
    value: String,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Box(
                Modifier
                    .size(32.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(iconBg),
                contentAlignment = Alignment.Center,
            ) {
                Icon(icon, contentDescription = null, tint = iconTint, modifier = Modifier.size(18.dp))
            }
            Text(label, style = MaterialTheme.typography.labelSmall, color = TextSecondary)
            Text(value, style = MaterialTheme.typography.titleLarge)
        }
    }
}

@Composable
private fun CategoryBreakdownCard(state: DashboardState) {
    SectionCard(title = "Expenses by Category") {
        CategoryDonut(totals = state.spent, centerLabel = state.month)
    }
}

@Composable
private fun BudgetVsActualCard(state: DashboardState) {
    SectionCard(title = "Budget vs Actual") {
        if (state.budgets.isEmpty()) {
            HintText("No budgets yet. Ask the agent: \"set food budget to 400\".")
        } else {
            state.budgets.forEach { b ->
                val actual = state.spent[b.category] ?: 0.0
                val pct = if (b.amount > 0) (actual / b.amount).coerceAtMost(1.0).toFloat() else 0f
                val over = actual > b.amount
                Column(modifier = Modifier.padding(vertical = 6.dp)) {
                    Row(
                        Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Text(b.category, style = MaterialTheme.typography.bodyMedium)
                        Text(
                            "${formatAmount(actual)} / ${formatAmount(b.amount)}",
                            style = MaterialTheme.typography.bodySmall,
                            color = if (over) Expense else TextSecondary,
                        )
                    }
                    Spacer(Modifier.height(6.dp))
                    Box(
                        Modifier
                            .fillMaxWidth()
                            .height(6.dp)
                            .clip(RoundedCornerShape(3.dp))
                            .background(MaterialTheme.colorScheme.surfaceVariant),
                    ) {
                        Box(
                            Modifier
                                .fillMaxWidth(pct)
                                .height(6.dp)
                                .clip(RoundedCornerShape(3.dp))
                                .background(if (over) Expense else Indigo),
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun AgentChatCard(
    oracle: OracleState,
    hasToken: Boolean,
    onAsk: (String) -> Unit,
) {
    var text by remember { mutableStateOf("") }
    val context = LocalContext.current
    val voiceLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == android.app.Activity.RESULT_OK) {
            val spoken = result.data
                ?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)
                ?.firstOrNull()
                ?.trim()
            if (!spoken.isNullOrBlank()) text = spoken
        }
    }
    val onMicTap: () -> Unit = {
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(
                RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                RecognizerIntent.LANGUAGE_MODEL_FREE_FORM,
            )
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault())
            putExtra(RecognizerIntent.EXTRA_PROMPT, "Speak to Agentic")
        }
        try {
            voiceLauncher.launch(intent)
        } catch (e: ActivityNotFoundException) {
            Toast.makeText(
                context,
                "No speech recognizer available on this device.",
                Toast.LENGTH_SHORT,
            ).show()
        }
    }
    Card(
        colors = CardDefaults.cardColors(containerColor = Indigo),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier
                        .size(36.dp)
                        .clip(CircleShape)
                        .background(Color.White.copy(alpha = 0.15f)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Outlined.AutoAwesome, contentDescription = null, tint = Color.White)
                }
                Spacer(Modifier.width(10.dp))
                Column {
                    Text("Agentic", style = MaterialTheme.typography.titleLarge, color = Color.White)
                    Text(
                        "your financial agent",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color.White.copy(alpha = 0.8f),
                    )
                }
            }
            Text(
                "Hi! I analyze, plan, and help you save smartly. Tell me anything — " +
                    "\"spent 38 on sushi\", \"set food budget to 400\", " +
                    "\"add Europe Trip goal 4000\".",
                color = Color.White.copy(alpha = 0.9f),
                style = MaterialTheme.typography.bodyMedium,
            )
            if (!hasToken) {
                Text(
                    "No Claude token saved. Add one under Settings.",
                    color = Color.White,
                    style = MaterialTheme.typography.bodySmall,
                )
            }
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = Color.White,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Row(
                    modifier = Modifier.padding(6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    OutlinedTextField(
                        value = text,
                        onValueChange = { text = it },
                        placeholder = { Text("Ask anything…") },
                        singleLine = true,
                        modifier = Modifier.weight(1f),
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
                    )
                    Spacer(Modifier.width(4.dp))
                    IconButton(
                        onClick = onMicTap,
                        enabled = !oracle.pending,
                    ) {
                        Icon(
                            Icons.Outlined.Mic,
                            contentDescription = "Speak",
                            tint = Indigo,
                        )
                    }
                    FilledIconButton(
                        onClick = {
                            if (text.isNotBlank() && !oracle.pending) {
                                onAsk(text); text = ""
                            }
                        },
                        enabled = !oracle.pending && hasToken,
                        colors = IconButtonDefaults.filledIconButtonColors(containerColor = Indigo),
                    ) {
                        if (oracle.pending) {
                            CircularProgressIndicator(
                                color = Color.White,
                                strokeWidth = 2.dp,
                                modifier = Modifier.size(18.dp),
                            )
                        } else {
                            Icon(Icons.Outlined.Send, contentDescription = "Send", tint = Color.White)
                        }
                    }
                }
            }
            oracle.lastReply?.let { reply ->
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = Color.White.copy(alpha = 0.15f),
                ) {
                    Column(Modifier.padding(12.dp)) {
                        Text(reply, color = Color.White, style = MaterialTheme.typography.bodyMedium)
                        if (oracle.lastActions.isNotEmpty()) {
                            Spacer(Modifier.height(4.dp))
                            Text(
                                oracle.lastActions.joinToString(" · ") { it.tool },
                                color = Color.White.copy(alpha = 0.7f),
                                style = MaterialTheme.typography.labelSmall,
                            )
                        }
                    }
                }
            }
            oracle.lastError?.let { err ->
                Text(
                    "Agent error: $err",
                    color = Color.White,
                    style = MaterialTheme.typography.bodySmall,
                )
            }
        }
    }
}

@Composable
private fun AgentInsightsCard(state: DashboardState) {
    val insights = computeInsights(state)
    if (insights.isEmpty()) return
    SectionCard(title = "Insights for you") {
        insights.forEach { insight ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 6.dp),
                verticalAlignment = Alignment.Top,
            ) {
                Box(
                    Modifier
                        .size(28.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(insight.bg),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(insight.icon, contentDescription = null, tint = insight.tint,
                        modifier = Modifier.size(16.dp))
                }
                Spacer(Modifier.width(10.dp))
                Column {
                    Text(insight.title, style = MaterialTheme.typography.labelLarge)
                    Text(
                        insight.message,
                        style = MaterialTheme.typography.bodySmall,
                        color = TextSecondary,
                    )
                }
            }
        }
    }
}

@Composable
private fun UpcomingBillsCard(state: DashboardState, onPaid: (Long) -> Unit) {
    SectionCard(title = "Upcoming Bills") {
        if (state.bills.isEmpty()) {
            HintText("No upcoming bills tracked. Ask: \"add electricity bill 1800 due 2026-06-01\".")
        } else {
            state.bills.take(5).forEach { bill ->
                Row(
                    Modifier
                        .fillMaxWidth()
                        .padding(vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(
                        Modifier
                            .size(36.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .background(IndigoSoft),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(Icons.Outlined.Receipt, contentDescription = null,
                            tint = IndigoDeep, modifier = Modifier.size(18.dp))
                    }
                    Spacer(Modifier.width(10.dp))
                    Column(Modifier.weight(1f)) {
                        Text(bill.name, style = MaterialTheme.typography.bodyLarge)
                        Text(
                            "Due ${bill.dueOn}${if (bill.recurring) " · recurring" else ""}",
                            style = MaterialTheme.typography.bodySmall,
                            color = TextSecondary,
                        )
                    }
                    Text(formatAmount(bill.amount), style = MaterialTheme.typography.bodyLarge)
                    Spacer(Modifier.width(8.dp))
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = Indigo,
                        modifier = Modifier.clip(RoundedCornerShape(8.dp)),
                    ) {
                        Text(
                            "Paid",
                            color = Color.White,
                            style = MaterialTheme.typography.labelSmall,
                            modifier = Modifier
                                .padding(horizontal = 10.dp, vertical = 6.dp),
                        )
                    }
                }
                HorizontalDivider(color = MaterialTheme.colorScheme.outline)
            }
        }
    }
}

@Composable
private fun GoalsCard(state: DashboardState) {
    SectionCard(title = "Financial Goals") {
        if (state.goals.isEmpty()) {
            HintText("No goals yet. Try: \"add Europe Trip goal 4000 by 2027-06\".")
        } else {
            state.goals.take(5).forEach { goal ->
                val pct = if (goal.targetAmount > 0)
                    (goal.savedAmount / goal.targetAmount).coerceAtMost(1.0).toFloat()
                else 0f
                Column(modifier = Modifier.padding(vertical = 6.dp)) {
                    Row(
                        Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(Icons.Outlined.Flag, contentDescription = null, tint = Indigo,
                            modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(8.dp))
                        Column(Modifier.weight(1f)) {
                            Text(goal.name, style = MaterialTheme.typography.bodyLarge)
                            Text(
                                "${formatAmount(goal.savedAmount)} of ${formatAmount(goal.targetAmount)}" +
                                    (goal.deadline?.let { " · by $it" } ?: ""),
                                style = MaterialTheme.typography.bodySmall,
                                color = TextSecondary,
                            )
                        }
                        Text(
                            "%.0f%%".format(pct * 100),
                            style = MaterialTheme.typography.labelLarge,
                            color = Indigo,
                        )
                    }
                    Spacer(Modifier.height(6.dp))
                    Box(
                        Modifier
                            .fillMaxWidth()
                            .height(6.dp)
                            .clip(RoundedCornerShape(3.dp))
                            .background(MaterialTheme.colorScheme.surfaceVariant),
                    ) {
                        Box(
                            Modifier
                                .fillMaxWidth(pct)
                                .height(6.dp)
                                .clip(RoundedCornerShape(3.dp))
                                .background(Indigo),
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun RecentTransactionsCard(state: DashboardState) {
    if (state.transactions.isEmpty()) return
    SectionCard(title = "Recent Transactions") {
        state.transactions.take(6).forEach { tx ->
            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    Modifier
                        .size(36.dp)
                        .clip(CircleShape)
                        .background(if (tx.kind == "income") IncomeSoft else ExpenseSoft),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        tx.category.take(1).uppercase(),
                        color = if (tx.kind == "income") Income else Expense,
                        style = MaterialTheme.typography.labelLarge,
                    )
                }
                Spacer(Modifier.width(10.dp))
                Column(Modifier.weight(1f)) {
                    Text(tx.description, style = MaterialTheme.typography.bodyLarge)
                    Text(
                        "${tx.occurredOn} · ${tx.category}",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextSecondary,
                    )
                }
                Text(
                    "${if (tx.kind == "income") "+" else "-"}${formatAmount(tx.amount)}",
                    color = if (tx.kind == "income") Income else Expense,
                    style = MaterialTheme.typography.bodyLarge,
                )
            }
            HorizontalDivider(color = MaterialTheme.colorScheme.outline)
        }
    }
}

@Composable
private fun SectionCard(
    title: String,
    content: @Composable () -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(title, style = MaterialTheme.typography.headlineSmall)
            content()
        }
    }
}

@Composable
private fun HintText(text: String) {
    Text(text, style = MaterialTheme.typography.bodySmall, color = TextSecondary)
}

private data class Insight(
    val icon: ImageVector,
    val tint: Color,
    val bg: Color,
    val title: String,
    val message: String,
)

private fun computeInsights(state: DashboardState): List<Insight> {
    val insights = mutableListOf<Insight>()

    // Over-budget categories
    state.budgets.forEach { b ->
        val actual = state.spent[b.category] ?: 0.0
        if (actual > b.amount && b.amount > 0) {
            val over = actual - b.amount
            insights.add(
                Insight(
                    icon = Icons.Outlined.TrendingDown,
                    tint = Expense,
                    bg = ExpenseSoft,
                    title = "Over budget on ${b.category}",
                    message = "Spent ${formatAmount(actual)} against a cap of " +
                        "${formatAmount(b.amount)} — ${formatAmount(over)} over.",
                )
            )
        }
    }

    // Top category if no budget
    val topUntracked = state.spent.entries
        .filter { entry -> state.budgets.none { it.category == entry.key } }
        .maxByOrNull { it.value }
    if (topUntracked != null && topUntracked.value > 0) {
        insights.add(
            Insight(
                icon = Icons.Outlined.Lightbulb,
                tint = Warn,
                bg = WarnSoft,
                title = "Set a cap on ${topUntracked.key}?",
                message = "You spent ${formatAmount(topUntracked.value)} on ${topUntracked.key} " +
                    "this month with no budget set.",
            )
        )
    }

    // Upcoming bill due soon (within 7 days lexicographically — good enough for ISO dates)
    val nextBill = state.bills.firstOrNull()
    if (nextBill != null) {
        insights.add(
            Insight(
                icon = Icons.Outlined.Receipt,
                tint = Indigo,
                bg = IndigoSoft,
                title = "Bill due: ${nextBill.name}",
                message = "${formatAmount(nextBill.amount)} due on ${nextBill.dueOn}.",
            )
        )
    }

    // Healthy savings rate
    if (state.summary.income > 0) {
        val rate = state.summary.net / state.summary.income
        if (rate >= 0.2) {
            insights.add(
                Insight(
                    icon = Icons.Outlined.TrendingUp,
                    tint = Income,
                    bg = IncomeSoft,
                    title = "Strong savings rate",
                    message = "You're keeping ${"%.0f".format(rate * 100)}% of your income " +
                        "this month — nudge a goal forward?",
                )
            )
        }
    }

    return insights.take(4)
}
