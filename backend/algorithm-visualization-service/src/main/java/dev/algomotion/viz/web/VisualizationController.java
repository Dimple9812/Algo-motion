package dev.algomotion.viz.web;

import dev.algomotion.shared.web.ApiException;
import dev.algomotion.viz.algorithms.Algorithm;
import dev.algomotion.viz.algorithms.Registry;
import dev.algomotion.viz.engine.InputException;
import dev.algomotion.viz.engine.Trace;
import dev.algomotion.viz.engine.TraceValidator;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Algorithms & visualizations")
public class VisualizationController {
    private final Registry registry;

    public VisualizationController(Registry registry) { this.registry = registry; }

    public record AlgorithmInfo(String id, String name, String category, Map<String, String> complexity) {}

    public record VisualizationRequest(@NotBlank @Pattern(regexp = "^[a-z0-9-]{1,64}$") String algorithm, @NotNull Map<String, Object> input) {}

    @GetMapping("/algorithms")
    public List<AlgorithmInfo> list() {
        return registry.all().stream().map(a -> new AlgorithmInfo(a.id(), a.name(), a.category(), a.complexity())).toList();
    }

    @GetMapping("/algorithms/{slug}")
    public AlgorithmInfo get(@PathVariable String slug) {
        Algorithm a = registry.get(slug).orElseThrow(() -> ApiException.notFound("Algorithm"));
        return new AlgorithmInfo(a.id(), a.name(), a.category(), a.complexity());
    }

    @PostMapping("/visualizations")
    @Operation(summary = "Generate a deterministic, validated execution trace (schema v1.0) for an algorithm and input")
    public Trace visualize(@Valid @RequestBody VisualizationRequest r) {
        Algorithm a = registry.get(r.algorithm()).orElseThrow(() -> ApiException.notFound("Algorithm"));
        Trace t;
        try {
            t = a.run(r.input());
        } catch (InputException e) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_INPUT", e.getMessage());
        }
        List<String> errors = TraceValidator.validate(t);
        if (!errors.isEmpty()) throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "TRACE_INVALID", "Generated trace failed validation");
        return t;
    }
}
