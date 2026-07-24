package com.expense.manager.controller;

import com.expense.manager.dto.ForecastDto;
import com.expense.manager.service.ForecastService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/forecast")
@RequiredArgsConstructor
public class ForecastController {

    private final ForecastService forecastService;

    /**
     * GET /api/forecast
     *
     * Returns next-month spend forecasts per category using weighted moving
     * average over the authenticated user's last 6 months of expenses.
     *
     * Response includes:
     *   - forecastMonth: "August 2026"
     *   - totalForecastedExpense: total across all categories
     *   - forecasts: per-category breakdown with trend direction
     *   - basis: human-readable explanation of the forecasting method
     */
    @GetMapping
    public ResponseEntity<ForecastDto> getForecast() {
        return ResponseEntity.ok(forecastService.getForecast());
    }
}
