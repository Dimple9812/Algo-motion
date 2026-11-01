package dev.algomotion.users.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "saved_sessions")
public class SavedSession {
    @Id private UUID id;
    @Column(name = "user_id") private UUID userId;
    private String type;
    private String title;
    private String reference;
    @JdbcTypeCode(SqlTypes.JSON) private String payload;
    @Column(name = "created_at") private Instant createdAt = Instant.now();

    protected SavedSession() {}

    public SavedSession(UUID userId, String type, String title, String reference, String payload) {
        this.id = UUID.randomUUID();
        this.userId = userId;
        this.type = type;
        this.title = title;
        this.reference = reference;
        this.payload = payload;
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public String getType() { return type; }
    public String getTitle() { return title; }
    public String getReference() { return reference; }
    public String getPayload() { return payload; }
    public Instant getCreatedAt() { return createdAt; }
}
