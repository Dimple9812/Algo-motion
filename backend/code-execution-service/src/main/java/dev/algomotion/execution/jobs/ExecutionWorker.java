package dev.algomotion.execution.jobs;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.algomotion.execution.ExecutionProperties;
import dev.algomotion.execution.domain.ExecutionJob;
import dev.algomotion.execution.domain.ExecutionJob.Status;
import dev.algomotion.execution.domain.ExecutionJobRepository;
import dev.algomotion.execution.domain.ExecutionResult;
import dev.algomotion.execution.sandbox.Sandbox;
import dev.algomotion.execution.sandbox.Sandbox.CaseOutcome;
import dev.algomotion.execution.sandbox.Sandbox.SandboxResult;
import dev.algomotion.execution.sandbox.Sandbox.TestInput;
import dev.algomotion.shared.messaging.Events.CodeExecutionCompleted;
import dev.algomotion.shared.messaging.Outbox;
import dev.algomotion.shared.messaging.Topics;
import io.micrometer.core.instrument.MeterRegistry;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Semaphore;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

/** Runs one queued job. Safe to call more than once for the same job: only QUEUED jobs are executed. */
@Service
public class ExecutionWorker {
    private static final Logger log = LoggerFactory.getLogger(ExecutionWorker.class);
    private final ExecutionJobRepository jobs;
    private final Sandbox sandbox;
    private final TransactionTemplate tx;
    private final ObjectMapper mapper;
    private final ObjectProvider<Outbox> outbox;
    private final MeterRegistry metrics;
    private final Semaphore slots;

    public ExecutionWorker(ExecutionJobRepository jobs, Sandbox sandbox, TransactionTemplate tx, ObjectMapper mapper, ObjectProvider<Outbox> outbox,
                           MeterRegistry metrics, ExecutionProperties props) {
        this.jobs = jobs;
        this.sandbox = sandbox;
        this.tx = tx;
        this.mapper = mapper;
        this.outbox = outbox;
        this.metrics = metrics;
        this.slots = new Semaphore(Math.max(1, props.maxConcurrent()));
        metrics.gauge("algomotion.execution.queue", jobs, r -> r.countByStatusIn(List.of(Status.QUEUED, Status.RUNNING)));
    }

    public void process(UUID jobId, String correlationId) {
        if (correlationId != null) MDC.put("correlationId", correlationId);
        try {
            ExecutionJob claimed = tx.execute(s -> {
                ExecutionJob j = jobs.findById(jobId).orElse(null);
                if (j == null || j.getStatus() != Status.QUEUED) return null;
                j.start();
                return jobs.save(j);
            });
            if (claimed == null) return;
            List<TestInput> tests = mapper.readValue(claimed.getTests(), new TypeReference<List<TestInput>>() {});
            SandboxResult r;
            slots.acquire();
            try {
                r = metrics.timer("algomotion.execution.duration", "sandbox", sandbox.name()).record(() -> sandbox.run(claimed.getSourceCode(), tests));
            } finally {
                slots.release();
            }
            complete(jobId, tests, r, correlationId);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } catch (Exception e) {
            log.error("Execution job {} failed", jobId, e);
            tx.executeWithoutResult(s -> jobs.findById(jobId).ifPresent(j -> {
                j.finish(Status.FAILED, null, "Internal execution error", null);
                publish(j, correlationId);
            }));
        } finally {
            MDC.remove("correlationId");
        }
    }

    private void complete(UUID jobId, List<TestInput> tests, SandboxResult r, String correlationId) {
        tx.executeWithoutResult(s -> {
            ExecutionJob j = jobs.findById(jobId).orElseThrow();
            Status status;
            if (!r.compiled()) {
                status = r.compileOutput() != null ? Status.COMPILATION_ERROR : Status.FAILED;
            } else {
                for (int i = 0; i < r.cases().size(); i++) {
                    CaseOutcome c = r.cases().get(i);
                    j.getResults().add(new ExecutionResult(j, i, tests.get(i).input(), tests.get(i).expected(), c.actual(), c.passed(), (int) c.timeMs(), c.error()));
                }
                status = r.cases().stream().anyMatch(CaseOutcome::timedOut) ? Status.TIMEOUT : Status.COMPLETED;
            }
            if (status == Status.TIMEOUT) metrics.counter("algomotion.execution.timeouts").increment();
            metrics.counter("algomotion.execution.completed", "status", status.name()).increment();
            j.finish(status, r.compileOutput(), r.message(), (int) r.totalMs());
            jobs.save(j);
            publish(j, correlationId);
        });
    }

    private void publish(ExecutionJob j, String correlationId) {
        Outbox o = outbox.getIfAvailable();
        if (o == null) return;
        o.enqueue(Topics.EXECUTION_COMPLETED, j.getId().toString(), new CodeExecutionCompleted(UUID.randomUUID(), 1, correlationId, Instant.now(), j.getId(),
            j.getOrigin(), j.getOriginRef(), j.getStatus().name(), j.getPassed(), j.getTotal(), j.getCompileOutput()));
    }
}
