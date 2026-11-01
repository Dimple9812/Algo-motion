package dev.algomotion.users.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "users")
public class User {
    @Id private UUID id;
    private String email;
    @Column(name = "password_hash") private String passwordHash;
    @Column(name = "display_name") private String displayName;
    @Column(name = "created_at") private Instant createdAt = Instant.now();
    @Version private long version;

    protected User() {}

    public User(String email, String passwordHash, String displayName) {
        this.id = UUID.randomUUID();
        this.email = email;
        this.passwordHash = passwordHash;
        this.displayName = displayName;
    }

    public UUID getId() { return id; }
    public String getEmail() { return email; }
    public String getPasswordHash() { return passwordHash; }
    public String getDisplayName() { return displayName; }
}
