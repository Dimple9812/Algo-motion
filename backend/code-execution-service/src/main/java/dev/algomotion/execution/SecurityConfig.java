package dev.algomotion.execution;

import dev.algomotion.shared.security.InternalAuthProperties;
import dev.algomotion.shared.security.InternalTokenFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
class SecurityConfig {
    /** Anonymous runs are allowed (rate-limited at the gateway); signed-in runs are owner-scoped. */
    @Bean
    SecurityFilterChain filterChain(HttpSecurity http, InternalAuthProperties internal) throws Exception {
        return http.csrf(c -> c.disable())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .addFilterBefore(new InternalTokenFilter(internal), UsernamePasswordAuthenticationFilter.class)
            .authorizeHttpRequests(a -> a
                .requestMatchers("/api/v1/executions/**", "/internal/**", "/actuator/health/**", "/actuator/info", "/actuator/prometheus", "/v3/api-docs/**", "/swagger-ui/**").permitAll()
                .anyRequest().denyAll())
            .oauth2ResourceServer(o -> o.jwt(j -> {}))
            .build();
    }
}
