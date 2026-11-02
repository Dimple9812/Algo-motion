package dev.algomotion.execution.sandbox;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import dev.algomotion.execution.ExecutionProperties;
import dev.algomotion.execution.sandbox.Sandbox.SandboxResult;
import dev.algomotion.execution.sandbox.Sandbox.TestInput;
import java.util.List;
import org.junit.jupiter.api.Test;

class RestrictedSandboxTest {
    static final ExecutionProperties PROPS = new ExecutionProperties("restricted", "", "", 2, 20_000, 5_000, 128, 4096, 65536, 25, "");
    final LocalProcessSandbox restricted = new LocalProcessSandbox(PROPS, true);

    static String main(String body) {
        return "import java.util.*;\npublic class Main { public static void main(String[] a) throws Exception { " + body + " } }";
    }

    @Test
    void dropsPrivilegesAndEnablesSecurityManager() {
        assertThat(restricted.name()).isEqualTo("local-restricted");
        assertThat(restricted.compileCommand()).startsWith("setpriv", "--reuid=65534", "--regid=65534", "--clear-groups", "--no-new-privs")
            .contains("--inh-caps=-all", "--bounding-set=-all", "prlimit", "--nproc=256").endsWith("Main.java");
        assertThat(restricted.runCommand()).startsWith("setpriv").contains("-Djava.security.manager=default", "-Xmx128m").endsWith("-cp", ".", "Main");
        assertThat(new LocalProcessSandbox(PROPS).runCommand()).startsWith("java").doesNotContain("-Djava.security.manager=default");
    }

    @Test
    void stripsTheSecurityManagerBanner() {
        String err = """
            WARNING: A command line option has enabled the Security Manager and deprecated it for removal
            WARNING: The Security Manager is deprecated and will be removed in a future release
            Exception in thread "main" java.lang.ArithmeticException: / by zero""";
        assertThat(LocalProcessSandbox.stripSecurityManagerWarning(err)).isEqualTo("Exception in thread \"main\" java.lang.ArithmeticException: / by zero");
    }

    /** End-to-end: needs root plus setpriv/prlimit (true in the deployment image; usually false on CI runners). */
    @Test
    void blocksNetworkFilesProcessesAndEnvironment() {
        assumeTrue(canDropPrivileges(), "requires root + setpriv");
        SandboxResult ok = restricted.run(main("Scanner s = new Scanner(System.in); System.out.println(s.nextInt() * 2);"), List.of(new TestInput("21", "42")));
        assertThat(ok.cases()).extracting(Sandbox.CaseOutcome::passed).containsExactly(true);

        for (String attack : List.of(
            "new java.net.Socket(\"1.1.1.1\", 80);",
            "java.nio.file.Files.readString(java.nio.file.Path.of(\"/etc/passwd\"));",
            "new ProcessBuilder(\"id\").start();",
            "System.getenv();",
            "System.setSecurityManager(null);")) {
            SandboxResult r = restricted.run(main(attack + " System.out.println(\"ESCAPED\");"), List.of(new TestInput("", "ESCAPED")));
            assertThat(r.cases().get(0).passed()).as(attack).isFalse();
            assertThat(r.cases().get(0).error()).as(attack).contains("AccessControlException").doesNotContain("WARNING: A command line option");
        }
    }

    static boolean canDropPrivileges() {
        try {
            LocalProcessSandbox.checkRestrictedSupport();
            return true;
        } catch (IllegalStateException e) {
            return false;
        }
    }
}
