package com.expense.manager.service;

import com.expense.manager.dto.CategorizationDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientRequestException;
import reactor.core.publisher.Mono;

import java.time.Duration;

/**
 * Proxy service that calls the Python categorization microservice.
 *
 * Uses WebClient (non-blocking) with a short timeout so that if the
 * Python service is down, the Spring Boot API still responds quickly
 * with a null category rather than hanging.
 *
 * The Python service URL is configurable via the CATEGORIZATION_SERVICE_URL
 * environment variable, defaulting to localhost:5000 for local development.
 */
@Slf4j
@Service
public class CategorizationService {

    private final WebClient webClient;

    public CategorizationService(
            @Value("${categorization.service.url:http://localhost:5000}") String serviceUrl) {
        this.webClient = WebClient.builder()
                .baseUrl(serviceUrl)
                .build();
    }

    /**
     * Calls the Python microservice to predict a category for a merchant name.
     * Returns null gracefully if the microservice is unavailable — this is
     * a best-effort feature, not a hard dependency. The user can always
     * select a category manually if prediction fails.
     */
    public CategorizationDto.Response predictCategory(String merchantName) {
        try {
            return webClient.post()
                    .uri("/predict")
                    .bodyValue(new CategorizationDto.Request(merchantName))
                    .retrieve()
                    .bodyToMono(CategorizationDto.Response.class)
                    .timeout(Duration.ofSeconds(3))
                    .onErrorResume(ex -> {
                        log.warn("Categorization service unavailable for merchant '{}': {}",
                                merchantName, ex.getMessage());
                        return Mono.empty();
                    })
                    .block();
        } catch (Exception e) {
            log.warn("Categorization service call failed for '{}': {}", merchantName, e.getMessage());
            return null;
        }
    }
}
