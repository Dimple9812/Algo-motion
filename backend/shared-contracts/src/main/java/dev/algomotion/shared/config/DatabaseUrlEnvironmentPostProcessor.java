package dev.algomotion.shared.config;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

/**
 * Accepts a platform-style {@code DATABASE_URL} (postgres://user:password@host[:port]/db, as Render, Heroku and others
 * supply it) and maps it onto the JDBC datasource settings. Explicit {@code DB_URL} always wins.
 */
public class DatabaseUrlEnvironmentPostProcessor implements EnvironmentPostProcessor {
    @Override
    public void postProcessEnvironment(ConfigurableEnvironment env, SpringApplication app) {
        String raw = env.getProperty("DATABASE_URL");
        if (raw == null || raw.isBlank() || env.containsProperty("DB_URL")) return;
        Map<String, Object> props = parse(raw.strip());
        if (!props.isEmpty()) env.getPropertySources().addFirst(new MapPropertySource("databaseUrl", props));
    }

    static Map<String, Object> parse(String raw) {
        URI u = URI.create(raw);
        if (u.getScheme() == null || !u.getScheme().startsWith("postgres")) return Map.of();
        Map<String, Object> p = new HashMap<>();
        int port = u.getPort() == -1 ? 5432 : u.getPort();
        String query = u.getRawQuery() == null ? "" : "?" + u.getRawQuery();
        p.put("spring.datasource.url", "jdbc:postgresql://" + u.getHost() + ":" + port + u.getRawPath() + query);
        String info = u.getRawUserInfo();
        if (info != null) {
            int i = info.indexOf(':');
            p.put("spring.datasource.username", decode(i < 0 ? info : info.substring(0, i)));
            if (i >= 0) p.put("spring.datasource.password", decode(info.substring(i + 1)));
        }
        return p;
    }

    private static String decode(String s) { return URLDecoder.decode(s, StandardCharsets.UTF_8); }
}
