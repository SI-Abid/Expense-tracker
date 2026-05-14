package com.mintwise.expense.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.mintwise.expense.MintwiseApp
import com.mintwise.expense.agent.AgentAction
import com.mintwise.expense.agent.ExpenseAgent
import com.mintwise.expense.data.AgentLogEntity
import com.mintwise.expense.data.AppDatabase
import com.mintwise.expense.data.BillEntity
import com.mintwise.expense.data.BudgetEntity
import com.mintwise.expense.data.ExpenseRepository
import com.mintwise.expense.data.FundEntity
import com.mintwise.expense.data.GoalEntity
import com.mintwise.expense.data.MonthSummary
import com.mintwise.expense.data.SettingsStore
import com.mintwise.expense.data.TransactionEntity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class DashboardState(
    val month: String,
    val summary: MonthSummary,
    val budgets: List<BudgetEntity>,
    val spent: Map<String, Double>,
    val transactions: List<TransactionEntity>,
    val funds: List<FundEntity>,
    val log: List<AgentLogEntity>,
    val goals: List<GoalEntity>,
    val bills: List<BillEntity>,
    val hasToken: Boolean,
)

data class OracleState(
    val pending: Boolean = false,
    val lastReply: String? = null,
    val lastActions: List<AgentAction> = emptyList(),
    val lastError: String? = null,
)

private data class MoneySnapshot(
    val budgets: List<BudgetEntity>,
    val transactions: List<TransactionEntity>,
    val spent: Map<String, Double>,
    val income: Double,
    val expense: Double,
)

private data class ExtrasSnapshot(
    val funds: List<FundEntity>,
    val log: List<AgentLogEntity>,
    val goals: List<GoalEntity>,
    val bills: List<BillEntity>,
)

@OptIn(ExperimentalCoroutinesApi::class)
class ExpenseViewModel(
    private val app: MintwiseApp,
) : ViewModel() {

    private val repo: ExpenseRepository = app.repository
    private val agent: ExpenseAgent = app.agent
    private val settings: SettingsStore = app.settings
    private val db: AppDatabase = AppDatabase.get(app)

    private val _month = MutableStateFlow(ExpenseRepository.currentMonth())
    val month: StateFlow<String> = _month.asStateFlow()

    private val _oracle = MutableStateFlow(OracleState())
    val oracle: StateFlow<OracleState> = _oracle.asStateFlow()

    val token: StateFlow<String> = settings.tokenFlow
        .map { it.orEmpty() }
        .stateIn(viewModelScope, SharingStarted.Eagerly, "")

    val dashboard: StateFlow<DashboardState?> = _month.flatMapLatest { m ->
        val moneyFlow = combine(
            db.budgetDao().observeForMonth(m),
            db.transactionDao().observeForMonth(m, 50),
            db.transactionDao().observeCategoryTotals(m),
            db.transactionDao().observeIncome(m),
            db.transactionDao().observeExpense(m),
        ) { budgets, txs, totals, income, expense ->
            MoneySnapshot(
                budgets = budgets,
                transactions = txs,
                spent = totals.associate { it.category to it.total },
                income = income,
                expense = expense,
            )
        }
        val extrasFlow = combine(
            db.fundDao().observeAll(),
            db.agentLogDao().observeRecent(8),
            db.goalDao().observeAll(),
            db.billDao().observeUpcoming(),
        ) { funds, log, goals, bills ->
            ExtrasSnapshot(funds, log, goals, bills)
        }
        combine(moneyFlow, extrasFlow, settings.tokenFlow) { money, extras, tok ->
            DashboardState(
                month = m,
                summary = MonthSummary(
                    month = m,
                    income = money.income,
                    expense = money.expense,
                    net = money.income - money.expense,
                    budgeted = money.budgets.sumOf { it.amount },
                ),
                budgets = money.budgets,
                spent = money.spent,
                transactions = money.transactions,
                funds = extras.funds,
                log = extras.log,
                goals = extras.goals,
                bills = extras.bills,
                hasToken = !tok.isNullOrBlank(),
            )
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), null)

    fun setMonth(m: String) { _month.value = m }

    fun ask(input: String) {
        val trimmed = input.trim()
        if (trimmed.isBlank()) return
        viewModelScope.launch(Dispatchers.IO) {
            _oracle.value = OracleState(pending = true)
            try {
                val result = agent.converse(token.value, trimmed)
                _oracle.value = OracleState(
                    pending = false,
                    lastReply = result.reply,
                    lastActions = result.actions,
                )
            } catch (e: Exception) {
                _oracle.value = OracleState(
                    pending = false,
                    lastError = friendlyError(e.message),
                )
            }
        }
    }

    fun setToken(value: String) {
        viewModelScope.launch { settings.setToken(value) }
    }

    fun clearToken() {
        viewModelScope.launch { settings.clearToken() }
    }

    fun setBudgetManual(category: String, amount: Double, note: String?) {
        viewModelScope.launch { repo.setBudget(category, amount, note = note) }
    }

    fun deleteBudget(id: Long) {
        viewModelScope.launch { repo.deleteBudget(id) }
    }

    fun deleteGoal(id: Long) {
        viewModelScope.launch { repo.deleteGoal(id) }
    }

    fun markBillPaid(id: Long) {
        viewModelScope.launch { repo.markBillPaid(id) }
    }

    fun deleteBill(id: Long) {
        viewModelScope.launch { repo.deleteBill(id) }
    }

    private fun friendlyError(raw: String?): String {
        val msg = raw.orEmpty()
        return when {
            "429" in msg -> "Hit Claude's rate limit. Wait a moment and try again."
            "401" in msg || "403" in msg ->
                "Claude rejected the token. Check Settings."
            "529" in msg -> "Anthropic is overloaded. Try again in a few seconds."
            msg.isBlank() -> "Agent could not be reached."
            else -> msg
        }
    }

    class Factory(private val app: MintwiseApp) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T =
            ExpenseViewModel(app) as T
    }
}
