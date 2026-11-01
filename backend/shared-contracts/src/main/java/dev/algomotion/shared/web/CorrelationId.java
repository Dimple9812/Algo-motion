package dev.algomotion.shared.web;

import java.util.UUID;
import java.util.regex.Pattern;

public final class CorrelationId {
    public static final String HEADER = "X-Correlation-Id";
    public static final String MDC_KEY = "correlationId";
    private static final Pattern SAFE = Pattern.compile("[A-Za-z0-9-]{8,64}");

    private CorrelationId() {}

    /** Accept an incoming id only if it is safe to log; otherwise mint a new one. */
    public static String sanitize(String incoming) {
        return incoming != null && SAFE.matcher(incoming).matches() ? incoming : UUID.randomUUID().toString();
    }
}
