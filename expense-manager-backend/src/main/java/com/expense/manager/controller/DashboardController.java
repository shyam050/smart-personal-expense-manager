package com.expense.manager.controller;

import com.expense.manager.dto.DashboardDto;
import com.expense.manager.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping
    public ResponseEntity<DashboardDto> getDashboard(@RequestParam(defaultValue = "6") int monthsBack) {
        return ResponseEntity.ok(dashboardService.getDashboard(monthsBack));
    }
}
