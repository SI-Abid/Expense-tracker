package com.mintwise.expense.data

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "budgets",
    indices = [Index(value = ["month", "category"], unique = true)],
)
data class BudgetEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val month: String,
    val category: String,
    val amount: Double,
    val note: String? = null,
    val createdAt: Long = System.currentTimeMillis(),
)

@Entity(tableName = "transactions")
data class TransactionEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val occurredOn: String,
    val amount: Double,
    val kind: String, // "expense" | "income"
    val category: String,
    val description: String,
    val rawInput: String? = null,
    val agentQuip: String? = null,
    val createdAt: Long = System.currentTimeMillis(),
)

@Entity(tableName = "funds")
data class FundEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val balance: Double = 0.0,
    val note: String? = null,
    val updatedAt: Long = System.currentTimeMillis(),
)

@Entity(tableName = "agent_log")
data class AgentLogEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val userInput: String,
    val agentReply: String,
    val actionsJson: String? = null,
    val createdAt: Long = System.currentTimeMillis(),
)

@Entity(tableName = "goals")
data class GoalEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val targetAmount: Double,
    val savedAmount: Double = 0.0,
    val deadline: String? = null,
    val note: String? = null,
    val createdAt: Long = System.currentTimeMillis(),
)

@Entity(tableName = "bills")
data class BillEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val amount: Double,
    val dueOn: String,
    val recurring: Boolean = false,
    val paid: Boolean = false,
    val createdAt: Long = System.currentTimeMillis(),
)
