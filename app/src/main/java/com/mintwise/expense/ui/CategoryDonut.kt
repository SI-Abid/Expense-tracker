package com.mintwise.expense.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp
import com.mintwise.expense.ui.theme.CategoryColors
import com.mintwise.expense.ui.theme.TextSecondary

@Composable
fun CategoryDonut(
    totals: Map<String, Double>,
    modifier: Modifier = Modifier,
    centerLabel: String = "Total",
) {
    val sum = totals.values.sum()
    val entries = totals.entries.sortedByDescending { it.value }
    val palette = CategoryColors

    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier.size(160.dp),
            contentAlignment = Alignment.Center,
        ) {
            Canvas(modifier = Modifier.size(160.dp)) {
                val stroke = 28f
                val padding = stroke / 2f
                val size = Size(this.size.width - stroke, this.size.height - stroke)
                val topLeft = Offset(padding, padding)
                if (sum <= 0.0) {
                    drawArc(
                        color = Color(0xFFE5E7EF),
                        startAngle = 0f,
                        sweepAngle = 360f,
                        useCenter = false,
                        topLeft = topLeft,
                        size = size,
                        style = Stroke(width = stroke),
                    )
                    return@Canvas
                }
                var startAngle = -90f
                entries.forEachIndexed { index, entry ->
                    val sweep = (entry.value / sum * 360.0).toFloat()
                    drawArc(
                        color = palette[index % palette.size],
                        startAngle = startAngle,
                        sweepAngle = sweep,
                        useCenter = false,
                        topLeft = topLeft,
                        size = size,
                        style = Stroke(width = stroke),
                    )
                    startAngle += sweep
                }
            }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    centerLabel,
                    style = MaterialTheme.typography.labelSmall,
                    color = TextSecondary,
                )
                Text(
                    formatAmount(sum),
                    style = MaterialTheme.typography.titleLarge,
                )
            }
        }

        Spacer(Modifier.width(16.dp))

        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            if (entries.isEmpty()) {
                Text(
                    "No spending recorded yet.",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextSecondary,
                )
            } else {
                entries.take(6).forEachIndexed { index, entry ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            Modifier
                                .size(10.dp)
                                .clip(CircleShape)
                                .background(palette[index % palette.size]),
                        )
                        Spacer(Modifier.width(8.dp))
                        Text(
                            entry.key,
                            style = MaterialTheme.typography.bodyMedium,
                            modifier = Modifier.weight(1f),
                        )
                        Text(
                            formatAmount(entry.value),
                            style = MaterialTheme.typography.bodyMedium,
                        )
                    }
                }
            }
        }
    }
}

internal fun formatAmount(value: Double): String =
    if (value >= 1000) "%,.0f".format(value) else "%,.2f".format(value)
