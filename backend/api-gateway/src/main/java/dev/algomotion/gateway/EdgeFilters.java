package dev.algomotion.gateway;

import java.util.UUID;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsWebFilter;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Configuration
class EdgeFilters {
    private static final Logger log = LoggerFactory.getLogger(EdgeFilters.class);
    static final String CID = "X-Correlation-Id";
    private static final Pattern SAFE = Pattern.compile("[A-Za-z0-9-]{8,64}");

    /** Ensures every request carries a safe correlation id, forwards it downstream and echoes it to the client. Logs one line per request. */
    @Bean
    GlobalFilter correlationAndAccessLog() {
        return new OrderedFilter((exchange, chain) -> {
            String incoming = exchange.getRequest().getHeaders().getFirst(CID);
            String id = incoming != null && SAFE.matcher(incoming).matches() ? incoming : UUID.randomUUID().toString();
            ServerWebExchange ex = exchange.mutate().request(r -> r.headers(h -> {
                h.set(CID, id);
                h.remove("X-Internal-Token"); // clients can never forge service-to-service credentials
            })).build();
            ex.getResponse().getHeaders().set(CID, id);
            HttpHeaders sec = ex.getResponse().getHeaders();
            sec.set("X-Content-Type-Options", "nosniff");
            sec.set("X-Frame-Options", "DENY");
            sec.set("Referrer-Policy", "no-referrer");
            long start = System.nanoTime();
            return chain.filter(ex).doFinally(s -> log.info("{} {} -> {} in {} ms correlationId={}", ex.getRequest().getMethod(), ex.getRequest().getPath(),
                ex.getResponse().getStatusCode(), (System.nanoTime() - start) / 1_000_000, id));
        });
    }

    @Bean
    CorsWebFilter cors(GatewayProperties p) {
        CorsConfiguration c = new CorsConfiguration();
        c.setAllowedOrigins(p.corsOrigins());
        c.addAllowedMethod("*");
        c.addAllowedHeader("*");
        c.setAllowCredentials(true);
        c.addExposedHeader(CID);
        UrlBasedCorsConfigurationSource src = new UrlBasedCorsConfigurationSource();
        src.registerCorsConfiguration("/api/**", c);
        return new CorsWebFilter(src);
    }

    record OrderedFilter(GlobalFilter delegate) implements GlobalFilter, Ordered {
        @Override
        public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) { return delegate.filter(exchange, chain); }

        @Override
        public int getOrder() { return Ordered.HIGHEST_PRECEDENCE; }
    }
}
