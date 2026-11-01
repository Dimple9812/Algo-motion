package dev.algomotion.shared;

import static org.assertj.core.api.Assertions.assertThat;

import dev.algomotion.shared.security.InternalAuthProperties;
import dev.algomotion.shared.web.CorrelationId;
import org.junit.jupiter.api.Test;

class CorrelationIdTest {
    @Test
    void keepsSafeIds() {
        assertThat(CorrelationId.sanitize("abc-12345678")).isEqualTo("abc-12345678");
    }

    @Test
    void replacesUnsafeIds() {
        assertThat(CorrelationId.sanitize("evil\nlog-injection")).doesNotContain("\n").hasSize(36);
        assertThat(CorrelationId.sanitize(null)).hasSize(36);
    }

    @Test
    void internalTokenComparison() {
        var p = new InternalAuthProperties("s3cret-token");
        assertThat(p.matches("s3cret-token")).isTrue();
        assertThat(p.matches("wrong")).isFalse();
        assertThat(p.matches(null)).isFalse();
        assertThat(new InternalAuthProperties("").matches("")).isFalse();
    }
}
