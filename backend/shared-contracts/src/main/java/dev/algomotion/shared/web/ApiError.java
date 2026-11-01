package dev.algomotion.shared.web;

import java.time.Instant;
import java.util.Map;

/** Consistent error envelope returned by every service. Never contains stack traces. */
public record ApiError(int status, String code, String message, Map<String, String> details, String correlationId, Instant timestamp) {
    public static ApiError of(int status, String code, String message, Map<String, String> details, String correlationId) {
        return new ApiError(status, code, message, details, correlationId, Instant.now());
    }
}
