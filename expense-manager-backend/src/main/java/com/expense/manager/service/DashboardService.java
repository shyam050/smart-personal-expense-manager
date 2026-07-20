package com.expense.manager.service;

import com.expense.manager.dto.DashboardDto;
import com.expense.manager.entity.Transaction.TransactionType;
import com.expense.manager.repository.TransactionRepository;
import com.expense.manager.security.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.TextStyle;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final TransactionRepository transactionRepository;
    private final CurrentUserProvider currentUserProvider;

    public DashboardDto getDashboard(int monthsBack) {
        Long userId = currentUserProvider.getCurrentUserId();
        LocalDate since = LocalDate.now().minusMonths(monthsBack).withDayOfMonth(1);
        LocalDate now = LocalDate.now();

        // Monthly trend (income vs expense per month) - aggregated in DB
        List<Object[]> monthlyRaw = transactionRepository.getMonthlySummary(userId, since);
        Map<String, DashboardDto.MonthlyData> monthlyMap = new LinkedHashMap<>();

        for (Object[] row : monthlyRaw) {
            int year = (int) row[0];
            int month = (int) row[1];
            TransactionType type = (TransactionType) row[2];
            BigDecimal total = (BigDecimal) row[3];

            String key = year + "-" + month;
            String monthLabel = LocalDate.of(year, month, 1)
                    .getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH) + " " + year;

            DashboardDto.MonthlyData data = monthlyMap.computeIfAbsent(key, k ->
                    DashboardDto.MonthlyData.builder()
                            .year(year).month(month).monthLabel(monthLabel)
                            .income(BigDecimal.ZERO).expense(BigDecimal.ZERO)
                            .build());

            if (type == TransactionType.INCOME) {
                data.setIncome(total);
            } else {
                data.setExpense(total);
            }
        }

        // Category breakdown for pie chart - aggregated in DB
        List<Object[]> categoryRaw = transactionRepository.getCategoryBreakdown(userId, since, now);
        BigDecimal totalExpenseForBreakdown = categoryRaw.stream()
                .map(r -> (BigDecimal) r[1])
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<DashboardDto.CategoryData> categoryBreakdown = categoryRaw.stream()
                .map(row -> {
                    String name = row[0] != null ? (String) row[0] : "Uncategorized";
                    BigDecimal total = (BigDecimal) row[1];
                    long count = (Long) row[2];
                    double percentage = totalExpenseForBreakdown.compareTo(BigDecimal.ZERO) > 0
                            ? total.divide(totalExpenseForBreakdown, 4, java.math.RoundingMode.HALF_UP)
                                    .multiply(BigDecimal.valueOf(100)).doubleValue()
                            : 0.0;
                    return DashboardDto.CategoryData.builder()
                            .category(name).total(total).count(count).percentage(percentage)
                            .build();
                })
                .collect(Collectors.toList());

        // Totals for the period
        List<Object[]> totals = transactionRepository.getTotalsByType(userId, since, now);
        BigDecimal totalIncome = BigDecimal.ZERO;
        BigDecimal totalExpense = BigDecimal.ZERO;
        for (Object[] row : totals) {
            TransactionType type = (TransactionType) row[0];
            BigDecimal amount = (BigDecimal) row[1];
            if (type == TransactionType.INCOME) totalIncome = amount;
            else totalExpense = amount;
        }

        return DashboardDto.builder()
                .totalIncome(totalIncome)
                .totalExpense(totalExpense)
                .netBalance(totalIncome.subtract(totalExpense))
                .monthlyTrend(List.copyOf(monthlyMap.values()))
                .categoryBreakdown(categoryBreakdown)
                .build();
    }
}
