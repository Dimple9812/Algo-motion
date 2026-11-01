package dev.algomotion.shared.messaging;

import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;

/** Records processed event ids so redelivered Kafka messages are ignored. Needs a processed_events(event_id uuid primary key) table. */
public class Idempotency {
    private final JdbcTemplate jdbc;

    public Idempotency(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    /** @return true the first time an event id is seen (call inside the consumer's transaction). */
    public boolean firstTime(UUID eventId) {
        return jdbc.update("insert into processed_events (event_id, processed_at) values (?, now()) on conflict do nothing", eventId) == 1;
    }
}
