package dev.algomotion.ai.jobs;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import dev.algomotion.ai.domain.Entities.ApproachRepository;
import dev.algomotion.ai.domain.Entities.SessionRepository;
import dev.algomotion.ai.domain.Entities.SolutionApproach;
import dev.algomotion.ai.domain.Entities.SolutionSession;
import dev.algomotion.ai.domain.Entities.Status;
import dev.algomotion.ai.domain.Entities.Verdict;
import dev.algomotion.ai.provider.LlmProvider;
import dev.algomotion.ai.provider.LlmProvider.ProviderException;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class SolutionWorker {
    private static final Logger log = LoggerFactory.getLogger(SolutionWorker.class);
    private final SessionRepository sessions;
    private final ApproachRepository approaches;
    private final LlmProvider provider;
    private final ResponseValidator validator;
    private final ExecutionClient executions;
    private final TransactionTemplate tx;
    private final ObjectMapper mapper;
    private final MeterRegistry metrics;

    public SolutionWorker(SessionRepository sessions, ApproachRepository approaches, LlmProvider provider, ResponseValidator validator,
                          ExecutionClient executions, TransactionTemplate tx, ObjectMapper mapper, MeterRegistry metrics) {
        this.sessions = sessions;
        this.approaches = approaches;
        this.provider = provider;
        this.validator = validator;
        this.executions = executions;
        this.tx = tx;
        this.mapper = mapper;
        this.metrics = metrics;
    }

    /** @return execution ids that were submitted (so the local dispatcher can poll them). */
    public List<UUID> generate(UUID sessionId) {
        SolutionSession claimed = tx.execute(s -> {
            SolutionSession x = sessions.findById(sessionId).orElse(null);
            if (x == null || x.getStatus() != Status.QUEUED) return null;
            x.status(Status.GENERATING);
            return sessions.save(x);
        });
        if (claimed == null) return List.of();
        String raw;
        Timer.Sample t = Timer.start(metrics);
        try {
            raw = provider.generate(claimed.getProblemText());
            t.stop(metrics.timer("algomotion.ai.latency", "provider", provider.name(), "outcome", "ok"));
        } catch (ProviderException e) {
            t.stop(metrics.timer("algomotion.ai.latency", "provider", provider.name(), "outcome", "error"));
            metrics.counter("algomotion.ai.failures", "reason", e.rateLimited() ? "rate_limited" : "provider").increment();
            failSession(sessionId, e.rateLimited() ? "The AI provider is rate-limiting requests. Please try again shortly." : e.getMessage());
            return List.of();
        } catch (RuntimeException e) {
            log.error("Provider crashed for session {}", sessionId, e);
            metrics.counter("algomotion.ai.failures", "reason", "unexpected").increment();
            failSession(sessionId, "The AI provider failed unexpectedly.");
            return List.of();
        }
        ResponseValidator.Validated v;
        try {
            tx.executeWithoutResult(s -> sessions.findById(sessionId).ifPresent(x -> x.status(Status.VALIDATING)));
            v = validator.validate(raw);
        } catch (ResponseValidator.InvalidResponse e) {
            metrics.counter("algomotion.ai.failures", "reason", "invalid_response").increment();
            failSession(sessionId, "The model response was rejected: " + e.getMessage());
            return List.of();
        }
        List<UUID> approachIds = tx.execute(s -> {
            SolutionSession x = sessions.findById(sessionId).orElseThrow();
            x.meta(mapper.valueToTree(v.topics()).toString(), mapper.valueToTree(v.ambiguities()).toString());
            List<UUID> ids = new ArrayList<>();
            for (int i = 0; i < v.approaches().size(); i++) {
                ObjectNode a = v.approaches().get(i);
                a.put("problemSummary", v.problemSummary());
                SolutionApproach ap = new SolutionApproach(x, i, a.toString());
                x.getApproaches().add(ap);
                ids.add(ap.getId());
            }
            x.status(Status.TESTING);
            sessions.save(x);
            return ids;
        });
        List<UUID> submitted = new ArrayList<>();
        for (int i = 0; i < approachIds.size(); i++) {
            ObjectNode a = v.approaches().get(i);
            UUID apId = approachIds.get(i);
            List<Map<String, String>> tests = new ArrayList<>();
            a.path("testCases").forEach(tc -> tests.add(Map.of("input", tc.get("input").asText(), "expected", tc.get("expected").asText())));
            if (tests.isEmpty()) {
                setVerdict(apId, Verdict.MANUAL_REVIEW, null);
                continue;
            }
            try {
                UUID execId = executions.submit(a.get("javaCode").asText(), tests, apId);
                tx.executeWithoutResult(s -> approaches.findById(apId).ifPresent(ap -> ap.submitted(execId)));
                submitted.add(execId);
            } catch (Exception e) {
                log.warn("Could not submit approach {} for execution: {}", apId, e.getMessage());
                setVerdict(apId, Verdict.MANUAL_REVIEW, null);
            }
        }
        finishIfResolved(sessionId);
        return submitted;
    }

    /** Applies an execution result to its approach (idempotent: re-applying the same result is harmless). */
    public void onExecutionCompleted(UUID executionId) {
        JsonNode exec;
        try {
            exec = executions.get(executionId);
        } catch (Exception e) {
            throw new IllegalStateException("Execution service unavailable", e); // retried by the Kafka error handler
        }
        String status = exec.path("status").asText();
        if (status.equals("QUEUED") || status.equals("RUNNING")) return;
        int passed = exec.path("passed").asInt();
        int total = exec.path("total").asInt();
        Verdict v = switch (status) {
            case "COMPLETED" -> passed == total && total > 0 ? Verdict.TESTS_PASSED : Verdict.TESTS_FAILED;
            case "TIMEOUT" -> Verdict.TESTS_FAILED;
            default -> Verdict.MANUAL_REVIEW; // compilation error, rejected or sandbox failure
        };
        UUID sessionId = tx.execute(s -> approaches.findByExecutionId(executionId).map(ap -> {
            ap.result(v, exec.toString());
            return ap.getSession().getId();
        }).orElse(null));
        if (sessionId != null) finishIfResolved(sessionId);
    }

    private void setVerdict(UUID approachId, Verdict v, String exec) {
        tx.executeWithoutResult(s -> approaches.findById(approachId).ifPresent(ap -> ap.result(v, exec)));
    }

    private void finishIfResolved(UUID sessionId) {
        tx.executeWithoutResult(s -> sessions.findById(sessionId).ifPresent(x -> {
            boolean pending = x.getApproaches().stream().anyMatch(a -> a.getVerdict() == Verdict.GENERATED);
            if (!pending && x.getStatus() != Status.COMPLETED) x.status(Status.COMPLETED);
        }));
    }

    private void failSession(UUID id, String msg) {
        tx.executeWithoutResult(s -> sessions.findById(id).ifPresent(x -> x.fail(msg)));
    }
}
