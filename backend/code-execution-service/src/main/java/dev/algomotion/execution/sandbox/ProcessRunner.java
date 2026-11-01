package dev.algomotion.execution.sandbox;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.List;
import java.util.concurrent.TimeUnit;

/** Runs an external process with a hard wall-clock timeout and bounded stdout/stderr capture. */
final class ProcessRunner {
    record Outcome(int exitCode, String stdout, String stderr, boolean timedOut, long millis) {}

    private ProcessRunner() {}

    static Outcome run(List<String> cmd, Path dir, String stdin, long timeoutMs, int maxBytes) throws IOException {
        ProcessBuilder pb = new ProcessBuilder(cmd).directory(dir.toFile());
        pb.environment().clear();
        pb.environment().put("PATH", System.getenv().getOrDefault("PATH", "/usr/bin:/bin"));
        long start = System.nanoTime();
        Process p = pb.start();
        Thread out = drain(p.getInputStream(), maxBytes);
        Thread err = drain(p.getErrorStream(), maxBytes);
        try (OutputStream in = p.getOutputStream()) {
            if (stdin != null) in.write(stdin.getBytes(StandardCharsets.UTF_8));
        } catch (IOException ignored) {
            // the program may exit or close stdin before reading all input
        }
        boolean finished;
        try {
            finished = p.waitFor(timeoutMs, TimeUnit.MILLISECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            finished = false;
        }
        if (!finished) {
            p.descendants().forEach(ProcessHandle::destroyForcibly);
            p.destroyForcibly();
        }
        try {
            out.join(2000);
            err.join(2000);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        long ms = (System.nanoTime() - start) / 1_000_000;
        return new Outcome(finished ? p.exitValue() : -1, ((Capture) out).text(), ((Capture) err).text(), !finished, ms);
    }

    private static Thread drain(InputStream in, int max) {
        Capture t = new Capture(in, max);
        t.setDaemon(true);
        t.start();
        return t;
    }

    /** Keeps the first max bytes and discards the rest (still reading, so the child never blocks on a full pipe). */
    private static final class Capture extends Thread {
        private final InputStream in;
        private final int max;
        private final ByteArrayOutputStream buf = new ByteArrayOutputStream();
        private boolean truncated;

        Capture(InputStream in, int max) {
            this.in = in;
            this.max = max;
        }

        @Override
        public void run() {
            byte[] b = new byte[8192];
            try {
                for (int n; (n = in.read(b)) > 0; ) {
                    int room = max - buf.size();
                    if (room > 0) buf.write(b, 0, Math.min(room, n));
                    if (n > room) truncated = true;
                }
            } catch (IOException ignored) {
                // stream closed when the process is killed
            }
        }

        synchronized String text() {
            String s = buf.toString(StandardCharsets.UTF_8);
            return truncated ? s + "\n…[output truncated]" : s;
        }
    }
}
