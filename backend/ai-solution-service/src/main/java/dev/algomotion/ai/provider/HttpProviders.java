package dev.algomotion.ai.provider;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.algomotion.ai.AiProperties;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

/** HTTP-backed providers. Keys are sent only in request headers and never logged. */
public final class HttpProviders {
    private HttpProviders() {}

    static RestClient client(AiProperties p, String defaultBase) {
        SimpleClientHttpRequestFactory f = new SimpleClientHttpRequestFactory();
        f.setConnectTimeout(Duration.ofSeconds(10));
        f.setReadTimeout(Duration.ofSeconds(Math.max(10, p.timeoutSeconds())));
        return RestClient.builder().baseUrl(p.baseUrl() == null || p.baseUrl().isBlank() ? defaultBase : p.baseUrl()).requestFactory(f).build();
    }

    static LlmProvider.ProviderException translate(RestClientException e) {
        if (e instanceof RestClientResponseException r) {
            HttpStatusCode s = r.getStatusCode();
            return new LlmProvider.ProviderException("Provider returned HTTP " + s.value(), s.value() == 429);
        }
        return new LlmProvider.ProviderException("Provider request failed or timed out", false);
    }

    /** Any OpenAI-compatible chat-completions endpoint (OpenAI, Azure-compatible gateways, local servers). */
    public static class OpenAiCompatible implements LlmProvider {
        private final RestClient http;
        private final AiProperties p;
        private final ObjectMapper mapper;

        public OpenAiCompatible(AiProperties p, ObjectMapper mapper) {
            this.p = p;
            this.mapper = mapper;
            this.http = client(p, "https://api.openai.com/v1");
        }

        @Override
        public String name() { return "openai-compatible:" + p.model(); }

        @Override
        public String generate(String problemText) throws ProviderException {
            Map<String, Object> body = Map.of("model", p.model(), "temperature", 0.2, "response_format", Map.of("type", "json_object"),
                "messages", List.of(Map.of("role", "system", "content", Prompts.SYSTEM), Map.of("role", "user", "content", Prompts.user(problemText))));
            try {
                JsonNode r = http.post().uri("/chat/completions").header("Authorization", "Bearer " + p.apiKey()).body(body).retrieve().body(JsonNode.class);
                return r.path("choices").path(0).path("message").path("content").asText("");
            } catch (RestClientException e) {
                throw translate(e);
            }
        }
    }

    /** Anthropic Messages API. */
    public static class Anthropic implements LlmProvider {
        private final RestClient http;
        private final AiProperties p;

        public Anthropic(AiProperties p) {
            this.p = p;
            this.http = client(p, "https://api.anthropic.com");
        }

        @Override
        public String name() { return "anthropic:" + p.model(); }

        @Override
        public String generate(String problemText) throws ProviderException {
            Map<String, Object> body = Map.of("model", p.model(), "max_tokens", 8000, "system", Prompts.SYSTEM,
                "messages", List.of(Map.of("role", "user", "content", Prompts.user(problemText))));
            try {
                JsonNode r = http.post().uri("/v1/messages").header("x-api-key", p.apiKey()).header("anthropic-version", "2023-06-01")
                    .body(body).retrieve().body(JsonNode.class);
                StringBuilder sb = new StringBuilder();
                r.path("content").forEach(c -> { if ("text".equals(c.path("type").asText())) sb.append(c.path("text").asText()); });
                return sb.toString();
            } catch (RestClientException e) {
                throw translate(e);
            }
        }
    }
}
