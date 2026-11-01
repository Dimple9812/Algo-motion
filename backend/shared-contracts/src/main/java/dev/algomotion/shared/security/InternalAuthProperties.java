package dev.algomotion.shared.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Shared secret for service-to-service calls on /internal/** endpoints (never routed by the gateway). */
@ConfigurationProperties("algomotion.internal")
public record InternalAuthProperties(String token) {
    public static final String HEADER = "X-Internal-Token";

    public boolean matches(String candidate) {
        return token != null && !token.isBlank() && candidate != null
            && java.security.MessageDigest.isEqual(token.getBytes(), candidate.getBytes());
    }
}
