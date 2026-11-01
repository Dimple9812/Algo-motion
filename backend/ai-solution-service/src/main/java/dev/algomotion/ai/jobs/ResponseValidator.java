package dev.algomotion.ai.jobs;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;

/**
 * Validates and normalises a model response before anything is stored or shown.
 * Malformed JSON, missing fields, oversized content and unsupported visualizations are rejected or stripped.
 */
@Component
public class ResponseValidator {
    public record Validated(String problemSummary, List<String> topics, List<String> ambiguities, List<ObjectNode> approaches) {}

    public static class InvalidResponse extends Exception {
        public InvalidResponse(String m) { super(m); }
    }

    /** Built-in deterministic trace adapters the frontend can replay, with the input keys each accepts. */
    static final Map<String, Set<String>> ADAPTERS = Map.ofEntries(
        Map.entry("linear-search", Set.of("values", "target")), Map.entry("binary-search", Set.of("values", "target")),
        Map.entry("bubble-sort", Set.of("values")), Map.entry("insertion-sort", Set.of("values")), Map.entry("merge-sort", Set.of("values")),
        Map.entry("quick-sort", Set.of("values")), Map.entry("pattern-two-sum", Set.of("values", "target")),
        Map.entry("pattern-two-pointers", Set.of("values", "target")), Map.entry("pattern-sliding-window", Set.of("s")),
        Map.entry("pattern-fixed-window", Set.of("values", "k")), Map.entry("pattern-prefix-sums", Set.of("values", "l", "r")),
        Map.entry("dp-kadane", Set.of("values")), Map.entry("dp-climbing-stairs", Set.of("n")), Map.entry("dp-coin-change", Set.of("coins", "amount")),
        Map.entry("dp-lcs", Set.of("a", "b")), Map.entry("stack-balanced-brackets", Set.of("expr")), Map.entry("ll-reverse", Set.of("values")),
        Map.entry("graph-bfs", Set.of("edges", "directed", "start")), Map.entry("graph-dijkstra", Set.of("edges", "directed", "start")),
        // adapters also used by catalog reference solutions
        Map.entry("array-second-largest", Set.of("values")), Map.entry("array-rotate-right", Set.of("values", "k")),
        Map.entry("search-rotated", Set.of("values", "target")), Map.entry("counting-sort", Set.of("values")),
        Map.entry("tree-inorder", Set.of("tree")), Map.entry("tree-height", Set.of("tree")), Map.entry("bst-search", Set.of("values", "key")),
        Map.entry("pattern-kth-largest", Set.of("values", "k")), Map.entry("heap-extract", Set.of("kind", "values")),
        Map.entry("trie-insert", Set.of("words")), Map.entry("trie-prefix", Set.of("words", "query")), Map.entry("stack-postfix-eval", Set.of("expr")),
        Map.entry("stack-next-greater", Set.of("values")), Map.entry("pattern-monotonic-queue", Set.of("values", "k")),
        Map.entry("queue-operations", Set.of("variant", "script", "capacity")), Map.entry("ll-detect-cycle", Set.of("values", "cyclePos")),
        Map.entry("pattern-number-of-islands", Set.of("grid")), Map.entry("graph-topological-sort", Set.of("edges", "directed", "start")),
        Map.entry("graph-undirected-cycle", Set.of("edges", "directed", "start")), Map.entry("graph-kruskal", Set.of("edges", "directed", "start")),
        Map.entry("union-find", Set.of("script")), Map.entry("pattern-binary-search-answer", Set.of("values", "h")), Map.entry("pattern-merge-intervals", Set.of("intervals")),
        Map.entry("rec-factorial", Set.of("n")), Map.entry("rec-subsets", Set.of("values")), Map.entry("rec-n-queens", Set.of("n")),
        Map.entry("rec-combination-sum", Set.of("candidates", "target")), Map.entry("dp-edit-distance", Set.of("a", "b")),
        Map.entry("dp-knapsack", Set.of("weights", "values", "capacity")), Map.entry("dp-fib-memo", Set.of("n", "memo")));

    private final ObjectMapper mapper;

    public ResponseValidator(ObjectMapper mapper) { this.mapper = mapper; }

