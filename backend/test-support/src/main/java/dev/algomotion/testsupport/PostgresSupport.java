package dev.algomotion.testsupport;

import org.springframework.test.context.DynamicPropertyRegistry;
import org.testcontainers.containers.PostgreSQLContainer;

/**
 * Provides a PostgreSQL database for integration tests.
 * <ul>
 *   <li>Default: a Testcontainers {@code postgres:16-alpine} container shared by all tests in the JVM.</li>
 *   <li>If {@code TEST_DB_URL} is set (plus optional TEST_DB_USER / TEST_DB_PASSWORD), that database is used instead —
 *       useful where Docker images cannot be pulled.</li>
 * </ul>
 */
public final class PostgresSupport {
    private static PostgreSQLContainer<?> container;

    private PostgresSupport() {}

    public static synchronized void register(DynamicPropertyRegistry r) {
        String url = System.getenv("TEST_DB_URL");
        if (url != null && !url.isBlank()) {
            r.add("spring.datasource.url", () -> url);
            r.add("spring.datasource.username", () -> env("TEST_DB_USER", "algomotion"));
            r.add("spring.datasource.password", () -> env("TEST_DB_PASSWORD", "algomotion"));
            return;
        }
        if (container == null) {
            container = new PostgreSQLContainer<>("postgres:16-alpine");
            container.start();
        }
        r.add("spring.datasource.url", container::getJdbcUrl);
        r.add("spring.datasource.username", container::getUsername);
        r.add("spring.datasource.password", container::getPassword);
    }

    private static String env(String k, String d) {
        String v = System.getenv(k);
        return v == null || v.isBlank() ? d : v;
    }
}
