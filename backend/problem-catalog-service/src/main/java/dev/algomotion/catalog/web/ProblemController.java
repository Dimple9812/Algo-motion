package dev.algomotion.catalog.web;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import dev.algomotion.catalog.domain.Difficulty;
import dev.algomotion.catalog.domain.Problem;
import dev.algomotion.catalog.domain.ProblemRepository;
import dev.algomotion.catalog.domain.Solution;
import dev.algomotion.shared.web.ApiException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@Validated
@Tag(name = "Problems")
public class ProblemController {
    private final ProblemRepository repo;
    private final ObjectMapper mapper;

    public ProblemController(ProblemRepository repo, ObjectMapper mapper) {
        this.repo = repo;
        this.mapper = mapper;
    }

    public record ProblemSummary(String slug, String title, String topic, Difficulty difficulty, List<String> patterns, boolean visualizationSupported) {}
    public record PageResponse<T>(List<T> items, int page, int size, long totalItems, int totalPages) {}
    public record TopicCount(String id, String name, long count) {}
    public record TestCaseDto(String input, String expected) {}

    ProblemSummary summary(Problem p) {
        try {
            JsonNode d = mapper.readTree(p.getDetails());
            List<String> patterns = d.get("patterns") == null ? List.copyOf(p.getTags()) : mapper.convertValue(d.get("patterns"), mapper.getTypeFactory().constructCollectionType(List.class, String.class));
            return new ProblemSummary(p.getSlug(), p.getTitle(), p.getTopic(), p.getDifficulty(), patterns, p.isVisualizationSupported());
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
    }

    @GetMapping("/api/v1/problems")
    @Operation(summary = "Search problems with optional topic, difficulty and text filters (paginated)")
    @Transactional(readOnly = true)
    public PageResponse<ProblemSummary> list(@RequestParam(required = false) @Size(max = 60) String q,
                                             @RequestParam(required = false) @Size(max = 40) String topic,
                                             @RequestParam(required = false) Difficulty difficulty,
                                             @RequestParam(defaultValue = "0") @Min(0) int page,
                                             @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
        String like = q == null || q.isBlank() ? null : "%" + q.trim().toLowerCase().replace("%", "").replace("_", "") + "%";
        Page<Problem> r = repo.search(like, topic == null || topic.isBlank() ? null : topic, difficulty, PageRequest.of(page, size));
        return new PageResponse<>(r.getContent().stream().map(this::summary).toList(), page, size, r.getTotalElements(), Math.max(1, r.getTotalPages()));
    }

    @GetMapping("/api/v1/problems/topics")
    @Operation(summary = "Topics with problem counts")
    public ResponseEntity<List<TopicCount>> topics() {
        List<TopicCount> t = repo.topicCounts().stream().map(r -> new TopicCount((String) r[0], ((String) r[0]).replace('-', ' '), (Long) r[1])).toList();
        return ResponseEntity.ok().cacheControl(CacheControl.maxAge(java.time.Duration.ofMinutes(5))).body(t);
    }

    @GetMapping("/api/v1/problems/{slug}")
    @Operation(summary = "Full problem with approaches and sample tests")
    @Transactional(readOnly = true)
    public ObjectNode detail(@PathVariable @Size(max = 80) String slug) throws JsonProcessingException {
        Problem p = repo.findBySlug(slug).orElseThrow(() -> ApiException.notFound("Problem"));
        ObjectNode out = mapper.valueToTree(summary(p));
        ObjectNode d = (ObjectNode) mapper.readTree(p.getDetails());
        d.remove("patterns");
        out.setAll(d);
        out.put("statement", p.getStatement());
        out.put("inputFormat", p.getInputFormat());
        out.put("outputFormat", p.getOutputFormat());
        out.put("starterCode", p.getStarterCode());
        out.put("source", p.getSource());
        ArrayNode approaches = out.putArray("approaches");
        for (Solution s : p.getSolutions().stream().sorted(Comparator.comparing(Solution::getKind)).toList()) approaches.add(mapper.readTree(s.getPayload()));
        out.set("tests", mapper.valueToTree(p.getTests().stream().filter(t -> t.isSample()).map(t -> new TestCaseDto(t.getInput(), t.getExpected())).toList()));
        return out;
    }

    // ---------------- internal (service-to-service, protected by X-Internal-Token; not routed by the gateway)

    @GetMapping("/internal/problems/{slug}/tests")
    @Transactional(readOnly = true)
    public List<TestCaseDto> allTests(@PathVariable String slug) {
        Problem p = repo.findBySlug(slug).orElseThrow(() -> ApiException.notFound("Problem"));
        return p.getTests().stream().map(t -> new TestCaseDto(t.getInput(), t.getExpected())).toList();
    }

    public record IndexEntry(String slug, String title, String topic, String statement, List<String> patterns) {}

    @GetMapping("/internal/problems/index")
    @Transactional(readOnly = true)
    public List<IndexEntry> index() {
        return repo.findAll().stream().map(p -> new IndexEntry(p.getSlug(), p.getTitle(), p.getTopic(), p.getStatement(), summary(p).patterns())).toList();
    }

    /** Full problem including every test case (internal callers only). */
    @GetMapping("/internal/problems/{slug}/full")
    @Transactional(readOnly = true)
    public ObjectNode full(@PathVariable String slug) throws JsonProcessingException {
        ObjectNode d = detail(slug);
        d.set("tests", mapper.valueToTree(allTests(slug)));
        return d;
    }

    @GetMapping("/internal/problems/summaries")
    @Transactional(readOnly = true)
    public List<ProblemSummary> summaries(@RequestParam String slugs) {
        List<String> list = Arrays.stream(slugs.split(",")).map(String::trim).filter(s -> !s.isEmpty()).limit(200).toList();
        return repo.findBySlugIn(list).stream().map(this::summary).toList();
    }
}
