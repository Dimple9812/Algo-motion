package dev.algomotion.catalog.seed;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import dev.algomotion.catalog.domain.Difficulty;
import dev.algomotion.catalog.domain.Problem;
import dev.algomotion.catalog.domain.ProblemRepository;
import dev.algomotion.catalog.domain.Solution;
import dev.algomotion.catalog.domain.TestCase;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Loads the canonical catalog (content/problems.json, packaged as seed/problems.json) at startup.
 * Idempotent: a problem is rewritten only when its content hash changes.
 */
@Component
public class ProblemSeeder implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(ProblemSeeder.class);
    private static final int SAMPLE_TESTS = 2;
    private final ProblemRepository repo;
    private final ObjectMapper mapper;

    public ProblemSeeder(ProblemRepository repo, ObjectMapper mapper) {
        this.repo = repo;
        this.mapper = mapper;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) throws IOException {
        int created = 0, updated = 0;
        try (InputStream in = new ClassPathResource("seed/problems.json").getInputStream()) {
            for (JsonNode n : mapper.readTree(in)) {
                String hash = sha256(n.toString());
                String slug = n.get("slug").asText();
                Problem p = repo.findBySlug(slug).orElse(null);
                if (p != null && hash.equals(p.getContentHash())) continue;
                if (p == null) {
                    p = new Problem(UUID.randomUUID(), slug);
                    created++;
                } else updated++;
                apply(p, n, hash);
                repo.save(p);
            }
        }
        log.info("Problem catalog seeded: {} created, {} updated, {} total", created, updated, repo.count());
    }

    void apply(Problem p, JsonNode n, String hash) {
        ObjectNode details = mapper.createObjectNode();
        for (String f : new String[] {"patterns", "constraints", "examples", "edgeCases", "hints", "related"}) details.set(f, n.get(f));
        p.update(n.get("title").asText(), n.get("topic").asText(), Difficulty.valueOf(n.get("difficulty").asText()),
            n.get("visualizationSupported").asBoolean(), n.get("statement").asText(), n.get("inputFormat").asText(),
            n.get("outputFormat").asText(), n.get("starterCode").asText(), n.get("source").asText(), details.toString(), hash);
        p.getTags().clear();
        n.get("patterns").forEach(t -> p.getTags().add(t.asText()));
        p.getTests().clear();
        int i = 0;
        for (JsonNode t : n.get("tests")) {
            p.getTests().add(new TestCase(p, i, t.get("input").asText(), t.get("expected").asText(), i < SAMPLE_TESTS));
            i++;
        }
        p.getSolutions().clear();
        for (JsonNode a : n.get("approaches")) p.getSolutions().add(new Solution(p, a.get("kind").asText(), a.toString()));
    }

    static String sha256(String s) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
