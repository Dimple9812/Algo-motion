package dev.algomotion.execution.web;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.algomotion.execution.ExecutionProperties;
import dev.algomotion.execution.domain.ExecutionJob;
import dev.algomotion.execution.domain.ExecutionJobRepository;
import dev.algomotion.execution.jobs.Dispatch;
import dev.algomotion.execution.sandbox.Sandbox;
import dev.algomotion.execution.sandbox.Sandbox.TestInput;
import dev.algomotion.execution.sandbox.SourcePolicy;
import dev.algomotion.shared.security.CurrentUser;
import dev.algomotion.shared.security.InternalAuthProperties;
import dev.algomotion.shared.web.ApiException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@RestController
@Tag(name = "Code execution")
public class ExecutionController {
    private final ExecutionJobRepository jobs;
    private final Dispatch dispatch;
    private final Sandbox sandbox;
    private final ExecutionProperties props;
    private final ObjectMapper mapper;
    private final RestClient catalog;

    public ExecutionController(ExecutionJobRepository jobs, Dispatch dispatch, Sandbox sandbox, ExecutionProperties props, ObjectMapper mapper, InternalAuthProperties internal) {
        this.jobs = jobs;
        this.dispatch = dispatch;
        this.sandbox = sandbox;
        this.props = props;
        this.mapper = mapper;
        SimpleClientHttpRequestFactory f = new SimpleClientHttpRequestFactory();
        f.setConnectTimeout(2000);
        f.setReadTimeout(3000);
        this.catalog = RestClient.builder().baseUrl(props.catalogUrl()).requestFactory(f)
            .defaultHeader(InternalAuthProperties.HEADER, Objects.requireNonNullElse(internal.token(), "")).build();
    }

    public record TestCaseDto(@Size(max = 10_000) String input, @Size(max = 10_000) String expected) {}

    public record SubmitRequest(@NotBlank @Pattern(regexp = "java") String language, @NotBlank @Size(max = 65_536) String sourceCode,
                                @Pattern(regexp = "^[a-z0-9-]{1,80}$") String problemSlug, @Size(max = 25) List<@Valid TestCaseDto> tests) {}

    public record InternalSubmit(@NotBlank @Size(max = 65_536) String sourceCode, @Size(min = 1, max = 25) List<@Valid TestCaseDto> tests,
                                 @NotBlank @Pattern(regexp = "AI_SOLUTION") String origin, @NotBlank @Size(max = 80) String originRef) {}

    public record ResultDto(int index, String input, String expected, String actual, boolean passed, int timeMs, String error) {}

    public record ExecutionDto(UUID id, String status, String compileOutput, String stderr, List<ResultDto> results, int passed, int total,
                               Integer runtimeMs, String message, String sandbox) {
        static ExecutionDto of(ExecutionJob j) {
            return new ExecutionDto(j.getId(), j.getStatus().name(), j.getCompileOutput(), j.getStderr(),
                j.getResults().stream().map(r -> new ResultDto(r.getIdx(), r.getInput(), r.getExpected(), r.getActual(), r.isPassed(), r.getTimeMs(), r.getError())).toList(),
                j.getPassed(), j.getTotal(), j.getRuntimeMs(), j.getMessage(), j.getSandbox());
        }
    }

    private List<TestInput> testsFor(SubmitRequest r) {
        if (r.problemSlug() != null) {
            try {
                List<TestCaseDto> t = catalog.get().uri("/internal/problems/{slug}/tests", r.problemSlug()).retrieve()
                    .body(new ParameterizedTypeReference<List<TestCaseDto>>() {});
                return t.stream().limit(props.maxTests()).map(x -> new TestInput(x.input(), x.expected())).toList();
            } catch (HttpClientErrorException.NotFound e) {
                throw ApiException.notFound("Problem");
            } catch (RestClientException e) {
                throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "CATALOG_UNAVAILABLE", "Problem catalog is unavailable");
            }
        }
        if (r.tests() == null || r.tests().isEmpty()) throw new ApiException(HttpStatus.BAD_REQUEST, "NO_TESTS", "Provide a problemSlug or at least one test case");
        return r.tests().stream().map(x -> new TestInput(Objects.requireNonNullElse(x.input(), ""), Objects.requireNonNullElse(x.expected(), ""))).toList();
    }

    private ExecutionJob create(UUID userId, String origin, String ref, String slug, String source, List<TestInput> tests) {
        String problem = SourcePolicy.check(source, props.maxSourceBytes());
        if (problem != null) throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "REJECTED", problem);
        try {
            ExecutionJob j = jobs.save(new ExecutionJob(userId, origin, ref, slug, source, mapper.writeValueAsString(tests), tests.size(), sandbox.name()));
            dispatch.dispatch(j.getId(), origin, ref);
            return j;
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
    }

    @PostMapping("/api/v1/executions")
    @Operation(summary = "Queue Java code to compile and run against a problem's tests or supplied test cases (asynchronous)")
    @Transactional
    public ResponseEntity<ExecutionDto> submit(@Valid @RequestBody SubmitRequest r) {
        ExecutionJob j = create(CurrentUser.idOrNull(), "API", null, r.problemSlug(), r.sourceCode(), testsFor(r));
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(ExecutionDto.of(j));
    }

    /** Jobs created by a signed-in user are visible only to that user; anonymous jobs are reachable only via their unguessable id. */
    @GetMapping({"/api/v1/executions/{id}", "/api/v1/executions/{id}/results"})
    @Transactional(readOnly = true)
    public ExecutionDto get(@PathVariable UUID id) {
        ExecutionJob j = jobs.findById(id).orElseThrow(() -> ApiException.notFound("Execution"));
        if (j.getUserId() != null && !j.getUserId().equals(CurrentUser.idOrNull())) throw ApiException.notFound("Execution");
        return ExecutionDto.of(j);
    }

    @PostMapping("/internal/executions")
    @Transactional
    public ResponseEntity<ExecutionDto> internalSubmit(@Valid @RequestBody InternalSubmit r) {
        List<TestInput> tests = r.tests().stream().map(x -> new TestInput(Objects.requireNonNullElse(x.input(), ""), Objects.requireNonNullElse(x.expected(), ""))).toList();
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(ExecutionDto.of(create(null, r.origin(), r.originRef(), null, r.sourceCode(), tests)));
    }

    @GetMapping("/internal/executions/{id}")
    @Transactional(readOnly = true)
    public ExecutionDto internalGet(@PathVariable UUID id) {
        return ExecutionDto.of(jobs.findById(id).orElseThrow(() -> ApiException.notFound("Execution")));
    }
}
