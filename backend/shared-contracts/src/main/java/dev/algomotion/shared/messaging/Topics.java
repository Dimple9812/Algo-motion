package dev.algomotion.shared.messaging;

/** Kafka topic names. Dead-letter topics use the ".DLT" suffix. */
public final class Topics {
    public static final String SOLUTION_REQUESTED = "algomotion.solution.requested.v1";
    public static final String SOLUTION_COMPLETED = "algomotion.solution.completed.v1";
    public static final String EXECUTION_REQUESTED = "algomotion.execution.requested.v1";
    public static final String EXECUTION_COMPLETED = "algomotion.execution.completed.v1";
    public static final String LEARNING_PROGRESS = "algomotion.progress.recorded.v1";
    public static final String ACHIEVEMENT_UNLOCKED = "algomotion.achievement.unlocked.v1";

    private Topics() {}
}
