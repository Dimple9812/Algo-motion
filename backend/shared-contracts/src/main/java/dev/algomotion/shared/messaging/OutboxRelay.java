package dev.algomotion.shared.messaging;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;

/** Polls unpublished outbox rows and sends them to Kafka (at-least-once; consumers are idempotent). */
public class OutboxRelay {
    private static final Logger log = LoggerFactory.getLogger(OutboxRelay.class);
    private final JdbcTemplate jdbc;
    private final KafkaTemplate<String, String> kafka;

    public OutboxRelay(JdbcTemplate jdbc, KafkaTemplate<String, String> kafka) {
        this.jdbc = jdbc;
        this.kafka = kafka;
    }

    @Scheduled(fixedDelayString = "${algomotion.outbox.poll-ms:500}")
    public void publishPending() {
        List<Map<String, Object>> rows = jdbc.queryForList(
            "select id, topic, message_key, payload from outbox_events where published_at is null order by created_at limit 50");
        for (Map<String, Object> r : rows) {
            try {
                kafka.send((String) r.get("topic"), (String) r.get("message_key"), (String) r.get("payload")).get(5, TimeUnit.SECONDS);
                jdbc.update("update outbox_events set published_at = now() where id = ?", (UUID) r.get("id"));
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            } catch (Exception e) {
                log.warn("Outbox publish failed for {} — will retry: {}", r.get("id"), e.getMessage());
                return;
            }
        }
    }
}
