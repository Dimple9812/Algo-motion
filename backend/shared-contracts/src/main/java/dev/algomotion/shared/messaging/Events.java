package dev.algomotion.shared.messaging;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Versioned event payloads. Every event carries eventId (idempotency key), schemaVersion and correlationId.
 */
public final class Events {
    private Events() {}

    public record TestCaseDto(String input, String expected) {}

    public record SolutionGenerationRequested(UUID eventId, int schemaVersion, String correlationId, Instant occurredAt, UUID solutionId) {}

    public record SolutionGenerationCompleted(UUID eventId, int schemaVersion, String correlationId, Instant occurredAt, UUID solutionId, String status) {}

    /** origin: "API" for user submissions, "AI_SOLUTION" for generated approaches (originRef = approach id). */
    public record CodeExecutionRequested(UUID eventId, int schemaVersion, String correlationId, Instant occurredAt, UUID executionId, String origin, String originRef) {}

    public record CodeExecutionCompleted(UUID eventId, int schemaVersion, String correlationId, Instant occurredAt, UUID executionId, String origin, String originRef,
                                         String status, int passed, int total, String compileOutput) {}

    public record LearningProgressRecorded(UUID eventId, int schemaVersion, String correlationId, Instant occurredAt, UUID userId, String key, String kind, String topic, int xp) {}

    public record AchievementUnlocked(UUID eventId, int schemaVersion, String correlationId, Instant occurredAt, UUID userId, String badgeId) {}

    public static <T> List<T> none() { return List.of(); }
}
