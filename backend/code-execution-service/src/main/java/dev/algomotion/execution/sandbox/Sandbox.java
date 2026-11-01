package dev.algomotion.execution.sandbox;

import java.util.List;

/** Compiles and runs untrusted Java against test cases. Implementations must never run code in the service JVM. */
public interface Sandbox {
    String name();

    SandboxResult run(String source, List<TestInput> tests);

    record TestInput(String input, String expected) {}

    record CaseOutcome(String actual, boolean passed, long timeMs, String error, boolean timedOut) {}

    record SandboxResult(boolean compiled, String compileOutput, List<CaseOutcome> cases, long totalMs, String message) {
        public static SandboxResult compileError(String out, long ms) { return new SandboxResult(false, out, List.of(), ms, "Compilation failed"); }
    }

    /** Output comparison: ignore trailing whitespace on each line and trailing blank lines. */
    static String normalize(String s) {
        if (s == null) return "";
        String[] lines = s.replace("\r\n", "\n").split("\n", -1);
        StringBuilder b = new StringBuilder();
        for (String l : lines) b.append(l.stripTrailing()).append('\n');
        return b.toString().strip();
    }

    static String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max) + "\n…[output truncated]";
    }
}
