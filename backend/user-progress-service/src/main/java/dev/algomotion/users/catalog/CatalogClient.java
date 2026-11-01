package dev.algomotion.users.catalog;

import dev.algomotion.shared.security.InternalAuthProperties;
import dev.algomotion.users.UserServiceProperties;
import java.util.Collection;
import java.util.List;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/** Calls the catalog's internal API. The catalog owns problem data; this service stores only slugs. */
@Component
public class CatalogClient {
    public record ProblemSummary(String slug, String title, String topic, String difficulty, List<String> patterns, boolean visualizationSupported) {}

    private final RestClient http;

    public CatalogClient(UserServiceProperties props, InternalAuthProperties internal) {
        SimpleClientHttpRequestFactory f = new SimpleClientHttpRequestFactory();
        f.setConnectTimeout(2000);
        f.setReadTimeout(3000);
        this.http = RestClient.builder().baseUrl(props.catalogUrl()).requestFactory(f)
            .defaultHeader(InternalAuthProperties.HEADER, internal.token() == null ? "" : internal.token()).build();
    }

    public List<ProblemSummary> summaries(Collection<String> slugs) {
        if (slugs.isEmpty()) return List.of();
        return http.get().uri(u -> u.path("/internal/problems/summaries").queryParam("slugs", String.join(",", slugs)).build())
            .retrieve().body(new ParameterizedTypeReference<List<ProblemSummary>>() {});
    }
}
