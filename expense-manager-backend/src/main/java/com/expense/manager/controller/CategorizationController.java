package com.expense.manager.controller;

import com.expense.manager.dto.CategorizationDto;
import com.expense.manager.service.CategorizationService;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/categorize")
@RequiredArgsConstructor
public class CategorizationController {

    private final CategorizationService categorizationService;

    /**
     * POST /api/categorize
     * Body: { "merchant": "Zomato" }
     *
     * Proxies to the Python categorization microservice and returns the
     * predicted category with confidence score. Returns 200 with a null
     * category if the microservice is unavailable — this is intentional,
     * allowing the Angular form to silently fall back to manual selection.
     */
    @PostMapping
    public ResponseEntity<?> categorize(@RequestBody Map<String, String> body) {
        String merchant = body.get("merchant");
        if (merchant == null || merchant.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "merchant is required"));
        }

        CategorizationDto.Response result = categorizationService.predictCategory(merchant.trim());
        if (result == null) {
            // Microservice unavailable — return graceful empty response
            return ResponseEntity.ok(Map.of(
                "merchant", merchant,
                "category", "",
                "confidence", 0.0,
                "available", false
            ));
        }

        return ResponseEntity.ok(result);
    }
}
