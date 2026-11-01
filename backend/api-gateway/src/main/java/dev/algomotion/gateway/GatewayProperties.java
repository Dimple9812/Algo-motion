package dev.algomotion.gateway;

import java.util.List;
import java.util.Map;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("gateway")
public record GatewayProperties(Map<String, String> services, List<String> corsOrigins, RateLimit rateLimit, String aiProvider, String executionSandbox) {
    public record RateLimit(boolean enabled) {}

    public String url(String service) {
        String u = services.get(service);
        if (u == null) throw new IllegalStateException("No URL configured for " + service);
        return u;
    }
}
