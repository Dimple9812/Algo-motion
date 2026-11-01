package dev.algomotion.ai.provider;

import com.fasterxml.jackson.databind.ObjectMapper;
import dev.algomotion.ai.AiProperties;
import dev.algomotion.shared.security.InternalAuthProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
class ProviderConfig {
    private static final Logger log = LoggerFactory.getLogger(ProviderConfig.class);

    @Bean
    LlmProvider llmProvider(AiProperties p, InternalAuthProperties internal, ObjectMapper mapper) {
        boolean keyed = p.apiKey() != null && !p.apiKey().isBlank() && p.model() != null && !p.model().isBlank();
        LlmProvider provider = switch (p.provider() == null ? "fallback" : p.provider()) {
            case "openai" -> keyed ? new HttpProviders.OpenAiCompatible(p, mapper) : null;
            case "anthropic" -> keyed ? new HttpProviders.Anthropic(p) : null;
            default -> null;
        };
        if (provider == null) {
            if (!"fallback".equals(p.provider())) log.warn("AI_PROVIDER={} but AI_MODEL/AI_API_KEY are missing — using the deterministic catalog fallback", p.provider());
            provider = new CatalogFallbackProvider(p, internal, mapper);
        }
        log.info("AI provider: {}", provider.name());
        return provider;
    }
}
