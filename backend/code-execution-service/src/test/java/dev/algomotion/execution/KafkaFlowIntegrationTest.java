package dev.algomotion.execution;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import com.fasterxml.jackson.databind.ObjectMapper;
import dev.algomotion.shared.messaging.Events.CodeExecutionCompleted;
import dev.algomotion.shared.messaging.Topics;
import dev.algomotion.testsupport.PostgresSupport;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.test.context.EmbeddedKafka;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

/** Full asynchronous path: REST → outbox → Kafka → idempotent consumer → sandbox → completion event via outbox → Kafka. */
@SpringBootTest(properties = {"algomotion.jwt.secret=test-secret-test-secret-test-secret-123", "algomotion.internal.token=internal-test",
    "execution.sandbox=local", "spring.kafka.bootstrap-servers=${spring.embedded.kafka.brokers}", "algomotion.outbox.poll-ms=200"})
@EmbeddedKafka(partitions = 1, topics = {Topics.EXECUTION_REQUESTED, Topics.EXECUTION_COMPLETED})
@AutoConfigureMockMvc
@Import(KafkaFlowIntegrationTest.Collector.class)
class KafkaFlowIntegrationTest {
    @DynamicPropertySource
    static void db(DynamicPropertyRegistry r) { PostgresSupport.register(r); }

    @TestConfiguration
    static class Collector {
        static final List<CodeExecutionCompleted> completed = new CopyOnWriteArrayList<>();
        @Autowired ObjectMapper mapper;

        @KafkaListener(topics = Topics.EXECUTION_COMPLETED, groupId = "test-collector")
        void on(String payload) throws Exception { completed.add(mapper.readValue(payload, CodeExecutionCompleted.class)); }
    }

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    @Test
    void executionCompletesThroughKafka() throws Exception {
        String src = "public class Main { public static void main(String[] a) { System.out.println(42); } }";
        String body = "{\"language\":\"java\",\"sourceCode\":\"" + src + "\",\"tests\":[{\"input\":\"\",\"expected\":\"42\"}]}";
        String id = json.readTree(mvc.perform(post("/api/v1/executions").contentType(MediaType.APPLICATION_JSON).content(body))
            .andReturn().getResponse().getContentAsString()).get("id").asText();
        await().atMost(Duration.ofSeconds(90)).until(() -> Collector.completed.stream().anyMatch(e -> e.executionId().toString().equals(id)));
        CodeExecutionCompleted e = Collector.completed.stream().filter(x -> x.executionId().toString().equals(id)).findFirst().orElseThrow();
        assertThat(e.status()).isEqualTo("COMPLETED");
        assertThat(e.passed()).isEqualTo(1);
        assertThat(e.schemaVersion()).isEqualTo(1);
    }
}
