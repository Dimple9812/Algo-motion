package dev.algomotion.ai.provider;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import dev.algomotion.ai.AiProperties;
import dev.algomotion.shared.security.InternalAuthProperties;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Deterministic fallback used when no model is configured. It does NOT generate code: it matches the submitted text
 * against the curated catalog (keyword overlap) and returns that problem's reference solutions, clearly labelled.
 * If nothing matches confidently it fails honestly instead of guessing.
 */
public class CatalogFallbackProvider implements LlmProvider {
    private static final Set<String> STOP = Set.of("the", "a", "an", "of", "and", "or", "to", "in", "is", "are", "be", "for", "each", "every", "given", "return",
        "print", "that", "with", "on", "it", "if", "by", "as", "at", "you", "your", "from", "this", "line", "lines", "integer", "integers", "number", "numbers", "array", "value", "values");
    static final double MIN_SCORE = 0.28;
    static final double MIN_MARGIN = 0.08;

    private final RestClient catalog;
    private final ObjectMapper mapper;

    public CatalogFallbackProvider(AiProperties p, InternalAuthProperties internal, ObjectMapper mapper) {
        SimpleClientHttpRequestFactory f = new SimpleClientHttpRequestFactory();
        f.setConnectTimeout(2000);
        f.setReadTimeout(5000);
        this.catalog = RestClient.builder().baseUrl(p.catalogUrl()).requestFactory(f)
            .defaultHeader(InternalAuthProperties.HEADER, internal.token() == null ? "" : internal.token()).build();
        this.mapper = mapper;
    }

    @Override
    public String name() { return "fallback"; }

    static Set<String> words(String s) {
        return Arrays.stream(s.toLowerCase(Locale.ROOT).split("[^a-z0-9]+")).filter(w -> w.length() > 2 && !STOP.contains(w))
            .map(w -> w.endsWith("s") && w.length() > 4 ? w.substring(0, w.length() - 1) : w).collect(Collectors.toSet());
    }

    /** Overlap between the query and a catalog entry. Title and slug words (slugs carry the classic problem names) weigh triple. */
    static double score(Set<String> q, String slug, String title, String statement) {
        Set<String> t = words(title);
        t.addAll(words(slug.replace('-', ' ')));
        Set<String> s = words(statement);
        Set<String> all = new HashSet<>(s);
        all.addAll(t);
        if (q.isEmpty() || all.isEmpty()) return 0;
        long hit = q.stream().filter(all::contains).count();
        long titleHit = q.stream().filter(t::contains).count();
        return (hit + 2.0 * titleHit) / (q.size() + Math.min(all.size(), 25));
    }

    @Override
    public String generate(String problemText) throws ProviderException {
        try {
            Set<String> q = words(problemText);
            JsonNode index = catalog.get().uri("/internal/problems/index").retrieve().body(JsonNode.class);
            JsonNode best = null;
            double bestScore = 0, second = 0;
            for (JsonNode e : index) {
                double sc = score(q, e.get("slug").asText(), e.get("title").asText(), e.get("statement").asText());
                if (sc > bestScore) {
                    second = bestScore;
                    bestScore = sc;
                    best = e;
                } else if (sc > second) second = sc;
            }
            if (best == null || bestScore < MIN_SCORE || bestScore - second < MIN_MARGIN)
                throw new ProviderException("No AI provider is configured and this question does not match a problem in the built-in catalog closely enough. Configure AI_PROVIDER to generate new solutions.", false);
            JsonNode full = catalog.get().uri("/internal/problems/{slug}/full", best.get("slug").asText()).retrieve().body(JsonNode.class);
            return toSchema(full).toString();
        } catch (RestClientException e) {
            throw new ProviderException("Catalog unavailable for fallback matching", false);
        }
    }

    ObjectNode toSchema(JsonNode p) {
        ObjectNode out = mapper.createObjectNode();
        out.put("problemSummary", "Matched built-in catalog problem \"" + p.get("title").asText() + "\" (" + p.get("slug").asText() + ").");
        out.set("topics", mapper.createArrayNode().add(p.get("topic").asText()));
        out.set("ambiguities", mapper.createArrayNode().add("Deterministic fallback: no language model was used. These are the catalog's reference solutions for the closest matching problem; check that it is really the same question and input format."));
        ArrayNode approaches = out.putArray("approaches");
        List<JsonNode> tests = mapper.convertValue(p.get("tests"), mapper.getTypeFactory().constructCollectionType(List.class, JsonNode.class));
        for (JsonNode a : p.get("approaches")) {
            ObjectNode x = approaches.addObject();
            x.put("approachName", ("BRUTE_FORCE".equals(a.get("kind").asText()) ? "Brute force: " : "Optimized: ") + a.get("title").asText() + " (catalog reference)");
            x.set("assumptions", mapper.createArrayNode().add("Input format: " + p.get("inputFormat").asText()));
            x.put("intuition", a.get("intuition").asText());
            x.set("algorithmSteps", a.get("steps"));
            x.set("pseudocode", a.get("pseudocode"));
            x.put("javaCode", a.get("java").asText());
            x.put("timeComplexity", a.get("time").asText());
            x.put("spaceComplexity", a.get("space").asText());
            x.put("correctnessExplanation", a.get("correctness").asText());
            x.set("edgeCases", p.get("edgeCases"));
            ArrayNode tc = x.putArray("testCases");
            tests.stream().limit(6).forEach(t -> tc.addObject().put("input", t.get("input").asText()).put("expected", t.get("expected").asText()));
            x.set("visualization", a.get("visualization"));
            ArrayNode lim = x.putArray("limitations");
            String l = a.get("limitations").asText("");
            if (!l.isBlank() && !l.equals("—")) lim.add(l);
        }
        return out;
    }
}
