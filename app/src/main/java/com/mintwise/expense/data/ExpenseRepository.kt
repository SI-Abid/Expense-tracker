package com.mintwise.expense.data

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class ExpenseRepository(private val db: AppDatabase) {

    suspend fun ensureDefaultFund() {
        if (db.fundDao().byName(DEFAULT_FUND) == null) {
            db.fundDao().upsert(FundEntity(name = DEFAULT_FUND, balance = 0.0, note = "Default"))
        }
    }

    suspend fun recordTransaction(
        amount: Double,
        kind: String,
        category: String,
        description: String,
        occurredOn: String? = null,
        rawInput: String? = null,
        agentQuip: String? = null,
        fundName: String = DEFAULT_FUND,
    ): Long {
        val date = occurredOn ?: today()
        val id = db.transactionDao().insert(
            TransactionEntity(
                occurredOn = date,
                amount = amount,
                kind = kind,
                category = category,
                description = description,
                rawInput = rawInput,
                agentQuip = agentQuip,
            )
        )
        ensureDefaultFund()
        val delta = if (kind == "income") amount else -amount
        db.fundDao().adjust(fundName, delta)
        return id
    }

    suspend fun setBudget(
        category: String,
        amount: Double,
        month: String? = null,
        note: String? = null,
    ) {
        val m = month ?: currentMonth()
        val existing = db.budgetDao().forMonth(m).firstOrNull { it.category == category }
        val toSave = existing?.copy(amount = amount, note = note ?: existing.note)
            ?: BudgetEntity(month = m, category = category, amount = amount, note = note)
        db.budgetDao().upsert(toSave)
    }

    suspend fun deleteBudget(id: Long) = db.budgetDao().delete(id)

    suspend fun logAgent(userInput: String, agentReply: String, actionsJson: String?) {
        db.agentLogDao().insert(
            AgentLogEntity(
                userInput = userInput,
                agentReply = agentReply,
                actionsJson = actionsJson,
            )
        )
    }

    suspend fun monthSummary(month: String? = null): MonthSummary {
        val m = month ?: currentMonth()
        val income = db.transactionDao().income(m)
        val expense = db.transactionDao().expense(m)
        val budgets = db.budgetDao().forMonth(m)
        val budgeted = budgets.sumOf { it.amount }
        return MonthSummary(
            month = m,
            income = income,
            expense = expense,
            net = income - expense,
            budgeted = budgeted,
        )
    }

    suspend fun categoryTotals(month: String? = null): Map<String, Double> {
        val m = month ?: currentMonth()
        return db.transactionDao().categoryTotals(m).associate { it.category to it.total }
    }

    suspend fun recentTransactions(month: String? = null, limit: Int = 20): List<TransactionEntity> {
        val m = month ?: currentMonth()
        return db.transactionDao().forMonth(m, limit)
    }

    suspend fun budgetsFor(month: String? = null): List<BudgetEntity> {
        val m = month ?: currentMonth()
        return db.budgetDao().forMonth(m)
    }

    suspend fun upsertGoal(
        name: String,
        targetAmount: Double,
        savedAmount: Double? = null,
        deadline: String? = null,
        note: String? = null,
    ): Long {
        val existing = db.goalDao().byName(name)
        val toSave = existing?.copy(
            targetAmount = targetAmount,
            savedAmount = savedAmount ?: existing.savedAmount,
            deadline = deadline ?: existing.deadline,
            note = note ?: existing.note,
        ) ?: GoalEntity(
            name = name,
            targetAmount = targetAmount,
            savedAmount = savedAmount ?: 0.0,
            deadline = deadline,
            note = note,
        )
        return db.goalDao().upsert(toSave)
    }

    suspend fun addGoalProgress(name: String, delta: Double) {
        val goal = db.goalDao().byName(name) ?: return
        db.goalDao().addProgress(goal.id, delta)
    }

    suspend fun deleteGoal(id: Long) = db.goalDao().delete(id)

    suspend fun goals(): List<GoalEntity> = db.goalDao().all()

    suspend fun addBill(
        name: String,
        amount: Double,
        dueOn: String,
        recurring: Boolean = false,
    ): Long = db.billDao().upsert(
        BillEntity(name = name, amount = amount, dueOn = dueOn, recurring = recurring)
    )

    suspend fun markBillPaid(id: Long) = db.billDao().markPaid(id)

    suspend fun deleteBill(id: Long) = db.billDao().delete(id)

    suspend fun upcomingBills(limit: Int = 5): List<BillEntity> = db.billDao().upcoming(limit)

    companion object {
        const val DEFAULT_FUND = "Main Wallet"

        fun currentMonth(): String = monthFormat.format(Date())
        fun today(): String = dayFormat.format(Date())

        private val monthFormat = SimpleDateFormat("yyyy-MM", Locale.US)
        private val dayFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)
    }
}

data class MonthSummary(
    val month: String,
    val income: Double,
    val expense: Double,
    val net: Double,
    val budgeted: Double,
)
