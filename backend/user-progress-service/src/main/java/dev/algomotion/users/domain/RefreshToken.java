package dev.algomotion.users.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "refresh_tokens")
public class RefreshToken {
    @Id private UUID id;
    @Column(name = "user_id") private UUID userId;
    @Column(name = "token_hash") private String tokenHash;
    @Column(name = "expires_at") private Instant expiresAt;
    @Column(name = "revoked_at") private Instant revokedAt;
    @Column(name = "created_at") private Instant createdAt = Instant.now();

    protected RefreshToken() {}

    public RefreshToken(UUID userId, String tokenHash, Instant expiresAt) {
        this.id = UUID.randomUUID();
        this.userId = userId;
        this.tokenHash = tokenHash;
        this.expiresAt = expiresAt;
    }

    public UUID getUserId() { return userId; }
    public boolean isActive() { return revokedAt == null && expiresAt.isAfter(Instant.now()); }
    public boolean isRevoked() { return revokedAt != null; }
    public void revoke() { if (revokedAt == null) revokedAt = Instant.now(); }
}
