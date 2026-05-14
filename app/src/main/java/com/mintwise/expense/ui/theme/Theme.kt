package com.mintwise.expense.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// Light theme palette from the dashboard mockup.
val Indigo = Color(0xFF6366F1)            // primary
val IndigoDeep = Color(0xFF4F46E5)        // sidebar / pressed
val IndigoSoft = Color(0xFFEEF2FF)        // chip backgrounds
val Background = Color(0xFFF6F7FB)
val Surface = Color(0xFFFFFFFF)
val SurfaceMuted = Color(0xFFF1F2F7)
val Outline = Color(0xFFE5E7EF)
val TextPrimary = Color(0xFF111827)
val TextSecondary = Color(0xFF6B7280)

val Income = Color(0xFF22C55E)
val IncomeSoft = Color(0xFFDCFCE7)
val Expense = Color(0xFFEF4444)
val ExpenseSoft = Color(0xFFFEE2E2)
val Warn = Color(0xFFF59E0B)
val WarnSoft = Color(0xFFFEF3C7)

// Category palette (used by the donut chart and category chips).
val CategoryColors = listOf(
    Color(0xFF6366F1), // indigo
    Color(0xFFF59E0B), // amber
    Color(0xFF22C55E), // green
    Color(0xFFEC4899), // pink
    Color(0xFF06B6D4), // cyan
    Color(0xFFA855F7), // purple
    Color(0xFFEF4444), // red
    Color(0xFF14B8A6), // teal
    Color(0xFF8B5CF6), // violet
)

private val MintwiseLight = lightColorScheme(
    primary = Indigo,
    onPrimary = Color.White,
    primaryContainer = IndigoSoft,
    onPrimaryContainer = IndigoDeep,
    secondary = Warn,
    onSecondary = Color.White,
    tertiary = Income,
    background = Background,
    onBackground = TextPrimary,
    surface = Surface,
    onSurface = TextPrimary,
    surfaceVariant = SurfaceMuted,
    onSurfaceVariant = TextSecondary,
    outline = Outline,
    error = Expense,
    onError = Color.White,
)

@Composable
fun MintwiseTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = MintwiseLight,
        typography = MintwiseTypography,
        content = content,
    )
}
