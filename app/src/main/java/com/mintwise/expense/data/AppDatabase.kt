package com.mintwise.expense.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(
    entities = [
        BudgetEntity::class,
        TransactionEntity::class,
        FundEntity::class,
        AgentLogEntity::class,
        GoalEntity::class,
        BillEntity::class,
    ],
    version = 1,
    exportSchema = false,
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun budgetDao(): BudgetDao
    abstract fun transactionDao(): TransactionDao
    abstract fun fundDao(): FundDao
    abstract fun agentLogDao(): AgentLogDao
    abstract fun goalDao(): GoalDao
    abstract fun billDao(): BillDao

    companion object {
        @Volatile private var instance: AppDatabase? = null

        fun get(context: Context): AppDatabase =
            instance ?: synchronized(this) {
                instance ?: Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "mintwise.db",
                ).fallbackToDestructiveMigration().build().also { instance = it }
            }
    }
}
