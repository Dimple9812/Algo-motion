package dev.algomotion.ai.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.jpa.repository.JpaRepository;

public final class Entities {
    private Entities() {}

    public enum Status { QUEUED, GENERATING, VALIDATING, TESTING, COMPLETED, FAILED }

    public enum Verdict { GENERATED, SYNTAX_CHECKED, TESTS_PASSED, TESTS_FAILED, MANUAL_REVIEW }

    @Entity
    @Table(name = "solution_sessions")
    public static class SolutionSession {
        @Id private UUID id;
        @Column(name = "user_id") private UUID userId;
        @Column(name = "problem_text") private String problemText;
        @Enumerated(EnumType.STRING) private Status status;
        private String provider;
        @JdbcTypeCode(SqlTypes.JSON) private String topics = "[]";
        @JdbcTypeCode(SqlTypes.JSON) private String ambiguities = "[]";
        private String error;
        @Column(name = "created_at") private Instant createdAt = Instant.now();
        @Column(name = "updated_at") private Instant updatedAt = Instant.now();
        @Version private long version;
        @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true)
        @OrderBy("ordinal")
        private List<SolutionApproach> approaches = new ArrayList<>();

        protected SolutionSession() {}

        public SolutionSession(UUID userId, String text, String provider) {
            this.id = UUID.randomUUID();
            this.userId = userId;
            this.problemText = text;
            this.provider = provider;
            this.status = Status.QUEUED;
        }

        public void status(Status s) {
            this.status = s;
            this.updatedAt = Instant.now();
        }

        public void fail(String message) {
            this.error = message == null ? "Unknown error" : message.substring(0, Math.min(500, message.length()));
            status(Status.FAILED);
        }

        public void meta(String topics, String ambiguities) {
            this.topics = topics;
            this.ambiguities = ambiguities;
        }

        public UUID getId() { return id; }
        public UUID getUserId() { return userId; }
        public String getProblemText() { return problemText; }
        public Status getStatus() { return status; }
        public String getProvider() { return provider; }
        public String getTopics() { return topics; }
        public String getAmbiguities() { return ambiguities; }
        public String getError() { return error; }
        public Instant getCreatedAt() { return createdAt; }
        public List<SolutionApproach> getApproaches() { return approaches; }
    }

    @Entity
    @Table(name = "solution_approaches")
    public static class SolutionApproach {
        @Id private UUID id;
        @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "session_id") private SolutionSession session;
        private int ordinal;
        @JdbcTypeCode(SqlTypes.JSON) private String payload;
        @Enumerated(EnumType.STRING) private Verdict verdict = Verdict.GENERATED;
        @Column(name = "execution_id") private UUID executionId;
        @JdbcTypeCode(SqlTypes.JSON) private String execution;

        protected SolutionApproach() {}

        public SolutionApproach(SolutionSession s, int ordinal, String payload) {
            this.id = UUID.randomUUID();
            this.session = s;
            this.ordinal = ordinal;
            this.payload = payload;
        }

        public UUID getId() { return id; }
        public SolutionSession getSession() { return session; }
        public String getPayload() { return payload; }
        public Verdict getVerdict() { return verdict; }
        public UUID getExecutionId() { return executionId; }
        public String getExecution() { return execution; }
        public void submitted(UUID executionId) { this.executionId = executionId; }
        public void result(Verdict v, String executionJson) {
            this.verdict = v;
            this.execution = executionJson;
        }
    }

    public interface SessionRepository extends JpaRepository<SolutionSession, UUID> {}

    public interface ApproachRepository extends JpaRepository<SolutionApproach, UUID> {
        Optional<SolutionApproach> findByExecutionId(UUID executionId);
    }
}
