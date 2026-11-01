package dev.algomotion.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.algomotion.ai.jobs.ExecutionClient;
import dev.algomotion.ai.provider.LlmProvider;
import dev.algomotion.testsupport.PostgresSupport;
import java.time.Duration;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/** Deterministic fixtures: no external AI provider and no execution service are needed. */
@SpringBootTest(properties = {"algomotion.jwt.secret=test-secret-test-secret-test-secret-123", "algomotion.internal.token=internal-test", "algomotion.messaging.enabled=false"})
@AutoConfigureMockMvc
class SolutionFlowIntegrationTest {
    @DynamicPropertySource
    static void db(DynamicPropertyRegistry r) { PostgresSupport.register(r); }

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @MockitoBean LlmProvider provider;
    @MockitoBean ExecutionClient executions;

    static final String GOOD = """
        {"problemSummary":"Add two numbers","topics":["math"],"ambiguities":[],
         "approaches":[{"approachName":"Direct","javaCode":"public class Main { public static void main(String[] a) {} }","intuition":"add",
           "timeComplexity":"O(1)","spaceComplexity":"O(1)","testCases":[{"input":"1 2","expected":"3"}],
           "visualization":{"algorithm":"linear-search","input":{"values":[1,2],"target":2}}}]}""";

    String create() throws Exception {
        String body = "{\"problemText\":\"Read two integers and print their sum on one line.\"}";
        return json.readTree(mvc.perform(post("/api/v1/solutions").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isAccepted()).andReturn().getResponse().getContentAsString()).get("id").asText();
    }

    JsonNode awaitFinal(String id) {
        return await().atMost(Duration.ofSeconds(30)).pollInterval(Duration.ofMillis(200)).until(
            () -> json.readTree(mvc.perform(get("/api/v1/solutions/" + id)).andReturn().getResponse().getContentAsString()),
            n -> n.get("status").asText().equals("COMPLETED") || n.get("status").asText().equals("FAILED"));
    }

    @Test
    void generatesValidatesAndRecordsTestVerdicts() throws Exception {
        UUID exec = UUID.randomUUID();
        when(provider.name()).thenReturn("fixture");
        when(provider.generate(anyString())).thenReturn(GOOD);
        when(executions.submit(anyString(), anyList(), any())).thenReturn(exec);
        when(executions.get(exec)).thenReturn(json.readTree("{\"id\":\"" + exec + "\",\"status\":\"COMPLETED\",\"passed\":1,\"total\":1,\"results\":[]}"));
        JsonNode done = awaitFinal(create());
        assertThat(done.get("status").asText()).isEqualTo("COMPLETED");
        JsonNode a = done.get("approaches").get(0);
        assertThat(a.get("verdict").asText()).isEqualTo("TESTS_PASSED");
        assertThat(a.get("visualization").get("algorithm").asText()).isEqualTo("linear-search");
    }

    @Test
    void failingTestsAndCompileErrorsAreReportedHonestly() throws Exception {
        UUID exec = UUID.randomUUID();
        when(provider.name()).thenReturn("fixture");
        when(provider.generate(anyString())).thenReturn(GOOD);
        when(executions.submit(anyString(), anyList(), any())).thenReturn(exec);
        when(executions.get(exec)).thenReturn(json.readTree("{\"status\":\"COMPILATION_ERROR\",\"passed\":0,\"total\":1}"));
        assertThat(awaitFinal(create()).get("approaches").get(0).get("verdict").asText()).isEqualTo("MANUAL_REVIEW");
    }

    @Test
    void providerErrorsFailTheSessionWithAClearMessage() throws Exception {
        when(provider.name()).thenReturn("fixture");
        when(provider.generate(anyString())).thenThrow(new LlmProvider.ProviderException("HTTP 429", true));
        JsonNode r = awaitFinal(create());
        assertThat(r.get("status").asText()).isEqualTo("FAILED");
        assertThat(r.get("error").asText()).contains("rate-limiting");
    }

    @Test
    void malformedModelOutputIsRejected() throws Exception {
        when(provider.name()).thenReturn("fixture");
        when(provider.generate(anyString())).thenReturn("Sure! Here is the code: public class Main {}");
        JsonNode r = awaitFinal(create());
        assertThat(r.get("status").asText()).isEqualTo("FAILED");
        assertThat(r.get("error").asText()).contains("malformed JSON");
    }

    @Test
    void validatesRequestSize() throws Exception {
        mvc.perform(post("/api/v1/solutions").contentType(MediaType.APPLICATION_JSON).content("{\"problemText\":\"too short\"}")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/solutions/" + UUID.randomUUID())).andExpect(status().isNotFound());
    }
}
