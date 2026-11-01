package dev.algomotion.execution.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "code_execution_jobs")
public class ExecutionJob {
    public enum Status { QUEUED, RUNNING, COMPLETED, COMPILATION_ERROR, FAILED, TIMEOUT, REJECTED }

    @Id private UUID id;
    @Column(name = "user_id") private UUID userId;
    private String origin;
    @Column(name = "origin_ref") private String originRef;
    @Column(name = "problem_slug") private String problemSlug;
    private String language = "java";
    @Column(name = "source_code") private String sourceCode;
    @JdbcTypeCode(SqlTypes.JSON) private String tests;
    @Enumerated(EnumType.STRING) private Status status;
    private String sandbox;
    @Column(name = "compile_output") private String compileOutput;
    private String stderr;
    private String message;
    @Column(name = "runtime_ms") private Integer runtimeMs;
    private int passed;
    private int total;
    @Column(name = "created_at") private Instant createdAt = Instant.now();
    @Column(name = "started_at") private Instant startedAt;
    @Column(name = "finished_at") private Instant finishedAt;
    @Version private long version;

    @OneToMany(mappedBy = "job", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("idx")
    private List<ExecutionResult> results = new ArrayList<>();

    protected ExecutionJob() {}

    public ExecutionJob(UUID userId, String origin, String originRef, String problemSlug, String sourceCode, String testsJson, int total, String sandbox) {
        this.id = UUID.randomUUID();
        this.userId = userId;
        this.origin = origin;
        this.originRef = originRef;
        this.problemSlug = problemSlug;
        this.sourceCode = sourceCode;
        this.tests = testsJson;
        this.total = total;
        this.sandbox = sandbox;
        this.status = Status.QUEUED;
    }

    public void start() {
        status = Status.RUNNING;
        startedAt = Instant.now();
    }

    public void finish(Status s, String compileOutput, String message, Integer runtimeMs) {
        this.status = s;
        this.compileOutput = compileOutput;
        this.message = message == null ? null : message.substring(0, Math.min(500, message.length()));
        this.runtimeMs = runtimeMs;
        this.passed = (int) results.stream().filter(ExecutionResult::isPassed).count();
        this.finishedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public String getOrigin() { return origin; }
    public String getOriginRef() { return originRef; }
    public String getSourceCode() { return sourceCode; }
    public String getTests() { return tests; }
    public Status getStatus() { return status; }
    public String getSandbox() { return sandbox; }
    public String getCompileOutput() { return compileOutput; }
    public String getStderr() { return stderr; }
    public String getMessage() { return message; }
    public Integer getRuntimeMs() { return runtimeMs; }
    public int getPassed() { return passed; }
    public int getTotal() { return total; }
    public List<ExecutionResult> getResults() { return results; }
}
