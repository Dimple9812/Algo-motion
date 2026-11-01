package dev.algomotion.users.web;

import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/** Server-side XP rules (the client never chooses XP values). Mirrors frontend/src/store/progress.ts. */
public final class ProgressRules {
    private ProgressRules() {}

    public static final Map<String, Integer> XP = Map.of("VISUALIZATION", 5, "PREDICTION", 10, "CHALLENGE", 25, "PROBLEM", 50, "PATH", 100);
    public static final Map<String, String> KEY_PREFIX = Map.of("VISUALIZATION", "viz:", "PREDICTION", "predict:", "CHALLENGE", "challenge:", "PROBLEM", "problem:", "PATH", "path:");
    public static final Pattern KEY = Pattern.compile("^[a-z]+:[a-z0-9-]{1,80}(:[a-z0-9-]{1,20})?$");
    public static final Pattern TOPIC = Pattern.compile("^[a-z-]{2,40}$");

    public record Badge(String id, List<String> topics, int threshold) {}

    public static final List<Badge> BADGES = List.of(
        new Badge("array-explorer", List.of("arrays", "searching"), 30),
        new Badge("pointer-pro", List.of("linked-lists"), 30),
        new Badge("stack-master", List.of("stacks"), 30),
        new Badge("queue-navigator", List.of("queues"), 20),
        new Badge("tree-climber", List.of("trees", "heaps", "tries"), 30),
        new Badge("graph-pathfinder", List.of("graphs"), 30),
        new Badge("sorting-specialist", List.of("sorting"), 30),
        new Badge("dp-detective", List.of("dynamic-programming"), 30),
        new Badge("interview-ready", List.of("problems"), 150));
}
