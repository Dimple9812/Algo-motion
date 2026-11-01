package dev.algomotion.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.ObjectMapper;
import dev.algomotion.ai.jobs.ResponseValidator;
import dev.algomotion.ai.jobs.ResponseValidator.InvalidResponse;
import org.junit.jupiter.api.Test;

class ResponseValidatorTest {
    final ResponseValidator v = new ResponseValidator(new ObjectMapper());

    static String approach(String extra) {
        return "{\"approachName\":\"Hash map\",\"javaCode\":\"public class Main { public static void main(String[] a) {} }\",\"intuition\":\"x\","
            + "\"timeComplexity\":\"O(n)\",\"spaceComplexity\":\"O(n)\",\"testCases\":[{\"input\":\"1\",\"expected\":\"1\"},{\"input\":1,\"expected\":\"bad\"}]" + extra + "}";
    }

    @Test
    void acceptsWellFormedResponsesIncludingMarkdownFences() throws Exception {
        String json = "{\"problemSummary\":\"s\",\"topics\":[\"arrays\"],\"approaches\":[" + approach(",\"visualization\":{\"algorithm\":\"binary-search\",\"input\":{\"values\":[1,2,3],\"target\":2}}") + "]}";
        var r = v.validate("```json\n" + json + "\n```");
        assertThat(r.approaches()).hasSize(1);
        assertThat(r.approaches().get(0).get("testCases")).hasSize(1); // non-string test dropped
        assertThat(r.approaches().get(0).get("visualizationSupported").asBoolean()).isTrue();
        assertThat(r.topics()).containsExactly("arrays");
    }

    @Test
    void rejectsMalformedOrIncompleteOutput() {
        assertThatThrownBy(() -> v.validate("not json")).isInstanceOf(InvalidResponse.class).hasMessageContaining("malformed");
        assertThatThrownBy(() -> v.validate("")).isInstanceOf(InvalidResponse.class);
        assertThatThrownBy(() -> v.validate("{\"approaches\":[]}")).hasMessageContaining("no approaches");
        assertThatThrownBy(() -> v.validate("{\"approaches\":[{\"approachName\":\"x\"}]}")).hasMessageContaining("javaCode");
        assertThatThrownBy(() -> v.validate("{\"approaches\":[{\"approachName\":\"x\",\"javaCode\":\"print(1)\",\"timeComplexity\":\"a\",\"spaceComplexity\":\"b\"}]}"))
            .hasMessageContaining("class Main");
    }

    @Test
    void stripsUnsupportedOrUnsafeVisualizations() throws Exception {
        String[] bad = {
            ",\"visualization\":{\"algorithm\":\"custom-js\",\"input\":{}}",
            ",\"visualization\":{\"algorithm\":\"binary-search\",\"input\":{\"values\":[1],\"script\":\"alert(1)\"}}",
            ",\"visualization\":{\"algorithm\":\"bubble-sort\",\"input\":{\"values\":[" + "1,".repeat(30) + "1]}}",
            ",\"visualization\":{\"algorithm\":\"bubble-sort\",\"input\":{\"values\":[{\"x\":1}]}}",
            ",\"visualization\":\"<svg onload=alert(1)>\"",
        };
        for (String b : bad) {
            var r = v.validate("{\"approaches\":[" + approach(b) + "]}");
            assertThat(r.approaches().get(0).get("visualization").isNull()).as(b).isTrue();
            assertThat(r.approaches().get(0).get("visualizationSupported").asBoolean()).isFalse();
        }
    }

    @Test
    void capsApproachCountAndFieldSizes() throws Exception {
        String many = "{\"approaches\":[" + String.join(",", java.util.Collections.nCopies(5, approach(""))) + "],\"ambiguities\":[\"" + "y".repeat(1000) + "\"]}";
        var r = v.validate(many);
        assertThat(r.approaches()).hasSize(3);
        assertThat(r.ambiguities().get(0)).hasSize(400);
    }
}
