package dev.algomotion.catalog;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.hamcrest.Matchers.*;

import dev.algomotion.catalog.domain.ProblemRepository;
import dev.algomotion.catalog.seed.ProblemSeeder;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import dev.algomotion.testsupport.PostgresSupport;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

@SpringBootTest(properties = {"algomotion.jwt.secret=test-secret-test-secret-test-secret-123", "algomotion.internal.token=internal-test"})
@AutoConfigureMockMvc
class CatalogIntegrationTest {
    @DynamicPropertySource
    static void db(DynamicPropertyRegistry r) { PostgresSupport.register(r); }

    @Autowired MockMvc mvc;
    @Autowired ProblemRepository repo;
    @Autowired ProblemSeeder seeder;

    @Test
    void seedsAllProblemsIdempotently() throws Exception {
        long before = repo.count();
        org.assertj.core.api.Assertions.assertThat(before).isGreaterThanOrEqualTo(75);
        seeder.run(null);
        org.assertj.core.api.Assertions.assertThat(repo.count()).isEqualTo(before);
    }

    @Test
    void listsWithFiltersAndPagination() throws Exception {
        mvc.perform(get("/api/v1/problems?size=5")).andExpect(status().isOk())
            .andExpect(jsonPath("$.items", hasSize(5))).andExpect(jsonPath("$.totalItems", greaterThanOrEqualTo(75)));
        mvc.perform(get("/api/v1/problems?topic=graphs&difficulty=HARD")).andExpect(status().isOk())
            .andExpect(jsonPath("$.items[*].topic", everyItem(is("graphs"))))
            .andExpect(jsonPath("$.items[*].difficulty", everyItem(is("HARD"))));
        mvc.perform(get("/api/v1/problems?q=two pointers")).andExpect(status().isOk())
            .andExpect(jsonPath("$.items", not(empty())));
        mvc.perform(get("/api/v1/problems?size=500")).andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code", is("VALIDATION_FAILED")));
    }

    @Test
    void detailExposesOnlySampleTests() throws Exception {
        mvc.perform(get("/api/v1/problems/two-sum")).andExpect(status().isOk())
            .andExpect(jsonPath("$.title", is("Pair That Pays")))
            .andExpect(jsonPath("$.approaches", hasSize(2)))
            .andExpect(jsonPath("$.approaches[0].kind", is("BRUTE_FORCE")))
            .andExpect(jsonPath("$.tests", hasSize(2)))
            .andExpect(jsonPath("$.hints", not(empty())));
        mvc.perform(get("/api/v1/problems/does-not-exist")).andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code", is("NOT_FOUND")));
    }

    @Test
    void internalEndpointsRequireToken() throws Exception {
        mvc.perform(get("/internal/problems/two-sum/tests")).andExpect(status().isForbidden());
        mvc.perform(get("/internal/problems/two-sum/tests").header("X-Internal-Token", "internal-test"))
            .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(greaterThan(2))));
    }

    @Test
    void topicsAreCounted() throws Exception {
        mvc.perform(get("/api/v1/problems/topics")).andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.id == 'graphs')].count", contains(4)));
    }
}
