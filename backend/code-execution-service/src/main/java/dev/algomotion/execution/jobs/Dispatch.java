package dev.algomotion.execution.jobs;

import com.fasterxml.jackson.databind.ObjectMapper;
import dev.algomotion.shared.messaging.Events.CodeExecutionRequested;
import dev.algomotion.shared.messaging.Idempotency;
import dev.algomotion.shared.messaging.Outbox;
import dev.algomotion.shared.messaging.Topics;
import java.time.Instant;
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

/** How a newly created job reaches a worker: via Kafka (default) or an in-process queue (MESSAGING_ENABLED=false). */
public interface Dispatch {
    /** Must be called inside the transaction that created the job. */
    void dispatch(UUID jobId, String origin, String originRef);

    @Configuration
    class Config {
        @Bean
        @ConditionalOnProperty(name = "algomotion.messaging.enabled", havingValue = "true", matchIfMissing = true)
        Dispatch kafkaDispatch(Outbox outbox) {
            return (id, origin, ref) -> outbox.enqueue(Topics.EXECUTION_REQUESTED, id.toString(),
                new CodeExecutionRequested(UUID.randomUUID(), 1, MDC.get("correlationId"), Instant.now(), id, origin, ref));
        }

        @Bean
        @ConditionalOnProperty(name = "algomotion.messaging.enabled", havingValue = "false")
        Dispatch localDispatch(ExecutionWorker worker) {
            ThreadPoolExecutor pool = new ThreadPoolExecutor(2, 2, 0, TimeUnit.SECONDS, new ArrayBlockingQueue<>(100));
            return (id, origin, ref) -> {
                String cid = MDC.get("correlationId");
                TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                    @Override
                    public void afterCommit() { pool.execute(() -> worker.process(id, cid)); }
                });
            };
        }
    }

    /** Idempotent consumer: a redelivered request event is ignored; the worker also refuses non-QUEUED jobs. */
    @Component
    @ConditionalOnProperty(name = "algomotion.messaging.enabled", havingValue = "true", matchIfMissing = true)
    class RequestListener {
        private final ExecutionWorker worker;
        private final Idempotency idempotency;
        private final ObjectMapper mapper;

        RequestListener(ExecutionWorker worker, Idempotency idempotency, ObjectMapper mapper) {
            this.worker = worker;
            this.idempotency = idempotency;
            this.mapper = mapper;
        }

        @KafkaListener(topics = Topics.EXECUTION_REQUESTED, groupId = "code-execution-service")
        public void onRequested(String payload) throws Exception {
            CodeExecutionRequested e = mapper.readValue(payload, CodeExecutionRequested.class);
            if (markFirst(e.eventId())) worker.process(e.executionId(), e.correlationId());
        }

        boolean markFirst(UUID id) { return idempotency.firstTime(id); }
    }
}
