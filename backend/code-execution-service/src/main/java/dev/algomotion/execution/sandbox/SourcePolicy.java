package dev.algomotion.execution.sandbox;

import java.nio.charset.StandardCharsets;
import java.util.regex.Pattern;

/**
 * Cheap pre-checks before anything is compiled. These are NOT the security boundary (the sandbox is);
 * they just reject obviously malformed submissions early with a clear message.
 */
public final class SourcePolicy {
    private static final Pattern MAIN = Pattern.compile("public\\s+(final\\s+)?class\\s+Main\\b");
    private static final Pattern PACKAGE = Pattern.compile("^\\s*package\\s", Pattern.MULTILINE);

    private SourcePolicy() {}

    public static String check(String source, int maxBytes) {
        if (source == null || source.isBlank()) return "Source code is empty";
        if (source.getBytes(StandardCharsets.UTF_8).length > maxBytes) return "Source code exceeds " + maxBytes / 1024 + " KB";
        if (!MAIN.matcher(source).find()) return "Code must declare `public class Main` (the test harness runs Main)";
        if (PACKAGE.matcher(source).find()) return "Remove the package declaration";
        return null;
    }
}
