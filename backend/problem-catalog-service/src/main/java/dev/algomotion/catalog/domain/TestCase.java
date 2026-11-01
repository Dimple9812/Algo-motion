package dev.algomotion.catalog.domain;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "problem_test_cases")
public class TestCase {
    @Id
    private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "problem_id")
    private Problem problem;
    private int ordinal;
    private String input;
    private String expected;
    @Column(name = "is_sample")
    private boolean sample;

    protected TestCase() {}

    public TestCase(Problem p, int ordinal, String input, String expected, boolean sample) {
        this.id = UUID.randomUUID();
        this.problem = p;
        this.ordinal = ordinal;
        this.input = input;
        this.expected = expected;
        this.sample = sample;
    }

    public int getOrdinal() { return ordinal; }
    public String getInput() { return input; }
    public String getExpected() { return expected; }
    public boolean isSample() { return sample; }
}
