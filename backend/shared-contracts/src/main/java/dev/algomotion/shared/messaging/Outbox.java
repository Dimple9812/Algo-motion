package dev.algomotion.shared.messaging;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Transactional outbox writer. Call inside the same transaction as the business change;
 * {@link OutboxRelay} publishes pending rows to Kafka afterwards. Requires an outbox_events table
 * (id uuid, topic, message_key, payload text, created_at, published_at) in the service schema.
 */
public class Outbox {
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    public Outbox(JdbcTemplate jdbc, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.mapper = mapper;
    }

    public void enqueue(String topic, String key, Object event) {
        try {
            jdbc.update("insert into outbox_events (id, topic, message_key, payload, created_at) values (?, ?, ?, ?, now())",
                UUID.randomUUID(), topic, key, mapper.writeValueAsString(event));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Cannot serialize event", e);
        }
    }
}
