package dev.algomotion.ai;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Provider configuration comes only from the environment; API keys are never logged or returned. */
@ConfigurationProperties("ai")
public record AiProperties(String provider, String model, String apiKey, String baseUrl, int timeoutSeconds, String catalogUrl, String executionUrl, int maxPdfPages) {
    @Override
    public String toString() {
        return "AiProperties[provider=" + provider + ", model=" + model + ", apiKey=" + (apiKey == null || apiKey.isBlank() ? "<unset>" : "<redacted>") + "]";
    }
}
