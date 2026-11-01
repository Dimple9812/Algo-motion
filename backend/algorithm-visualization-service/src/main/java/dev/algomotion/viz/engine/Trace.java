package dev.algomotion.viz.engine;

import java.util.List;
import java.util.Map;

/** Trace schema v1.0 — identical JSON shape to frontend/src/engine/types.ts. */
public record Trace(String schemaVersion, String algorithm, Map<String, Object> input, List<Step> steps, Object result, Map<String, Integer> metrics) {
    public static final String VERSION = "1.0";

    public record Step(int step, String operation, String explanation, Integer line, Map<String, Object> variables, Map<String, Object> state, boolean done) {}
}
