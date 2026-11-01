package dev.algomotion.viz.engine;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Records deep-copied snapshots of algorithm state (mirror of the frontend TraceRecorder). */
public class Recorder {
    public static final int MAX_STEPS = 4000;
    public static final Set<String> OPERATIONS = Set.of("INIT", "READ", "COMPARE", "SWAP", "WRITE", "SHIFT", "INSERT", "DELETE", "UPDATE", "POINTER_MOVE",
        "FOUND", "NOT_FOUND", "PUSH", "POP", "PEEK", "ENQUEUE", "DEQUEUE", "OVERFLOW", "UNDERFLOW", "HASH", "COLLISION", "PROBE", "RESIZE", "VISIT", "RELAX",
        "ROTATE", "HEAPIFY", "CALL", "RETURN", "DP_UPDATE", "MARK_SORTED", "PARTITION", "MERGE", "SELECT_EDGE", "REJECT_EDGE", "UNION", "FIND", "ERROR", "DONE");

    private final String algorithm;
    private final Map<String, Object> input;
    private final List<Trace.Step> steps = new ArrayList<>();
    private final Map<String, Integer> metrics = new LinkedHashMap<>(Map.of("comparisons", 0, "swaps", 0, "writes", 0, "reads", 0));

    public Recorder(String algorithm, Map<String, Object> input) {
        this.algorithm = algorithm;
        this.input = input;
    }

    public void snap(String op, String explanation, Map<String, Object> state, Integer line, Map<String, Object> vars) {
        if (!OPERATIONS.contains(op)) throw new IllegalArgumentException("Unknown operation " + op);
        if (steps.size() >= MAX_STEPS) throw new InputException("Trace exceeded " + MAX_STEPS + " steps. Use a smaller input.");
        switch (op) {
            case "COMPARE" -> metrics.merge("comparisons", 1, Integer::sum);
            case "SWAP" -> metrics.merge("swaps", 1, Integer::sum);
            case "WRITE", "SHIFT" -> metrics.merge("writes", 1, Integer::sum);
            case "READ" -> metrics.merge("reads", 1, Integer::sum);
            default -> { }
        }
        steps.add(new Trace.Step(steps.size(), op, explanation, line, Snapshots.deepCopy(vars == null ? Map.of() : vars), Snapshots.deepCopy(state), false));
    }

    public Trace finish(Object result, String explanation, Map<String, Object> state, Integer line) {
        Map<String, Object> vars = new LinkedHashMap<>();
        if (result != null) vars.put("result", result);
        snap("DONE", explanation, state, line, vars);
        List<Trace.Step> done = new ArrayList<>();
        for (int i = 0; i < steps.size(); i++) {
            Trace.Step s = steps.get(i);
            done.add(new Trace.Step(s.step(), s.operation(), s.explanation(), s.line(), s.variables(), s.state(), i == steps.size() - 1));
        }
        return new Trace(Trace.VERSION, algorithm, input, done, result, metrics);
    }
}
