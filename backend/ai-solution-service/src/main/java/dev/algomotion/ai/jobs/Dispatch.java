package dev.algomotion.ai.jobs;

import com.fasterxml.jackson.databind.ObjectMapper;
import dev.algomotion.shared.messaging.Events.CodeExecutionCompleted;
import dev.algomotion.shared.messaging.Events.SolutionGenerationRequested;
import dev.algomotion.shared.messaging.Idempotency;
import dev.algomotion.shared.messaging.Outbox;
import dev.algomotion.shared.messaging.Topics;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import org.slf4j.MDC;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

public interface Dispatch {
    /** Call inside the transaction that created the session. */
    void requestGeneration(UUID sessionId);

    @Configuration
    class Config {
        @Bean
        @ConditionalOnProperty(name = "algomotion.messaging.enabled", havingValue = "true", matchIfMissing = true)
        Dispatch kafka(Outbox outbox) {
            return id -> outbox.enqueue(Topics.SOLUTION_REQUESTED, id.toString(), new SolutionGenerationRequested(UUID.randomUUID(), 1, MDC.get("correlationId"), Instant.now(), id));
        }

        /** Without Kafka: run in-process and poll execution results (development / single-node mode). */
        @Bean
        @ConditionalOnProperty(name = "algomotion.messaging.enabled", havingValue = "false")
        Dispatch local(SolutionWorker worker) {
            ThreadPoolExecutor pool = new ThreadPoolExecutor(2, 2, 0, TimeUnit.SECONDS, new ArrayBlockingQueue<>(50));
            return id -> TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    pool.execute(() -> {
                        List<UUID> execs = worker.generate(id);
                        long deadline = System.currentTimeMillis() + 600_000; // generous: small hosts queue runs one at a time
                        for (UUID e : execs) {
                            while (System.currentTimeMillis() < deadline) {
                                try {
                                    Thread.sleep(700);
                                    if (worker.onExecutionCompleted(e)) break; // otherwise still queued/running: poll again
                                } catch (InterruptedException ie) {
                                    Thread.currentThread().interrupt();
                                    return;
                                } catch (RuntimeException ignored) {
                                    // execution service briefly unavailable; keep polling until the deadline
                                }
                            }
                        }
                    });
                }
            });
        }
    }

    @Component
    @ConditionalOnProperty(name = "algomotion.messaging.enabled", havingValue = "true", matchIfMissing = true)
    class Listeners {
        private final SolutionWorker worker;
        private final Idempotency idempotency;
        private final ObjectMapper mapper;

        Listeners(SolutionWorker worker, Idempotency idempotency, ObjectMapper mapper) {
            this.worker = worker;
            this.idempotency = idempotency;
            this.mapper = mapper;
        }

        @KafkaListener(topics = Topics.SOLUTION_REQUESTED, groupId = "ai-solution-service")
        public void onRequested(String payload) throws Exception {
            SolutionGenerationRequested e = mapper.readValue(payload, SolutionGenerationRequested.class);
            if (e.correlationId() != null) MDC.put("correlationId", e.correlationId());
            try {
                if (idempotency.firstTime(e.eventId())) worker.generate(e.solutionId());
            } finally {
                MDC.remove("correlationId");
            }
        }

        /** Completion of generated-code runs. Idempotent: duplicates simply re-apply the same verdict. */
        @KafkaListener(topics = Topics.EXECUTION_COMPLETED, groupId = "ai-solution-service")
        public void onExecutionCompleted(String payload) throws Exception {
            CodeExecutionCompleted e = mapper.readValue(payload, CodeExecutionCompleted.class);
            if (!"AI_SOLUTION".equals(e.origin())) return;
            worker.onExecutionCompleted(e.executionId());
        }
    }
}
