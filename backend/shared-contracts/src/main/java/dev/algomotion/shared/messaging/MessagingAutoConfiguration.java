package dev.algomotion.shared.messaging;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.jdbc.JdbcTemplateAutoConfiguration;
import org.springframework.boot.autoconfigure.kafka.KafkaAutoConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.kafka.core.KafkaOperations;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.listener.DeadLetterPublishingRecoverer;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.util.backoff.ExponentialBackOff;

@AutoConfiguration(after = {JdbcTemplateAutoConfiguration.class, KafkaAutoConfiguration.class})
@ConditionalOnClass({KafkaTemplate.class, JdbcTemplate.class})
@ConditionalOnProperty(name = "algomotion.messaging.enabled", havingValue = "true", matchIfMissing = true)
@EnableScheduling
public class MessagingAutoConfiguration {

    @Bean
    @ConditionalOnBean(JdbcTemplate.class)
    Outbox outbox(JdbcTemplate jdbc, ObjectMapper mapper) { return new Outbox(jdbc, mapper); }

    @Bean
    @ConditionalOnBean(JdbcTemplate.class)
    Idempotency idempotency(JdbcTemplate jdbc) { return new Idempotency(jdbc); }

    @Bean
    @ConditionalOnBean({JdbcTemplate.class, KafkaTemplate.class})
    @SuppressWarnings("unchecked")
    OutboxRelay outboxRelay(JdbcTemplate jdbc, KafkaTemplate<?, ?> kafka) { return new OutboxRelay(jdbc, (KafkaTemplate<String, String>) kafka); }

    /** Retry 3 times with backoff, then route the record to "<topic>.DLT". */
    @Bean
    @ConditionalOnBean(KafkaTemplate.class)
    DefaultErrorHandler kafkaErrorHandler(KafkaTemplate<?, ?> template) {
        ExponentialBackOff backOff = new ExponentialBackOff(500, 2.0);
        backOff.setMaxAttempts(3);
        return new DefaultErrorHandler(new DeadLetterPublishingRecoverer((KafkaOperations<?, ?>) template), backOff);
    }
}
