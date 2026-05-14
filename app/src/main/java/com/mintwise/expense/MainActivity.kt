package com.mintwise.expense

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.mintwise.expense.ui.BottomBar
import com.mintwise.expense.ui.BudgetScreen
import com.mintwise.expense.ui.DashboardScreen
import com.mintwise.expense.ui.ExpenseViewModel
import com.mintwise.expense.ui.SettingsScreen
import com.mintwise.expense.ui.TransactionsScreen
import com.mintwise.expense.ui.theme.MintwiseTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MintwiseTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    AppRoot()
                }
            }
        }
    }
}

@Composable
private fun AppRoot() {
    val app = MintwiseApp.get()
    val viewModel: ExpenseViewModel = viewModel(factory = ExpenseViewModel.Factory(app))
    val nav = rememberNavController()

    Scaffold(
        bottomBar = { BottomBar(navController = nav) },
    ) { innerPadding ->
        Box(modifier = Modifier.padding(innerPadding)) {
            NavHost(navController = nav, startDestination = "dashboard") {
                composable("dashboard") { DashboardScreen(viewModel) }
                composable("budget") { BudgetScreen(viewModel) }
                composable("ledger") { TransactionsScreen(viewModel) }
                composable("settings") { SettingsScreen(viewModel) }
            }
        }
    }
}
