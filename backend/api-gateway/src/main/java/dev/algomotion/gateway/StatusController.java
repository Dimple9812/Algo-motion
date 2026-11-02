package dev.algomotion.gateway;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

/** Aggregated health for the About page and operators. Exposes only UP/DOWN, never internal details. */
@RestController
class StatusController {
    private final GatewayProperties props;
    private final WebClient http;

    StatusController(GatewayProperties props, WebClient.Builder builder) {
        this.props = props;
        this.http = builder.build();
    }

    @GetMapping("/api/v1/status")
    Mono<Map<String, Object>> status() {
        return Flux.fromIterable(props.services().entrySet())
            .flatMap(e -> http.get().uri(e.getValue() + "/actuator/health").retrieve().bodyToMono(Map.class)
                .map(m -> Map.entry(e.getKey(), String.valueOf(m.get("status"))))
                .timeout(props.statusTimeout() == null ? Duration.ofSeconds(2) : props.statusTimeout())
                .onErrorReturn(Map.entry(e.getKey(), "DOWN")))
            .collectMap(Map.Entry::getKey, Map.Entry::getValue)
            .map(services -> {
                Map<String, Object> out = new LinkedHashMap<>();
                out.put("status", services.values().stream().allMatch("UP"::equals) ? "UP" : "DEGRADED");
                out.put("services", new java.util.TreeMap<>(services));
                out.put("aiProvider", props.aiProvider());
                out.put("executionSandbox", props.executionSandbox());
                return out;
            });
    }
}
