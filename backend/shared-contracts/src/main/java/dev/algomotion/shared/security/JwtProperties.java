package dev.algomotion.shared.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** HMAC secret shared by the issuer (user service) and all verifying services. Supplied via environment. */
@ConfigurationProperties("algomotion.jwt")
public record JwtProperties(String secret, String issuer, long accessTtlSeconds, long refreshTtlSeconds) {
    public JwtProperties {
        if (issuer == null) issuer = "algomotion";
        if (accessTtlSeconds <= 0) accessTtlSeconds = 900;
        if (refreshTtlSeconds <= 0) refreshTtlSeconds = 1_209_600;
    }
}
