package com.mintwise.expense.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

data class CategoryTotal(val category: String, val total: Double)

@Dao
interface BudgetDao {
    @Query("SELECT * FROM budgets WHERE month = :month ORDER BY category")
    fun observeForMonth(month: String): Flow<List<BudgetEntity>>

    @Query("SELECT * FROM budgets WHERE month = :month ORDER BY category")
    suspend fun forMonth(month: String): List<BudgetEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(budget: BudgetEntity): Long

    @Query("DELETE FROM budgets WHERE id = :id")
    suspend fun delete(id: Long)
}

@Dao
interface TransactionDao {
    @Query("SELECT * FROM transactions ORDER BY occurredOn DESC, id DESC LIMIT :limit")
    fun observeRecent(limit: Int): Flow<List<TransactionEntity>>

    @Query(
        """SELECT * FROM transactions
           WHERE substr(occurredOn, 1, 7) = :month
           ORDER BY occurredOn DESC, id DESC LIMIT :limit"""
    )
    fun observeForMonth(month: String, limit: Int): Flow<List<TransactionEntity>>

    @Query(
        """SELECT * FROM transactions
           WHERE substr(occurredOn, 1, 7) = :month
           ORDER BY occurredOn DESC, id DESC LIMIT :limit"""
    )
    suspend fun forMonth(month: String, limit: Int): List<TransactionEntity>

    @Query(
        """SELECT category, COALESCE(SUM(amount), 0) AS total
           FROM transactions
           WHERE kind = 'expense' AND substr(occurredOn, 1, 7) = :month
           GROUP BY category"""
    )
    fun observeCategoryTotals(month: String): Flow<List<CategoryTotal>>

    @Query(
        """SELECT category, COALESCE(SUM(amount), 0) AS total
           FROM transactions
           WHERE kind = 'expense' AND substr(occurredOn, 1, 7) = :month
           GROUP BY category"""
    )
    suspend fun categoryTotals(month: String): List<CategoryTotal>

    @Query(
        """SELECT COALESCE(SUM(CASE WHEN kind = 'income' THEN amount END), 0)
           FROM transactions WHERE substr(occurredOn, 1, 7) = :month"""
    )
    fun observeIncome(month: String): Flow<Double>

    @Query(
        """SELECT COALESCE(SUM(CASE WHEN kind = 'expense' THEN amount END), 0)
           FROM transactions WHERE substr(occurredOn, 1, 7) = :month"""
    )
    fun observeExpense(month: String): Flow<Double>

    @Query(
        """SELECT COALESCE(SUM(CASE WHEN kind = 'income' THEN amount END), 0)
           FROM transactions WHERE substr(occurredOn, 1, 7) = :month"""
    )
    suspend fun income(month: String): Double

    @Query(
        """SELECT COALESCE(SUM(CASE WHEN kind = 'expense' THEN amount END), 0)
           FROM transactions WHERE substr(occurredOn, 1, 7) = :month"""
    )
    suspend fun expense(month: String): Double

    @Insert
    suspend fun insert(tx: TransactionEntity): Long
}

@Dao
interface FundDao {
    @Query("SELECT * FROM funds ORDER BY name")
    fun observeAll(): Flow<List<FundEntity>>

    @Query("SELECT * FROM funds WHERE name = :name LIMIT 1")
    suspend fun byName(name: String): FundEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(fund: FundEntity)

    @Query("UPDATE funds SET balance = balance + :delta, updatedAt = :now WHERE name = :name")
    suspend fun adjust(name: String, delta: Double, now: Long = System.currentTimeMillis())
}

@Dao
interface AgentLogDao {
    @Query("SELECT * FROM agent_log ORDER BY id DESC LIMIT :limit")
    fun observeRecent(limit: Int): Flow<List<AgentLogEntity>>

    @Insert
    suspend fun insert(entry: AgentLogEntity): Long
}

@Dao
interface GoalDao {
    @Query("SELECT * FROM goals ORDER BY id DESC")
    fun observeAll(): Flow<List<GoalEntity>>

    @Query("SELECT * FROM goals ORDER BY id DESC")
    suspend fun all(): List<GoalEntity>

    @Query("SELECT * FROM goals WHERE name = :name LIMIT 1")
    suspend fun byName(name: String): GoalEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(goal: GoalEntity): Long

    @Query("UPDATE goals SET savedAmount = savedAmount + :delta WHERE id = :id")
    suspend fun addProgress(id: Long, delta: Double)

    @Query("DELETE FROM goals WHERE id = :id")
    suspend fun delete(id: Long)
}

@Dao
interface BillDao {
    @Query("SELECT * FROM bills WHERE paid = 0 ORDER BY dueOn ASC")
    fun observeUpcoming(): Flow<List<BillEntity>>

    @Query("SELECT * FROM bills WHERE paid = 0 ORDER BY dueOn ASC LIMIT :limit")
    suspend fun upcoming(limit: Int): List<BillEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(bill: BillEntity): Long

    @Query("UPDATE bills SET paid = 1 WHERE id = :id")
    suspend fun markPaid(id: Long)

    @Query("DELETE FROM bills WHERE id = :id")
    suspend fun delete(id: Long)
}
