package dev.algomotion.viz;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
class SecurityConfig {
    @Bean
    SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http.csrf(c -> c.disable())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a -> a.requestMatchers("/api/v1/algorithms/**", "/api/v1/visualizations/**", "/actuator/health/**", "/actuator/info",
                "/v3/api-docs/**", "/swagger-ui/**").permitAll().anyRequest().denyAll())
            .oauth2ResourceServer(o -> o.jwt(j -> {}))
            .build();
    }
}
