package dev.algomotion.execution.sandbox;

import java.nio.file.Path;
import java.util.List;

/** Test-only bridge to package-private DockerSandbox helpers. */
public final class DockerSandboxAccessShim {
    private DockerSandboxAccessShim() {}

    public static List<String> command(DockerSandbox d) { return d.command("am-sbx-test", Path.of("/tmp/work")); }

    public static Sandbox.SandboxResult parse(DockerSandbox d, String s, List<Sandbox.TestInput> t) { return d.parse(s, t, 10, ""); }
}
