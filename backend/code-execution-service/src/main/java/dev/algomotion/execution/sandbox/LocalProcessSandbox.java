package dev.algomotion.execution.sandbox;

import dev.algomotion.execution.ExecutionProperties;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Stream;

/**
 * DEVELOPMENT-ONLY runner: compiles and runs code in a separate JVM process with timeouts, a heap cap and output limits.
 * It does NOT restrict network or filesystem access and must never be exposed publicly. Use {@link DockerSandbox} in production.
 */
public class LocalProcessSandbox implements Sandbox {
    private final ExecutionProperties p;

    public LocalProcessSandbox(ExecutionProperties p) { this.p = p; }

    @Override
    public String name() { return "local-unsafe-dev"; }

    @Override
    public SandboxResult run(String source, List<TestInput> tests) {
        Path dir = null;
        try {
            dir = Files.createTempDirectory("am-exec-");
            Files.writeString(dir.resolve("Main.java"), source);
            ProcessRunner.Outcome c = ProcessRunner.run(List.of("javac", "-J-Xmx256m", "-nowarn", "-encoding", "UTF-8", "Main.java"), dir, null, p.compileTimeoutMs(), p.maxOutputBytes());
            if (c.timedOut()) return SandboxResult.compileError("Compilation timed out", c.millis());
            if (c.exitCode() != 0) return SandboxResult.compileError(Sandbox.truncate(c.stderr(), 8000), c.millis());
            List<CaseOutcome> out = new ArrayList<>();
            long total = c.millis();
            for (TestInput t : tests) {
                ProcessRunner.Outcome r = ProcessRunner.run(List.of("java", "-Xmx" + p.memoryMb() + "m", "-Xss64m", "-XX:+UseSerialGC", "-XX:TieredStopAtLevel=1", "-cp", ".", "Main"),
                    dir, t.input() + "\n", p.testTimeoutMs(), p.maxOutputBytes());
                total += r.millis();
                String err = r.timedOut() ? "Time limit exceeded (" + p.testTimeoutMs() + " ms)"
                    : r.exitCode() != 0 ? "Exited with code " + r.exitCode() + "\n" + Sandbox.truncate(r.stderr(), 4000) : null;
                boolean passed = err == null && Sandbox.normalize(r.stdout()).equals(Sandbox.normalize(t.expected()));
                out.add(new CaseOutcome(Sandbox.truncate(r.stdout(), 4000), passed, r.millis(), err, r.timedOut()));
            }
            return new SandboxResult(true, null, out, total, null);
        } catch (IOException e) {
            return new SandboxResult(false, null, List.of(), 0, "Sandbox error: " + e.getMessage());
        } finally {
            deleteQuietly(dir);
        }
    }

    static void deleteQuietly(Path dir) {
        if (dir == null) return;
        try (Stream<Path> s = Files.walk(dir)) {
            s.sorted(Comparator.reverseOrder()).forEach(f -> f.toFile().delete());
        } catch (IOException ignored) {
            // best effort cleanup of a temp directory
        }
    }
}