    public Validated validate(String raw) throws InvalidResponse {
        if (raw == null || raw.isBlank()) throw new InvalidResponse("The model returned an empty response");
        String s = raw.strip();
        if (s.startsWith("```")) s = s.replaceFirst("^```(json)?", "").replaceFirst("```\\s*$", "").strip();
        if (s.length() > 250_000) throw new InvalidResponse("The model response is too large");
        JsonNode root;
        try {
            root = mapper.readTree(s);
        } catch (Exception e) {
            throw new InvalidResponse("The model returned malformed JSON");
        }
        if (!root.isObject()) throw new InvalidResponse("The model response is not a JSON object");
        JsonNode approaches = root.path("approaches");
        if (!approaches.isArray() || approaches.isEmpty()) throw new InvalidResponse("The model response contains no approaches");
        List<ObjectNode> out = new ArrayList<>();
        for (JsonNode a : approaches) {
            if (out.size() == 3) break;
            out.add(approach(a));
        }
        return new Validated(text(root, "problemSummary", 2000, false), strings(root.path("topics"), 8, 40), strings(root.path("ambiguities"), 8, 400), out);
    }

    ObjectNode approach(JsonNode a) throws InvalidResponse {
        if (!a.isObject()) throw new InvalidResponse("An approach is not an object");
        ObjectNode o = mapper.createObjectNode();
        o.put("approachName", text(a, "approachName", 120, true));
        String code = text(a, "javaCode", 65_536, true);
        if (!code.contains("class Main")) throw new InvalidResponse("Generated Java code does not declare class Main");
        o.put("javaCode", code);
        o.put("intuition", text(a, "intuition", 4000, false));
        o.put("timeComplexity", text(a, "timeComplexity", 80, true));
        o.put("spaceComplexity", text(a, "spaceComplexity", 80, true));
        o.put("correctnessExplanation", text(a, "correctnessExplanation", 4000, false));
        o.set("assumptions", mapper.valueToTree(strings(a.path("assumptions"), 10, 400)));
        o.set("algorithmSteps", mapper.valueToTree(strings(a.path("algorithmSteps"), 20, 400)));
        o.set("pseudocode", mapper.valueToTree(strings(a.path("pseudocode"), 60, 200)));
        o.set("edgeCases", mapper.valueToTree(strings(a.path("edgeCases"), 12, 300)));
        o.set("limitations", mapper.valueToTree(strings(a.path("limitations"), 8, 400)));
        ArrayNode tests = o.putArray("testCases");
        for (JsonNode t : a.path("testCases")) {
            if (tests.size() == 10) break;
            if (!t.path("input").isTextual() || !t.path("expected").isTextual()) continue;
            if (t.get("input").asText().length() > 2000 || t.get("expected").asText().length() > 2000) continue;
            tests.addObject().put("input", t.get("input").asText()).put("expected", t.get("expected").asText());
        }
        JsonNode viz = visualization(a.path("visualization"));
        o.set("visualization", viz);
        o.put("visualizationSupported", viz != null && !viz.isNull());
        return o;
    }

    /** Accepts only a known adapter id with whitelisted, size-limited data. Rendering code is never accepted from the model. */
    JsonNode visualization(JsonNode v) {
        if (v == null || !v.isObject()) return mapper.nullNode();
        String alg = v.path("algorithm").asText("");
        Set<String> keys = ADAPTERS.get(alg);
        JsonNode input = v.path("input");
        if (keys == null || !input.isObject() || input.size() > keys.size()) return mapper.nullNode();
        var it = input.fieldNames();
        while (it.hasNext()) if (!keys.contains(it.next())) return mapper.nullNode();
        for (JsonNode val : input) {
            if (val.isArray() && (val.size() > 24 || !allScalar(val))) return mapper.nullNode();
            if (val.isTextual() && val.asText().length() > 300) return mapper.nullNode();
            if (val.isObject()) return mapper.nullNode();
        }
        ObjectNode ok = mapper.createObjectNode();
        ok.put("algorithm", alg);
        ok.set("input", input);
        return ok;
    }

    private static boolean allScalar(JsonNode arr) {
        for (JsonNode x : arr) if (!(x.isNumber() || x.isTextual())) return false;
        return true;
    }

    private static String text(JsonNode n, String field, int max, boolean required) throws InvalidResponse {
        JsonNode v = n.path(field);
        if (!v.isTextual() || v.asText().isBlank()) {
            if (required) throw new InvalidResponse("Missing field: " + field);
            return "";
        }
        String s = v.asText();
        if (s.length() > max) {
            if (required && field.equals("javaCode")) throw new InvalidResponse("Generated code is too long");
            return s.substring(0, max);
        }
        return s;
    }

    private static List<String> strings(JsonNode arr, int maxItems, int maxLen) {
        List<String> out = new ArrayList<>();
        if (!arr.isArray()) return out;
        for (JsonNode x : arr) {
            if (out.size() == maxItems) break;
            if (x.isTextual() && !x.asText().isBlank()) out.add(x.asText().length() > maxLen ? x.asText().substring(0, maxLen) : x.asText());
        }
        return out;
    }
}
