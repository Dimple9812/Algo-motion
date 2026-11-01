package dev.algomotion.execution.sandbox;

import dev.algomotion.execution.ExecutionProperties;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermissions;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Production runner: each submission runs in a fresh, throwaway container with
 * no network, a read-only root filesystem, a small tmpfs, CPU/memory/pid limits, all capabilities dropped,
 * no-new-privileges, and a non-root uid. The container receives only the source and test inputs —
 * no secrets, no Docker socket. A harness script inside the container compiles once and runs each test
 * with its own timeout; the whole container is killed if the overall deadline passes.
 */
public class DockerSandbox implements Sandbox {
    static final String HARNESS = """
        set -u
        cp /work/Main.java /tmp/Main.java
        cd /tmp
        if ! javac -J-Xmx192m -nowarn -encoding UTF-8 Main.java 2> compile.txt; then
          echo "@@COMPILE_ERROR@@"; head -c 8000 compile.txt; exit 0
        fi
        i=0
        while [ -f /work/in_$i.txt ]; do
          s=$(date +%s%N)
          timeout -s KILL %TEST_TIMEOUT%s java -Xmx%HEAP%m -Xss64m -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -cp /tmp Main < /work/in_$i.txt > out.txt 2> err.txt
          code=$?
          e=$(date +%s%N)
          echo "@@CASE $i $code $(( (e - s) / 1000000 ))@@"
          head -c %MAX_OUT% out.txt; echo
          echo "@@STDERR@@"; head -c 2000 err.txt; echo
          i=$((i+1))
        done
        echo "@@END@@"
        """;

    private final ExecutionProperties p;

    public DockerSandbox(ExecutionProperties p) { this.p = p; }

    @Override
    public String name() { return "docker"; }

    List<String> command(String containerName, Path work) {
        return List.of("docker", "run", "--rm", "--name", containerName,
            "--network", "none", "--read-only", "--tmpfs", "/tmp:rw,exec,size=64m",
            "--memory", p.memoryMb() + "m", "--memory-swap", p.memoryMb() + "m", "--cpus", "1", "--pids-limit", "128",
            "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "--user", "65534:65534",
            "-v", work.toAbsolutePath() + ":/work:ro", p.dockerImage(), "sh", "-c",
            HARNESS.replace("%TEST_TIMEOUT%", String.valueOf(Math.max(1, p.testTimeoutMs() / 1000)))
                .replace("%HEAP%", String.valueOf(p.memoryMb() - 64)).replace("%MAX_OUT%", String.valueOf(p.maxOutputBytes())));
    }

    @Override
    public SandboxResult run(String source, List<TestInput> tests) {
        Path dir = null;
        String name = "am-sbx-" + UUID.randomUUID();
        try {
            Path base = Path.of(p.workDir() == null || p.workDir().isBlank() ? System.getProperty("java.io.tmpdir") : p.workDir());
            Files.createDirectories(base);
            dir = Files.createTempDirectory(base, "am-docker-", PosixFilePermissions.asFileAttribute(PosixFilePermissions.fromString("rwxr-xr-x")));
            Files.writeString(dir.resolve("Main.java"), source);
            for (int i = 0; i < tests.size(); i++) Files.writeString(dir.resolve("in_" + i + ".txt"), tests.get(i).input() + "\n");
            long deadline = p.compileTimeoutMs() + tests.size() * (p.testTimeoutMs() + 1500L) + 10_000;
            ProcessRunner.Outcome o = ProcessRunner.run(command(name, dir), dir, null, deadline, p.maxOutputBytes() * (tests.size() + 2));
            if (o.timedOut()) {
                new ProcessBuilder("docker", "kill", name).start();
                return new SandboxResult(false, null, List.of(), o.millis(), "Sandbox deadline exceeded");
            }
            return parse(o.stdout(), tests, o.millis(), o.stderr());
        } catch (IOException e) {
            return new SandboxResult(false, null, List.of(), 0, "Sandbox unavailable: " + e.getMessage());
        } finally {
            LocalProcessSandbox.deleteQuietly(dir);
        }
    }

    /** Parses the harness transcript. Package-private for unit testing without Docker. */
    SandboxResult parse(String out, List<TestInput> tests, long ms, String dockerErr) {
        if (out.startsWith("@@COMPILE_ERROR@@")) return SandboxResult.compileError(out.substring("@@COMPILE_ERROR@@".length()).strip(), ms);
        if (!out.contains("@@END@@") && !out.contains("@@CASE")) return new SandboxResult(false, null, List.of(), ms, "Sandbox failed to start: " + Sandbox.truncate(dockerErr, 500));
        List<CaseOutcome> cases = new ArrayList<>();
        String[] parts = out.split("@@CASE ");
        for (int k = 1; k < parts.length && cases.size() < tests.size(); k++) {
            String part = parts[k];
            int hdrEnd = part.indexOf("@@");
            String[] hdr = part.substring(0, hdrEnd).trim().split(" ");
            int code = Integer.parseInt(hdr[1]);
            long t = Long.parseLong(hdr[2]);
            String body = part.substring(hdrEnd + 2);
            int se = body.indexOf("@@STDERR@@");
            String stdout = body.substring(0, se).replaceFirst("^\\n", "");
            String stderr = body.substring(se + "@@STDERR@@".length()).replace("@@END@@", "").strip();
            boolean timedOut = code == 137;
            String err = timedOut ? "Time or memory limit exceeded" : code != 0 ? "Exited with code " + code + "\n" + stderr : null;
            TestInput ti = tests.get(cases.size());
            boolean passed = err == null && Sandbox.normalize(stdout).equals(Sandbox.normalize(ti.expected()));
            cases.add(new CaseOutcome(Sandbox.truncate(stdout, 4000), passed, t, err, timedOut));
        }
        return new SandboxResult(true, null, cases, ms, null);
    }
}
