package dev.algomotion.viz.engine;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** Structural validation of traces (mirror of frontend/src/engine/validate.ts). */
public final class TraceValidator {
    private TraceValidator() {}

    public static List<String> validate(Trace t) {
        List<String> errors = new ArrayList<>();
        if (!Trace.VERSION.equals(t.schemaVersion())) errors.add("Unsupported schemaVersion");
        if (t.algorithm() == null || !t.algorithm().matches("^[a-z0-9-]{1,64}$")) errors.add("Invalid algorithm id");
        if (t.steps() == null || t.steps().isEmpty()) {
            errors.add("Trace must contain at least one step");
            return errors;
        }
        if (t.steps().size() > Recorder.MAX_STEPS) errors.add("Too many steps");
        Object kind = null;
        for (int i = 0; i < t.steps().size(); i++) {
            Trace.Step s = t.steps().get(i);
            if (s.step() != i) errors.add("Step " + i + " has wrong index");
            if (!Recorder.OPERATIONS.contains(s.operation())) errors.add("Step " + i + " has unknown operation");
            if (s.explanation() == null || s.explanation().length() > 500) errors.add("Step " + i + " explanation invalid");
            if (s.line() != null && s.line() < 1) errors.add("Step " + i + " line invalid");
            Map<String, Object> st = s.state();
            if (st == null || st.get("kind") == null) errors.add("Step " + i + " has no visual state");
            else if (kind == null) kind = st.get("kind");
            else if (!kind.equals(st.get("kind"))) errors.add("Step " + i + " changes visual kind");
            if (s.done() != (i == t.steps().size() - 1)) errors.add("Step " + i + " done flag inconsistent");
        }
        return errors;
    }
}
