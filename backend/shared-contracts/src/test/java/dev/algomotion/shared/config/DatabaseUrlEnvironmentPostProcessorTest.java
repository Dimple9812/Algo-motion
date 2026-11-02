package dev.algomotion.shared.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

class DatabaseUrlEnvironmentPostProcessorTest {
    @Test
    void mapsRenderStyleUrlToJdbcSettings() {
        Map<String, Object> p = DatabaseUrlEnvironmentPostProcessor.parse("postgresql://ticketing:p%40ss:w0rd@dpg-abc-a/ticketing_2r3l");
        assertThat(p).containsEntry("spring.datasource.url", "jdbc:postgresql://dpg-abc-a:5432/ticketing_2r3l")
            .containsEntry("spring.datasource.username", "ticketing").containsEntry("spring.datasource.password", "p@ss:w0rd");
        assertThat(DatabaseUrlEnvironmentPostProcessor.parse("postgres://u:p@h.example.com:6543/db?sslmode=require"))
            .containsEntry("spring.datasource.url", "jdbc:postgresql://h.example.com:6543/db?sslmode=require");
        assertThat(DatabaseUrlEnvironmentPostProcessor.parse("mysql://u:p@h/db")).isEmpty();
    }

    @Test
    void explicitDbUrlWins() {
        MockEnvironment env = new MockEnvironment().withProperty("DATABASE_URL", "postgres://u:p@h/db").withProperty("DB_URL", "jdbc:postgresql://x/y");
        new DatabaseUrlEnvironmentPostProcessor().postProcessEnvironment(env, null);
        assertThat(env.getPropertySources().contains("databaseUrl")).isFalse();
        MockEnvironment env2 = new MockEnvironment().withProperty("DATABASE_URL", "postgres://u:p@h/db");
        new DatabaseUrlEnvironmentPostProcessor().postProcessEnvironment(env2, null);
        assertThat(env2.getProperty("spring.datasource.url")).isEqualTo("jdbc:postgresql://h:5432/db");
    }
}
