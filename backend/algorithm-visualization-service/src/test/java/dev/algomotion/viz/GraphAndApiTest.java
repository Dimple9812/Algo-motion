package dev.algomotion.viz;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import dev.algomotion.viz.algorithms.Graphs;
import dev.algomotion.viz.algorithms.Sorting;
import dev.algomotion.viz.engine.InputException;
import java.util.List;
import java.util.Map;
import java.util.Random;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {"algomotion.jwt.secret=test-secret-test-secret-test-secret-123", "algomotion.internal.token=t"})
@AutoConfigureMockMvc
class GraphAndApiTest {
    @Autowired MockMvc mvc;

    @Test
    void graphsComputeCorrectResults() {
        Map<String, Object> campus = Map.of("edges", "A-B:4, A-C:2, B-C:5, B-D:10, C-E:3, E-D:4, D-F:11", "directed", "false", "start", "A");
        assertThat(new Graphs.Dijkstra().run(campus).result()).isEqualTo(Map.of("A", 0L, "B", 4L, "C", 2L, "D", 9L, "E", 5L, "F", 20L));
        assertThat(new Graphs.Bfs().run(Map.of("edges", "A-B, A-C, B-D, C-D, D-E, G-H", "directed", "false", "start", "A")).result())
            .isEqualTo(List.of("A", "B", "C", "D", "E"));
        assertThatThrownBy(() -> new Graphs.Dijkstra().run(Map.of("edges", "A>B:-1", "directed", "true", "start", "A")))
            .isInstanceOf(InputException.class).hasMessageContaining("non-negative");
    }

    @Test
    @SuppressWarnings("unchecked")
    void sortsAreCorrectAndStableWhereClaimed() {
        Random r = new Random(7);
        for (int run = 0; run < 50; run++) {
            int n = r.nextInt(12);
            List<Integer> v = r.ints(n, 0, 6).boxed().toList();
            for (var algo : List.of(new Sorting.Bubble(), new Sorting.Insertion(), new Sorting.Merge(), new Sorting.Quick())) {
                Map<String, List<Integer>> res = (Map<String, List<Integer>>) algo.run(Map.of("values", v)).result();
                assertThat(res.get("sorted")).isSorted().containsExactlyInAnyOrderElementsOf(v);
                if (!(algo instanceof Sorting.Quick)) {
                    for (int i = 1; i < n; i++) if (res.get("sorted").get(i).equals(res.get("sorted").get(i - 1)))
                        assertThat(res.get("order").get(i)).isGreaterThan(res.get("order").get(i - 1));
                }
            }
        }
    }

    @Test
    void apiServesAlgorithmsAndValidatedTraces() throws Exception {
        mvc.perform(get("/api/v1/algorithms")).andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(8)));
        mvc.perform(post("/api/v1/visualizations").contentType(MediaType.APPLICATION_JSON).content("{\"algorithm\":\"binary-search\",\"input\":{\"values\":[1,3,5],\"target\":5}}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.schemaVersion", is("1.0"))).andExpect(jsonPath("$.result", is(2)))
            .andExpect(jsonPath("$.steps[-1:].done", contains(true)));
        mvc.perform(post("/api/v1/visualizations").contentType(MediaType.APPLICATION_JSON).content("{\"algorithm\":\"binary-search\",\"input\":{\"values\":[3,1],\"target\":5}}"))
            .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.message", containsString("sorted")));
        mvc.perform(post("/api/v1/visualizations").contentType(MediaType.APPLICATION_JSON).content("{\"algorithm\":\"nope\",\"input\":{}}"))
            .andExpect(status().isNotFound());
        mvc.perform(post("/api/v1/visualizations").contentType(MediaType.APPLICATION_JSON).content("{\"algorithm\":\"bubble-sort\",\"input\":{\"values\":[1.5]}}"))
            .andExpect(status().isUnprocessableEntity());
    }
}
