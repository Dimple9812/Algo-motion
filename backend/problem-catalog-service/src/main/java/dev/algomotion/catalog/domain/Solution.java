package dev.algomotion.catalog.domain;

import jakarta.persistence.*;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "problem_solutions")
public class Solution {
    @Id
    private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "problem_id")
    private Problem problem;
    private String kind;
    @JdbcTypeCode(SqlTypes.JSON)
    private String payload;

    protected Solution() {}

    public Solution(Problem p, String kind, String payload) {
        this.id = UUID.randomUUID();
        this.problem = p;
        this.kind = kind;
        this.payload = payload;
    }

    public String getKind() { return kind; }
    public String getPayload() { return payload; }
}
