package dev.algomotion.execution.domain;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "code_execution_results")
public class ExecutionResult {
    @Id private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "job_id") private ExecutionJob job;
    private int idx;
    private String input;
    private String expected;
    private String actual;
    private boolean passed;
    @Column(name = "time_ms") private int timeMs;
    private String error;

    protected ExecutionResult() {}

    public ExecutionResult(ExecutionJob job, int idx, String input, String expected, String actual, boolean passed, int timeMs, String error) {
        this.id = UUID.randomUUID();
        this.job = job;
        this.idx = idx;
        this.input = input;
        this.expected = expected;
        this.actual = actual;
        this.passed = passed;
        this.timeMs = timeMs;
        this.error = error;
    }

    public int getIdx() { return idx; }
    public String getInput() { return input; }
    public String getExpected() { return expected; }
    public String getActual() { return actual; }
    public boolean isPassed() { return passed; }
    public int getTimeMs() { return timeMs; }
    public String getError() { return error; }
}
