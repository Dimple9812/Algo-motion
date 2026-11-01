package dev.algomotion.viz;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.algomotion.viz.algorithms.Registry;
import dev.algomotion.viz.engine.Trace;
import dev.algomotion.viz.engine.TraceValidator;
import java.io.InputStream;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

/**
 * The Java engine must produce the same operation sequence, pseudocode lines, array snapshots and result as the
 * TypeScript engine for every fixture exported from frontend/src/algorithms/fixtures.export.test.ts.
 */
class ConformanceTest {
    static final ObjectMapper M = new ObjectMapper();
    static final Registry R = new Registry();

    static Stream<JsonNode> fixtures() throws Exception {
        try (InputStream in = ConformanceTest.class.getResourceAsStream("/fixtures/trace-fixtures.json")) {
            List<JsonNode> l = M.readValue(in, M.getTypeFactory().constructCollectionType(List.class, JsonNode.class));
            return l.stream();
        }
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("fixtures")
    @SuppressWarnings("unchecked")
    void javaTraceMatchesTypeScriptTrace(JsonNode f) {
        Map<String, Object> input = M.convertValue(f.get("input"), Map.class);
        Trace t = R.get(f.get("algorithm").asText()).orElseThrow().run(input);
        assertThat(TraceValidator.validate(t)).isEmpty();
        JsonNode steps = f.get("steps");
        assertThat(t.steps()).hasSize(steps.size());
        for (int i = 0; i < steps.size(); i++) {
            Trace.Step s = t.steps().get(i);
            JsonNode e = steps.get(i);
            assertThat(s.operation()).as("op at step %d", i).isEqualTo(e.get("operation").asText());
            assertThat(s.line()).as("line at step %d", i).isEqualTo(e.get("line").isNull() ? null : e.get("line").asInt());
            assertThat((JsonNode) M.valueToTree(s.state().get("values"))).as("values at step %d", i).isEqualTo(e.get("values"));
        }
        assertThat((JsonNode) M.valueToTree(t.result())).isEqualTo(f.get("result"));
    }
}
