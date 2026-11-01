package dev.algomotion.catalog.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "problems")
public class Problem {
    @Id
    private UUID id;
    @Column(nullable = false, unique = true)
    private String slug;
    private String title;
    private String topic;
    @Enumerated(EnumType.STRING)
    private Difficulty difficulty;
    @Column(name = "visualization_supported")
    private boolean visualizationSupported;
    private String statement;
    @Column(name = "input_format")
    private String inputFormat;
    @Column(name = "output_format")
    private String outputFormat;
    @Column(name = "starter_code")
    private String starterCode;
    private String source;
    /** constraints, examples, edge cases, hints, related slugs — small bounded JSON document */
    @JdbcTypeCode(SqlTypes.JSON)
    private String details;
    @Column(name = "content_hash")
    private String contentHash;
    @Version
    private long version;
    @Column(name = "created_at")
    private Instant createdAt = Instant.now();
    @Column(name = "updated_at")
    private Instant updatedAt = Instant.now();

    @ElementCollection
    @CollectionTable(name = "problem_topics", joinColumns = @JoinColumn(name = "problem_id"))
    @Column(name = "tag")
    private Set<String> tags = new LinkedHashSet<>();

    @OneToMany(mappedBy = "problem", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("ordinal")
    private List<TestCase> tests = new ArrayList<>();

    @OneToMany(mappedBy = "problem", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Solution> solutions = new ArrayList<>();

    protected Problem() {}

    public Problem(UUID id, String slug) {
        this.id = id;
        this.slug = slug;
    }

    public void update(String title, String topic, Difficulty d, boolean viz, String statement, String inputFormat, String outputFormat,
                       String starterCode, String source, String details, String hash) {
        this.title = title;
        this.topic = topic;
        this.difficulty = d;
        this.visualizationSupported = viz;
        this.statement = statement;
        this.inputFormat = inputFormat;
        this.outputFormat = outputFormat;
        this.starterCode = starterCode;
        this.source = source;
        this.details = details;
        this.contentHash = hash;
        this.updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public String getSlug() { return slug; }
    public String getTitle() { return title; }
    public String getTopic() { return topic; }
    public Difficulty getDifficulty() { return difficulty; }
    public boolean isVisualizationSupported() { return visualizationSupported; }
    public String getStatement() { return statement; }
    public String getInputFormat() { return inputFormat; }
    public String getOutputFormat() { return outputFormat; }
    public String getStarterCode() { return starterCode; }
    public String getSource() { return source; }
    public String getDetails() { return details; }
    public String getContentHash() { return contentHash; }
    public Set<String> getTags() { return tags; }
    public List<TestCase> getTests() { return tests; }
    public List<Solution> getSolutions() { return solutions; }
}
