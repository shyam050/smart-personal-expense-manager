package com.expense.manager.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ForecastDto {

    private List<CategoryForecast> forecasts;
    private BigDecimal totalForecastedExpense;
    private String forecastMonth;
    private String basis; // e.g. "Based on last 6 months of spending"

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategoryForecast {
        private String category;
        private BigDecimal forecastedAmount;
        private BigDecimal lastMonthActual;
        private BigDecimal avgMonthly;
        private String trend; // "UP", "DOWN", "STABLE"
    }
}
