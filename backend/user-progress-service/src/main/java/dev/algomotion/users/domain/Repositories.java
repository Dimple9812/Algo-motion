package dev.algomotion.users.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public final class Repositories {
    private Repositories() {}

    public interface UserRepository extends JpaRepository<User, UUID> {
        @Query("select u from User u where lower(u.email) = lower(?1)")
        Optional<User> findByEmailIgnoreCase(String email);
    }

    public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {
        Optional<RefreshToken> findByTokenHash(String hash);

        @Modifying
        @Query("update RefreshToken t set t.revokedAt = current_timestamp where t.userId = ?1 and t.revokedAt is null")
        int revokeAllForUser(UUID userId);
    }

    public interface SavedSessionRepository extends JpaRepository<SavedSession, UUID> {
        List<SavedSession> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable page);

        Optional<SavedSession> findByIdAndUserId(UUID id, UUID userId);

        long countByUserId(UUID userId);
    }
}
