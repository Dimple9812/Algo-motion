package dev.algomotion.gateway;

import java.util.Objects;
import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.cloud.gateway.filter.ratelimit.RedisRateLimiter;
import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.GatewayFilterSpec;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.cloud.gateway.route.builder.UriSpec;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import reactor.core.publisher.Mono;

/**
 * Route table. Only /api/v1/** is exposed; /internal/** endpoints of the services are never routed.
 * Expensive endpoints (code execution, AI generation, authentication) get tighter Redis token buckets.
 */
@Configuration
class Routes {
    /** Rate-limit key: first X-Forwarded-For hop from a trusted proxy, else the socket address. */
    @Bean
    @Primary
    KeyResolver clientIpKeyResolver() {
        return exchange -> {
            String fwd = exchange.getRequest().getHeaders().getFirst("X-Forwarded-For");
            if (fwd != null && !fwd.isBlank()) return Mono.just(fwd.split(",")[0].trim());
            var addr = exchange.getRequest().getRemoteAddress();
            return Mono.just(addr == null ? "unknown" : Objects.toString(addr.getAddress().getHostAddress(), "unknown"));
        };
    }

    /** One limiter; token buckets are configured per route id (default: 20 req/s, burst 60). */
    @Bean
    RedisRateLimiter rateLimiter() {
        RedisRateLimiter l = new RedisRateLimiter(20, 60, 1);
        for (String expensive : java.util.List.of("auth", "executions-write", "solutions-write"))
            l.getConfig().put(expensive, new RedisRateLimiter.Config().setReplenishRate(1).setBurstCapacity(10).setRequestedTokens(1));
        return l;
    }

    @Bean
    RouteLocator algomotionRoutes(RouteLocatorBuilder b, GatewayProperties p, KeyResolver keys, RedisRateLimiter limiter) {
        RedisRateLimiter defaultLimiter = limiter, expensiveLimiter = limiter, authLimiter = limiter;
        java.util.function.BiFunction<GatewayFilterSpec, RedisRateLimiter, UriSpec> limit = (f, l) ->
            p.rateLimit().enabled() ? f.requestRateLimiter(c -> c.setRateLimiter(l).setKeyResolver(keys)) : f;
        return b.routes()
            .route("auth", r -> r.path("/api/v1/auth/**").filters(f -> limit.apply(f, authLimiter)).uri(p.url("user-progress-service")))
            .route("users", r -> r.path("/api/v1/users/**").filters(f -> limit.apply(f, defaultLimiter)).uri(p.url("user-progress-service")))
            .route("algorithms", r -> r.path("/api/v1/algorithms/**", "/api/v1/visualizations/**").filters(f -> limit.apply(f, defaultLimiter)).uri(p.url("algorithm-visualization-service")))
            .route("problems", r -> r.path("/api/v1/problems/**").filters(f -> limit.apply(f, defaultLimiter)).uri(p.url("problem-catalog-service")))
            .route("solutions-write", r -> r.path("/api/v1/solutions", "/api/v1/solutions/extract").and().method("POST")
                .filters(f -> limit.apply(f, expensiveLimiter)).uri(p.url("ai-solution-service")))
            .route("solutions", r -> r.path("/api/v1/solutions/**").filters(f -> limit.apply(f, defaultLimiter)).uri(p.url("ai-solution-service")))
            .route("executions-write", r -> r.path("/api/v1/executions").and().method("POST").filters(f -> limit.apply(f, expensiveLimiter)).uri(p.url("code-execution-service")))
            .route("executions", r -> r.path("/api/v1/executions/**").filters(f -> limit.apply(f, defaultLimiter)).uri(p.url("code-execution-service")))
            .build();
    }
}
