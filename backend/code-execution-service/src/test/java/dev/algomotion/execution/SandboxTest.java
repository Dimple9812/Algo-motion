package dev.algomotion.execution;

import static org.assertj.core.api.Assertions.assertThat;

import dev.algomotion.execution.sandbox.DockerSandbox;
import dev.algomotion.execution.sandbox.LocalProcessSandbox;
import dev.algomotion.execution.sandbox.Sandbox;
import dev.algomotion.execution.sandbox.Sandbox.SandboxResult;
import dev.algomotion.execution.sandbox.Sandbox.TestInput;
import dev.algomotion.execution.sandbox.SourcePolicy;
import java.util.List;
import org.junit.jupiter.api.Test;

class SandboxTest {
    static final ExecutionProperties PROPS = new ExecutionProperties("local", "eclipse-temurin:21-jdk-alpine", "", 2, 20_000, 2_000, 128, 4096, 65536, 25, "");
    final LocalProcessSandbox local = new LocalProcessSandbox(PROPS);

    static String main(String body) {
        return "import java.util.*;\npublic class Main { public static void main(String[] a) throws Exception { " + body + " } }";
    }

    @Test
    void passesAndFailsTestsByComparingOutput() {
        String sum = main("Scanner s = new Scanner(System.in); System.out.println(s.nextInt() + s.nextInt());");
        SandboxResult r = local.run(sum, List.of(new TestInput("1 2", "3"), new TestInput("5 5", "11")));
        assertThat(r.compiled()).isTrue();
        assertThat(r.cases()).extracting(Sandbox.CaseOutcome::passed).containsExactly(true, false);
        assertThat(r.cases().get(1).actual().strip()).isEqualTo("10");
    }

    @Test
    void reportsCompilationErrors() {
        SandboxResult r = local.run("public class Main { int x = ; }", List.of(new TestInput("", "")));
        assertThat(r.compiled()).isFalse();
        assertThat(r.compileOutput()).contains("error");
    }

    @Test
    void killsRunawayCode() {
        SandboxResult r = local.run(main("while (true) {}"), List.of(new TestInput("", "x")));
        assertThat(r.cases().get(0).timedOut()).isTrue();
        assertThat(r.cases().get(0).error()).contains("Time limit");
        assertThat(r.cases().get(0).timeMs()).isLessThan(6_000);
    }

    @Test
    void truncatesHugeOutput() {
        SandboxResult r = local.run(main("StringBuilder b = new StringBuilder(); for (int i = 0; i < 200000; i++) b.append('x'); System.out.print(b);"), List.of(new TestInput("", "x")));
        assertThat(r.cases().get(0).actual().length()).isLessThan(4100);
        assertThat(r.cases().get(0).passed()).isFalse();
    }

    @Test
    void reportsRuntimeErrorsAndExitCodes() {
        SandboxResult r = local.run(main("int[] arr = new int[1]; System.out.println(arr[3]);"), List.of(new TestInput("", "0")));
        assertThat(r.cases().get(0).error()).contains("Exited with code 1").contains("ArrayIndexOutOfBounds");
        SandboxResult exit = local.run(main("System.exit(3);"), List.of(new TestInput("", "")));
        assertThat(exit.cases().get(0).error()).contains("code 3");
    }

    @Test
    void enforcesHeapLimit() {
        SandboxResult r = local.run(main("List<long[]> l = new ArrayList<>(); while (true) l.add(new long[1_000_000]);"), List.of(new TestInput("", "")));
        assertThat(r.cases().get(0).passed()).isFalse();
        assertThat(r.cases().get(0).error()).isNotNull();
    }

    @Test
    void normalisesTrailingWhitespace() {
        assertThat(Sandbox.normalize("1 2  \n3\n\n")).isEqualTo(Sandbox.normalize("1 2\n3"));
        assertThat(Sandbox.normalize("1\r\n2")).isEqualTo("1\n2");
    }

    @Test
    void sourcePolicyRejectsMalformedSubmissions() {
        assertThat(SourcePolicy.check("", 100)).isNotNull();
        assertThat(SourcePolicy.check("class Foo {}", 1000)).contains("public class Main");
        assertThat(SourcePolicy.check("package x;\npublic class Main {}", 1000)).contains("package");
        assertThat(SourcePolicy.check("public class Main {}" + "/".repeat(2000), 1000)).contains("exceeds");
        assertThat(SourcePolicy.check("public final class Main {}", 1000)).isNull();
    }

    @Test
    void dockerCommandIsLockedDown() {
        TestableDocker d = new TestableDocker(PROPS);
        List<String> cmd = d.cmd();
        assertThat(String.join(" ", cmd)).contains("--network none", "--read-only", "--cap-drop ALL", "--security-opt no-new-privileges",
            "--user 65534:65534", "--pids-limit", "--memory 128m", ":/work:ro");
        assertThat(String.join(" ", cmd)).doesNotContain("docker.sock").doesNotContain("JWT").doesNotContain("SECRET");
    }

    @Test
    void parsesDockerHarnessTranscript() {
        TestableDocker d = new TestableDocker(PROPS);
        String transcript = "@@CASE 0 0 41@@\n3\n\n@@STDERR@@\n\n@@CASE 1 137 2001@@\n\n@@STDERR@@\nKilled\n@@END@@\n";
        SandboxResult r = d.parseIt(transcript, List.of(new TestInput("1 2", "3"), new TestInput("x", "y")));
        assertThat(r.cases()).hasSize(2);
        assertThat(r.cases().get(0).passed()).isTrue();
        assertThat(r.cases().get(1).timedOut()).isTrue();
        SandboxResult c = d.parseIt("@@COMPILE_ERROR@@\nMain.java:1: error: ';' expected", List.of());
        assertThat(c.compiled()).isFalse();
        assertThat(c.compileOutput()).contains("expected");
    }

    /** Exposes package-private helpers without Docker being installed. */
    static class TestableDocker extends DockerSandbox {
        TestableDocker(ExecutionProperties p) { super(p); }
        List<String> cmd() { return DockerSandboxAccess.command(this); }
        SandboxResult parseIt(String s, List<TestInput> t) { return DockerSandboxAccess.parse(this, s, t); }
    }
}
