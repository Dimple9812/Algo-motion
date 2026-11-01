package dev.algomotion.ai.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import dev.algomotion.ai.domain.Entities.SessionRepository;
import dev.algomotion.ai.domain.Entities.SolutionApproach;
import dev.algomotion.ai.domain.Entities.SolutionSession;
import dev.algomotion.ai.domain.Entities.Status;
import dev.algomotion.ai.extract.TextExtractor;
import dev.algomotion.ai.jobs.Dispatch;
import dev.algomotion.ai.jobs.SolutionWorker;
import dev.algomotion.ai.provider.LlmProvider;
import dev.algomotion.shared.security.CurrentUser;
import dev.algomotion.shared.web.ApiException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/solutions")
@Tag(name = "AI solver")
public class SolutionController {
    private final SessionRepository sessions;
    private final Dispatch dispatch;
    private final LlmProvider provider;
    private final TextExtractor extractor;
    private final SolutionWorker worker;
    private final ObjectMapper mapper;

    public SolutionController(SessionRepository sessions, Dispatch dispatch, LlmProvider provider, TextExtractor extractor, SolutionWorker worker, ObjectMapper mapper) {
        this.sessions = sessions;
        this.dispatch = dispatch;
        this.provider = provider;
        this.extractor = extractor;
        this.worker = worker;
        this.mapper = mapper;
    }

    public record CreateRequest(@NotBlank @Size(min = 20, max = 8000) String problemText) {}

    public record SessionDto(UUID id, String status, String problemText, String provider, JsonNode topics, JsonNode ambiguities, List<JsonNode> approaches,
                             String error, Instant createdAt) {}

    SessionDto dto(SolutionSession s) {
        try {
            List<JsonNode> aps = new java.util.ArrayList<>();
            for (SolutionApproach a : s.getApproaches()) {
                ObjectNode n = (ObjectNode) mapper.readTree(a.getPayload());
                n.put("verdict", a.getVerdict().name());
                n.set("execution", a.getExecution() == null ? mapper.nullNode() : mapper.readTree(a.getExecution()));
                aps.add(n);
            }
            return new SessionDto(s.getId(), s.getStatus().name(), s.getProblemText(), s.getProvider(), mapper.readTree(s.getTopics()),
                mapper.readTree(s.getAmbiguities()), aps, s.getError(), s.getCreatedAt());
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }

    private SolutionSession owned(UUID id) {
        SolutionSession s = sessions.findById(id).orElseThrow(() -> ApiException.notFound("Solution session"));
        if (s.getUserId() != null && !s.getUserId().equals(CurrentUser.idOrNull())) throw ApiException.notFound("Solution session");
        return s;
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Start asynchronous solution generation for a problem statement")
    @Transactional
    public ResponseEntity<SessionDto> create(@Valid @RequestBody CreateRequest r) {
        SolutionSession s = sessions.save(new SolutionSession(CurrentUser.idOrNull(), r.problemText().strip(), provider.name()));
        dispatch.requestGeneration(s.getId());
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(dto(s));
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public SessionDto get(@PathVariable UUID id) { return dto(owned(id)); }

    @GetMapping("/{id}/status")
    @Transactional(readOnly = true)
    public Map<String, String> status(@PathVariable UUID id) {
        SolutionSession s = owned(id);
        return Map.of("id", s.getId().toString(), "status", s.getStatus().name());
    }

    /** Re-checks stored execution results (e.g. after a missed event). */
    @PostMapping("/{id}/validate")
    public SessionDto validate(@PathVariable UUID id) {
        SolutionSession s = owned(id);
        if (s.getStatus() == Status.TESTING) s.getApproaches().stream().filter(a -> a.getExecutionId() != null).forEach(a -> worker.onExecutionCompleted(a.getExecutionId()));
        return get(id);
    }

    @PostMapping(path = "/extract", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Extract problem text from a .txt/.md/.pdf/image upload for user review")
    public TextExtractor.Extracted extract(@RequestParam("file") MultipartFile file) throws IOException {
        return extractor.extract(file);
    }
}
