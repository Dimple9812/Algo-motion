package dev.algomotion.gateway;

import static org.assertj.core.api.Assertions.assertThat;

import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.reactive.AutoConfigureWebTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.reactive.server.WebTestClient;

/** Routes requests to a stub backend (JDK HttpServer) and checks edge behaviour. Uses the local Redis for rate limiting. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = "logging.level.org.springframework.cloud.gateway.filter.ratelimit=DEBUG")
@AutoConfigureWebTestClient
class GatewayRoutingTest {
    static final List<String> seen = new CopyOnWriteArrayList<>();
    static final HttpServer stub = start();

    static HttpServer start() {
        try {
            HttpServer s = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            s.createContext("/", ex -> {
                String cid = ex.getRequestHeaders().getFirst("X-Correlation-Id");
                String internal = ex.getRequestHeaders().getFirst("X-Internal-Token");
                seen.add(ex.getRequestURI().getPath() + " cid=" + cid + " internal=" + internal);
                byte[] body = (ex.getRequestURI().getPath().endsWith("/actuator/health") ? "{\"status\":\"UP\"}" : "{\"ok\":true}").getBytes(StandardCharsets.UTF_8);
                ex.getResponseHeaders().add("Content-Type", "application/json");
                ex.sendResponseHeaders(200, body.length);
                ex.getResponseBody().write(body);
                ex.close();
            });
            s.start();
            return s;
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }

    @AfterAll
    static void stop() { stub.stop(0); }

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry r) {
        String url = "http://127.0.0.1:" + stub.getAddress().getPort();
        for (String s : List.of("user-progress-service", "algorithm-visualization-service", "problem-catalog-service", "ai-solution-service", "code-execution-service"))
            r.add("gateway.services." + s, () -> url);
        r.add("gateway.rate-limit.enabled", () -> "true");
    }

    @Autowired WebTestClient web;

    @Test
    void routesAddsCorrelationIdAndStripsInternalToken() {
        web.get().uri("/api/v1/problems?page=0").header("X-Internal-Token", "forged").header("X-Forwarded-For", "10.9.9.1").exchange()
            .expectStatus().isOk().expectHeader().exists("X-Correlation-Id").expectHeader().valueEquals("X-Content-Type-Options", "nosniff");
        assertThat(seen).anyMatch(s -> s.startsWith("/api/v1/problems cid=") && s.endsWith("internal=null") && !s.contains("cid=null"));
    }

    @Test
    void keepsSafeIncomingCorrelationIdAndReplacesUnsafeOnes() {
        web.get().uri("/api/v1/algorithms").header("X-Correlation-Id", "abc-12345678").header("X-Forwarded-For", "10.9.9.2").exchange()
            .expectHeader().valueEquals("X-Correlation-Id", "abc-12345678");
        web.get().uri("/api/v1/algorithms").header("X-Correlation-Id", "bad id;drop").header("X-Forwarded-For", "10.9.9.2").exchange()
            .expectHeader().value("X-Correlation-Id", v -> assertThat(v).hasSize(36));
    }

    @Test
    void doesNotRouteInternalEndpoints() {
        web.get().uri("/internal/problems/two-sum/tests").exchange().expectStatus().isNotFound();
    }

    @Test
    void rateLimitsExpensiveEndpointsPerClient() {
        String ip = "10.1." + (System.nanoTime() % 200) + ".7";
        int limited = 0;
        for (int i = 0; i < 15; i++) {
            int code = web.post().uri("/api/v1/executions").header("X-Forwarded-For", ip).bodyValue("{}").exchange().returnResult(String.class).getStatus().value();
            if (code == 429) limited++;
        }
        assertThat(limited).isGreaterThan(0);
    }

    @Test
    void aggregatesStatus() {
        web.get().uri("/api/v1/status").exchange().expectStatus().isOk().expectBody()
            .jsonPath("$.status").isEqualTo("UP").jsonPath("$.services.problem-catalog-service").isEqualTo("UP");
    }
}
