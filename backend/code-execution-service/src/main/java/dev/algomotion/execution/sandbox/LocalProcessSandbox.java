package dev.algomotion.execution.sandbox;

import dev.algomotion.execution.ExecutionProperties;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermissions;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Stream;

/**
 * Runs code in a separate JVM process (no container) with timeouts, a heap cap and output limits.
 *
 * <p>Plain mode ({@code EXECUTION_SANDBOX=local}) is DEVELOPMENT-ONLY: the child runs as the service's own user.
 *
 * <p>Restricted mode ({@code EXECUTION_SANDBOX=restricted}) is for hosts without Docker. The service must run as root:
 * javac and java run as uid/gid 65534 (nobody) via {@code setpriv} with no capabilities, no-new-privs and a cleared
 * environment, so they cannot read the service's environment or files. {@code prlimit} caps processes and file size.
 * The program runs under the Java 21 SecurityManager with the default (deny-almost-everything) policy, which blocks
 * sockets, file access, process creation and reflection into the JDK. This is defence in depth, NOT container isolation:
 * it shares the kernel, and a JVM escape would not be contained. {@link DockerSandbox} remains the recommended runner.
 */
public class LocalProcessSandbox implements Sandbox {
    static final List<String> DROP_PRIVILEGES = List.of("setpriv", "--reuid=65534", "--regid=65534", "--clear-groups", "--no-new-privs",
        "--inh-caps=-all", "--bounding-set=-all", "prlimit", "--nproc=256", "--fsize=16777216", "--core=0");

    private final ExecutionProperties p;
    private final boolean restricted;

    public LocalProcessSandbox(ExecutionProperties p) { this(p, false); }

    public LocalProcessSandbox(ExecutionProperties p, boolean restricted) {
        this.p = p;
        this.restricted = restricted;
    }

    @Override
    public String name() { return restricted ? "local-restricted" : "local-unsafe-dev"; }

    List<String> compileCommand() {
        return withPrefix(List.of("javac", "-J-Xmx256m", "-nowarn", "-encoding", "UTF-8", "Main.java"));
    }

    List<String> runCommand() {
        List<String> java = new ArrayList<>(List.of("java", "-Xmx" + p.memoryMb() + "m", "-Xss64m", "-XX:+UseSerialGC", "-XX:TieredStopAtLevel=1"));
        if (restricted) java.addAll(List.of("-Djava.security.manager=default", "-XX:-UsePerfData"));
        java.addAll(List.of("-cp", ".", "Main"));
        return withPrefix(java);
    }

    private List<String> withPrefix(List<String> cmd) {
        if (!restricted) return cmd;
        List<String> all = new ArrayList<>(DROP_PRIVILEGES);
        all.addAll(cmd);
        return all;
    }

    @Override
    public SandboxResult run(String source, List<TestInput> tests) {
        Path dir = null;
        try {
            dir = Files.createTempDirectory("am-exec-");
            Files.writeString(dir.resolve("Main.java"), source);
            if (restricted) {
                // the unprivileged compiler must be able to write .class files into this run's private directory
                Files.setPosixFilePermissions(dir, PosixFilePermissions.fromString("rwxrwxrwx"));
                Files.setPosixFilePermissions(dir.resolve("Main.java"), PosixFilePermissions.fromString("rw-r--r--"));
            }
            ProcessRunner.Outcome c = ProcessRunner.run(compileCommand(), dir, null, p.compileTimeoutMs(), p.maxOutputBytes());
            if (c.timedOut()) return SandboxResult.compileError("Compilation timed out", c.millis());
            if (c.exitCode() != 0) return SandboxResult.compileError(Sandbox.truncate(c.stderr(), 8000), c.millis());
            List<CaseOutcome> out = new ArrayList<>();
            long total = c.millis();
            for (TestInput t : tests) {
                ProcessRunner.Outcome r = ProcessRunner.run(runCommand(), dir, t.input() + "\n", p.testTimeoutMs(), p.maxOutputBytes());
                total += r.millis();
                String err = r.timedOut() ? "Time limit exceeded (" + p.testTimeoutMs() + " ms)"
                    : r.exitCode() != 0 ? "Exited with code " + r.exitCode() + "\n" + Sandbox.truncate(stripSecurityManagerWarning(r.stderr()), 4000) : null;
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

    /** The JVM prints a 4-line deprecation banner when the SecurityManager is enabled; it is noise for learners. */
    static String stripSecurityManagerWarning(String stderr) {
        return stderr.lines().filter(l -> !l.startsWith("WARNING: A command line option has enabled the Security Manager")
            && !l.startsWith("WARNING: The Security Manager is deprecated")).reduce((a, b) -> a + "\n" + b).orElse("");
    }

    /** Fails fast at startup if the host cannot drop privileges (not root, or setpriv/prlimit missing). */
    public static void checkRestrictedSupport() {
        try {
            Process pr = new ProcessBuilder(List.of("setpriv", "--reuid=65534", "--regid=65534", "--clear-groups", "prlimit", "--nproc=256", "true"))
                .redirectErrorStream(true).start();
            String out = new String(pr.getInputStream().readAllBytes());
            if (pr.waitFor() != 0) throw new IllegalStateException("EXECUTION_SANDBOX=restricted needs root plus setpriv/prlimit: " + out.strip());
        } catch (IOException e) {
            throw new IllegalStateException("EXECUTION_SANDBOX=restricted needs setpriv and prlimit (util-linux)", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(e);
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
