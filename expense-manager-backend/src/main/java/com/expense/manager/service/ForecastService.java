package com.expense.manager.service;

import com.expense.manager.dto.ForecastDto;
import com.expense.manager.entity.Transaction.TransactionType;
import com.expense.manager.repository.TransactionRepository;
import com.expense.manager.security.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ForecastService {

    private final TransactionRepository transactionRepository;
    private final CurrentUserProvider currentUserProvider;

    // Weights for the last N months — most recent month gets the highest weight.
    // [oldest → newest], must sum to 1.0
    private static final double[] WEIGHTS_3M = {0.20, 0.30, 0.50};
    private static final double[] WEIGHTS_6M = {0.05, 0.08, 0.12, 0.15, 0.25, 0.35};

    /**
     * Generates next-month spend forecasts per category using a weighted moving
     * average over the user's last 6 months of actual expenses.
     *
     * Weighted Moving Average vs simple average:
     *   Simple average treats last month and 6 months ago equally.
     *   WMA gives the most recent month 35% of the weight and the oldest only 5%.
     *   This reflects how personal spending actually behaves: recent patterns
     *   are more predictive of next month than older ones.
     */
    public ForecastDto getForecast() {
        Long userId = currentUserProvider.getCurrentUserId();
        LocalDate now = LocalDate.now();
        YearMonth currentMonth = YearMonth.from(now);

        // Fetch monthly category breakdown for the last 6 months
        LocalDate since = now.minusMonths(6).withDayOfMonth(1);
        List<Object[]> rawData = transactionRepository.getMonthlyCategoryBreakdown(
                userId, since, TransactionType.EXPENSE);

        // Organise raw DB results into: category → (yearMonth → amount)
        Map<String, Map<YearMonth, BigDecimal>> categoryMonthlySpend = new LinkedHashMap<>();
        for (Object[] row : rawData) {
            int year = (int) row[0];
            int month = (int) row[1];
            String category = row[2] != null ? (String) row[2] : "Uncategorized";
            BigDecimal amount = (BigDecimal) row[3];
            YearMonth ym = YearMonth.of(year, month);
            categoryMonthlySpend.computeIfAbsent(category, k -> new HashMap<>()).put(ym, amount);
        }

        // Build the forecast month label
        YearMonth nextMonth = currentMonth.plusMonths(1);
        String forecastMonthLabel = nextMonth.getMonth()
                .getDisplayName(TextStyle.FULL, Locale.ENGLISH) + " " + nextMonth.getYear();

        // Build the 6-month window we'll use (oldest to newest, excluding current)
        List<YearMonth> window = new ArrayList<>();
        for (int i = 5; i >= 1; i--) {
            window.add(currentMonth.minusMonths(i));
        }
        // Also include current month's partial data as the most recent signal
        window.add(currentMonth);

        List<ForecastDto.CategoryForecast> forecasts = new ArrayList<>();
        BigDecimal totalForecast = BigDecimal.ZERO;

        for (Map.Entry<String, Map<YearMonth, BigDecimal>> entry : categoryMonthlySpend.entrySet()) {
            String category = entry.getKey();
            Map<YearMonth, BigDecimal> monthly = entry.getValue();

            // Build value array for the WMA — use 0 for months with no spend
            double[] values = window.stream()
                    .mapToDouble(ym -> monthly.getOrDefault(ym, BigDecimal.ZERO).doubleValue())
                    .toArray();

            double forecasted = weightedMovingAverage(values, WEIGHTS_6M);
            BigDecimal forecastedAmount = BigDecimal.valueOf(forecasted)
                    .setScale(2, RoundingMode.HALF_UP);

            // Simple average for display
            double avg = Arrays.stream(values).average().orElse(0.0);
            BigDecimal avgMonthly = BigDecimal.valueOf(avg).setScale(2, RoundingMode.HALF_UP);

            // Last month's actual
            BigDecimal lastMonthActual = monthly.getOrDefault(
                    currentMonth.minusMonths(1), BigDecimal.ZERO);

            // Trend: compare last month vs 3-month average
            double recent3Avg = weightedMovingAverage(
                    Arrays.copyOfRange(values, values.length - 3, values.length),
                    WEIGHTS_3M);
            String trend = determineTrend(lastMonthActual.doubleValue(), recent3Avg);

            forecasts.add(ForecastDto.CategoryForecast.builder()
                    .category(category)
                    .forecastedAmount(forecastedAmount)
                    .lastMonthActual(lastMonthActual)
                    .avgMonthly(avgMonthly)
                    .trend(trend)
                    .build());

            totalForecast = totalForecast.add(forecastedAmount);
        }

        // Sort by forecasted amount descending so biggest spend categories appear first
        forecasts.sort((a, b) -> b.getForecastedAmount().compareTo(a.getForecastedAmount()));

        return ForecastDto.builder()
                .forecasts(forecasts)
                .totalForecastedExpense(totalForecast.setScale(2, RoundingMode.HALF_UP))
                .forecastMonth(forecastMonthLabel)
                .basis("Based on your last 6 months of spending (weighted — recent months count more)")
                .build();
    }

    /**
     * Weighted moving average.
     * If values has fewer entries than weights, uses the tail of the weights array.
     */
    private double weightedMovingAverage(double[] values, double[] weights) {
        if (values.length == 0) return 0.0;

        int n = Math.min(values.length, weights.length);
        double[] usedWeights = Arrays.copyOfRange(weights, weights.length - n, weights.length);

        // Re-normalise so weights always sum to 1.0 even if we sliced them
        double weightSum = Arrays.stream(usedWeights).sum();
        double result = 0.0;
        for (int i = 0; i < n; i++) {
            result += values[values.length - n + i] * (usedWeights[i] / weightSum);
        }
        return result;
    }

    private String determineTrend(double lastMonth, double recentAvg) {
        if (recentAvg == 0) return "STABLE";
        double changePct = (lastMonth - recentAvg) / recentAvg * 100;
        if (changePct > 10) return "UP";
        if (changePct < -10) return "DOWN";
        return "STABLE";
    }
}
