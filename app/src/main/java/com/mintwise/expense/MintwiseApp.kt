package com.mintwise.expense

import android.app.Application
import com.mintwise.expense.agent.AnthropicClient
import com.mintwise.expense.agent.ExpenseAgent
import com.mintwise.expense.data.AppDatabase
import com.mintwise.expense.data.ExpenseRepository
import com.mintwise.expense.data.SettingsStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class MintwiseApp : Application() {
    lateinit var repository: ExpenseRepository
        private set
    lateinit var settings: SettingsStore
        private set
    lateinit var agent: ExpenseAgent
        private set

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onCreate() {
        super.onCreate()
        instance = this
        val db = AppDatabase.get(this)
        repository = ExpenseRepository(db)
        settings = SettingsStore(this)
        agent = ExpenseAgent(repository, AnthropicClient())
        scope.launch { repository.ensureDefaultFund() }
    }

    companion object {
        @Volatile private var instance: MintwiseApp? = null
        fun get(): MintwiseApp = instance!!
    }
}
