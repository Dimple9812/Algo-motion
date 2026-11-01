package dev.algomotion.execution;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.algomotion.testsupport.PostgresSupport;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {"algomotion.jwt.secret=test-secret-test-secret-test-secret-123", "algomotion.internal.token=internal-test",
    "algomotion.messaging.enabled=false", "execution.sandbox=local", "execution.test-timeout-ms=2000"})
@AutoConfigureMockMvc
class ExecutionApiIntegrationTest {
    @DynamicPropertySource
    static void db(DynamicPropertyRegistry r) { PostgresSupport.register(r); }

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JwtEncoder jwt;

    static final String SUM = "import java.util.*;\\npublic class Main { public static void main(String[] a) { Scanner s = new Scanner(System.in); System.out.println(s.nextInt() + s.nextInt()); } }";

    String token(UUID user) {
        var claims = JwtClaimsSet.builder().issuer("algomotion").subject(user.toString()).issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(300)).build();
        return "Bearer " + jwt.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
    }

    JsonNode awaitDone(String id, String auth) {
        return await().atMost(Duration.ofSeconds(60)).pollInterval(Duration.ofMillis(300)).until(() -> {
            var req = get("/api/v1/executions/" + id);
            if (auth != null) req.header("Authorization", auth);
            return json.readTree(mvc.perform(req).andReturn().getResponse().getContentAsString());
        }, n -> !n.get("status").asText().equals("QUEUED") && !n.get("status").asText().equals("RUNNING"));
    }

    @Test
    void runsSubmissionAsynchronouslyAndReportsPerTestResults() throws Exception {
        String body = "{\"language\":\"java\",\"sourceCode\":\"" + SUM + "\",\"tests\":[{\"input\":\"1 2\",\"expected\":\"3\"},{\"input\":\"2 2\",\"expected\":\"5\"}]}";
        String res = mvc.perform(post("/api/v1/executions").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isAccepted()).andExpect(jsonPath("$.status", is("QUEUED"))).andReturn().getResponse().getContentAsString();
        JsonNode done = awaitDone(json.readTree(res).get("id").asText(), null);
        assertThat(done.get("status").asText()).isEqualTo("COMPLETED");
        assertThat(done.get("passed").asInt()).isEqualTo(1);
        assertThat(done.get("total").asInt()).isEqualTo(2);
        assertThat(done.get("results").get(1).get("actual").asText().strip()).isEqualTo("4");
    }

    @Test
    void rejectsSubmissionsWithoutMainClass() throws Exception {
        mvc.perform(post("/api/v1/executions").contentType(MediaType.APPLICATION_JSON)
                .content("{\"language\":\"java\",\"sourceCode\":\"class X {}\",\"tests\":[{\"input\":\"\",\"expected\":\"\"}]}"))
            .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code", is("REJECTED")));
        mvc.perform(post("/api/v1/executions").contentType(MediaType.APPLICATION_JSON)
                .content("{\"language\":\"python\",\"sourceCode\":\"print(1)\"}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void signedInJobsAreOwnerScoped() throws Exception {
        String alice = token(UUID.randomUUID());
        String bob = token(UUID.randomUUID());
        String body = "{\"language\":\"java\",\"sourceCode\":\"" + SUM + "\",\"tests\":[{\"input\":\"1 1\",\"expected\":\"2\"}]}";
        String id = json.readTree(mvc.perform(post("/api/v1/executions").header("Authorization", alice).contentType(MediaType.APPLICATION_JSON).content(body))
            .andReturn().getResponse().getContentAsString()).get("id").asText();
        assertThat(awaitDone(id, alice).get("status").asText()).isEqualTo("COMPLETED");
        mvc.perform(get("/api/v1/executions/" + id).header("Authorization", bob)).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/executions/" + id)).andExpect(status().isNotFound());
    }

    @Test
    void internalSubmitRequiresToken() throws Exception {
        String body = "{\"sourceCode\":\"" + SUM + "\",\"tests\":[{\"input\":\"1 1\",\"expected\":\"2\"}],\"origin\":\"AI_SOLUTION\",\"originRef\":\"x\"}";
        mvc.perform(post("/internal/executions").contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
        mvc.perform(post("/internal/executions").header("X-Internal-Token", "internal-test").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isAccepted());
    }
}
