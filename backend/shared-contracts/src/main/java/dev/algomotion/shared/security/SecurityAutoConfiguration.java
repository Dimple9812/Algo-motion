package dev.algomotion.shared.security;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import dev.algomotion.shared.web.CorrelationIdFilter;
import dev.algomotion.shared.web.GlobalExceptionHandler;
import java.nio.charset.StandardCharsets;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.core.Ordered;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

@AutoConfiguration
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@EnableConfigurationProperties({JwtProperties.class, InternalAuthProperties.class})
@Import(GlobalExceptionHandler.class)
public class SecurityAutoConfiguration {

    static SecretKey key(JwtProperties p) {
        if (p.secret() == null || p.secret().getBytes(StandardCharsets.UTF_8).length < 32)
            throw new IllegalStateException("algomotion.jwt.secret (JWT_SECRET) must be set and at least 32 bytes long");
        return new SecretKeySpec(p.secret().getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    }

    @Bean
    @ConditionalOnClass(NimbusJwtDecoder.class)
    @ConditionalOnMissingBean
    JwtDecoder jwtDecoder(JwtProperties p) {
        NimbusJwtDecoder d = NimbusJwtDecoder.withSecretKey(key(p)).macAlgorithm(MacAlgorithm.HS256).build();
        d.setJwtValidator(JwtValidators.createDefaultWithIssuer(p.issuer()));
        return d;
    }

    @Bean
    @ConditionalOnClass(NimbusJwtEncoder.class)
    @ConditionalOnMissingBean
    JwtEncoder jwtEncoder(JwtProperties p) {
        return new NimbusJwtEncoder(new ImmutableSecret<>(key(p)));
    }

    @Bean
    FilterRegistrationBean<CorrelationIdFilter> correlationIdFilter() {
        FilterRegistrationBean<CorrelationIdFilter> r = new FilterRegistrationBean<>(new CorrelationIdFilter());
        r.setOrder(Ordered.HIGHEST_PRECEDENCE);
        return r;
    }
}
