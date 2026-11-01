package dev.algomotion.execution;

import dev.algomotion.execution.sandbox.DockerSandbox;
import dev.algomotion.execution.sandbox.DockerSandboxAccessShim;
import dev.algomotion.execution.sandbox.Sandbox;
import java.util.List;

final class DockerSandboxAccess {
    private DockerSandboxAccess() {}

    static List<String> command(DockerSandbox d) { return DockerSandboxAccessShim.command(d); }

    static Sandbox.SandboxResult parse(DockerSandbox d, String s, List<Sandbox.TestInput> t) { return DockerSandboxAccessShim.parse(d, s, t); }
}
