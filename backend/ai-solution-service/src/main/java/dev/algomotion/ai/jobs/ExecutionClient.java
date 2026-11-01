package dev.algomotion.ai.jobs;

import com.fasterxml.jackson.databind.JsonNode;
import dev.algomotion.ai.AiProperties;
import dev.algomotion.shared.security.InternalAuthProperties;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/** Submits generated code to the isolated code-execution service (never executed here). */
@Component
public class ExecutionClient {
    private final RestClient http;

    public ExecutionClient(AiProperties p, InternalAuthProperties internal) {
        SimpleClientHttpRequestFactory f = new SimpleClientHttpRequestFactory();
        f.setConnectTimeout(2000);
        f.setReadTimeout(5000);
        this.http = RestClient.builder().baseUrl(p.executionUrl()).requestFactory(f)
            .defaultHeader(InternalAuthProperties.HEADER, internal.token() == null ? "" : internal.token()).build();
    }

    public UUID submit(String code, List<Map<String, String>> tests, UUID approachId) {
        JsonNode r = http.post().uri("/internal/executions")
            .body(Map.of("sourceCode", code, "tests", tests, "origin", "AI_SOLUTION", "originRef", approachId.toString()))
            .retrieve().body(JsonNode.class);
        return UUID.fromString(r.get("id").asText());
    }

    public JsonNode get(UUID executionId) {
        return http.get().uri("/internal/executions/{id}", executionId).retrieve().body(JsonNode.class);
    }
}
