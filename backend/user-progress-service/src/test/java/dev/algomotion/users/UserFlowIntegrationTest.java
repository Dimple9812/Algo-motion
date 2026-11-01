package dev.algomotion.users;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.algomotion.testsupport.PostgresSupport;
import dev.algomotion.users.catalog.CatalogClient;
import dev.algomotion.users.catalog.CatalogClient.ProblemSummary;
import jakarta.servlet.http.Cookie;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest(properties = {"algomotion.jwt.secret=test-secret-test-secret-test-secret-123", "algomotion.internal.token=internal-test"})
@AutoConfigureMockMvc
class UserFlowIntegrationTest {
    @DynamicPropertySource
    static void db(DynamicPropertyRegistry r) { PostgresSupport.register(r); }

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @MockitoBean CatalogClient catalog;

    record Account(String token, Cookie refresh, String email) {}

    @BeforeEach
    void catalogStub() {
        when(catalog.summaries(anyCollection())).thenAnswer(inv -> {
            java.util.Collection<String> slugs = inv.getArgument(0);
            return slugs.stream().filter(s -> !s.equals("missing")).map(s -> new ProblemSummary(s, "Title " + s, "arrays", "EASY", List.of(), false)).toList();
        });
    }

    Account register() throws Exception {
        String email = "u" + UUID.randomUUID().toString().substring(0, 8) + "@example.com";
        MvcResult r = mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"secret123\",\"displayName\":\"Ada\"}"))
            .andExpect(status().isCreated())
            .andExpect(cookie().httpOnly("am_refresh", true))
            .andExpect(jsonPath("$.user.email", is(email))).andReturn();
        return new Account(json.readTree(r.getResponse().getContentAsString()).get("accessToken").asText(), r.getResponse().getCookie("am_refresh"), email);
    }

    @Test
    void registerValidatesInputAndRejectsDuplicates() throws Exception {
        mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON).content("{\"email\":\"bad\",\"password\":\"short\",\"displayName\":\"A\"}"))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.details.email").exists()).andExpect(jsonPath("$.details.password").exists());
        Account a = register();
        mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + a.email().toUpperCase() + "\",\"password\":\"secret123\",\"displayName\":\"Ada\"}"))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.code", is("EMAIL_TAKEN")));
    }

    @Test
    void loginRefreshRotationAndLogout() throws Exception {
        Account a = register();
        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content("{\"email\":\"" + a.email() + "\",\"password\":\"wrong-pass1\"}"))
            .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.message", is("Invalid email or password")));
        MvcResult r = mvc.perform(post("/api/v1/auth/refresh").cookie(a.refresh())).andExpect(status().isOk()).andExpect(jsonPath("$.accessToken").exists()).andReturn();
        Cookie rotated = r.getResponse().getCookie("am_refresh");
        assertThat(rotated.getValue()).isNotEqualTo(a.refresh().getValue());
        // reusing the old token is detected and kills every session, including the rotated one
        mvc.perform(post("/api/v1/auth/refresh").cookie(a.refresh())).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/refresh").cookie(rotated)).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/logout")).andExpect(status().isNoContent());
    }

    @Test
    void protectedEndpointsRequireAuth() throws Exception {
        mvc.perform(get("/api/v1/users/me")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/users/me").header("Authorization", "Bearer not-a-jwt")).andExpect(status().isUnauthorized());
        Account a = register();
        mvc.perform(get("/api/v1/users/me").header("Authorization", "Bearer " + a.token())).andExpect(status().isOk()).andExpect(jsonPath("$.displayName", is("Ada")));
    }

    @Test
    void progressIsIdempotentAndUnlocksBadges() throws Exception {
        Account a = register();
        String auth = "Bearer " + a.token();
        String ev = "{\"key\":\"challenge:find-number\",\"kind\":\"CHALLENGE\",\"topic\":\"searching\"}";
        mvc.perform(post("/api/v1/users/me/progress/events").header("Authorization", auth).contentType(MediaType.APPLICATION_JSON).content(ev))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.xp", is(25)));
        mvc.perform(post("/api/v1/users/me/progress/events").header("Authorization", auth).contentType(MediaType.APPLICATION_JSON).content(ev))
            .andExpect(status().isOk()).andExpect(jsonPath("$.awarded", is(false))).andExpect(jsonPath("$.xp", is(0)));
        mvc.perform(post("/api/v1/users/me/progress/events").header("Authorization", auth).contentType(MediaType.APPLICATION_JSON)
                .content("{\"key\":\"viz:binary-search\",\"kind\":\"VISUALIZATION\",\"topic\":\"searching\"}"))
            .andExpect(jsonPath("$.unlockedBadges", contains("array-explorer")));
        mvc.perform(post("/api/v1/users/me/progress/events").header("Authorization", auth).contentType(MediaType.APPLICATION_JSON)
                .content("{\"key\":\"problem:two-sum\",\"kind\":\"CHALLENGE\",\"topic\":\"arrays\"}"))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code", is("INVALID_EVENT")));
        mvc.perform(get("/api/v1/users/me/progress").header("Authorization", auth))
            .andExpect(jsonPath("$.totalXp", is(30))).andExpect(jsonPath("$.events", hasSize(2)));
        mvc.perform(get("/api/v1/users/me/achievements").header("Authorization", auth)).andExpect(jsonPath("$[0].badgeId", is("array-explorer")));
    }

    @Test
    void bookmarksValidateAgainstCatalog() throws Exception {
        Account a = register();
        String auth = "Bearer " + a.token();
        mvc.perform(post("/api/v1/users/me/bookmarks").header("Authorization", auth).contentType(MediaType.APPLICATION_JSON).content("{\"problemSlug\":\"two-sum\"}"))
            .andExpect(status().isCreated());
        mvc.perform(post("/api/v1/users/me/bookmarks").header("Authorization", auth).contentType(MediaType.APPLICATION_JSON).content("{\"problemSlug\":\"missing\"}"))
            .andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/users/me/bookmarks").header("Authorization", auth)).andExpect(jsonPath("$[*].slug", contains("two-sum")));
        mvc.perform(delete("/api/v1/users/me/bookmarks/two-sum").header("Authorization", auth)).andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/users/me/bookmarks").header("Authorization", auth)).andExpect(jsonPath("$", empty()));
    }

    @Test
    void sessionsAreOwnedByTheirUser() throws Exception {
        Account alice = register();
        Account bob = register();
        MvcResult r = mvc.perform(post("/api/v1/users/me/sessions").header("Authorization", "Bearer " + alice.token()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"type\":\"VISUALIZATION\",\"title\":\"Binary search\",\"reference\":\"binary-search\",\"payload\":{\"algorithm\":\"binary-search\"}}"))
            .andExpect(status().isCreated()).andReturn();
        JsonNode s = json.readTree(r.getResponse().getContentAsString());
        String path = "/api/v1/users/me/sessions/" + s.get("id").asText();
        mvc.perform(get(path).header("Authorization", "Bearer " + alice.token())).andExpect(status().isOk()).andExpect(jsonPath("$.payload.algorithm", is("binary-search")));
        mvc.perform(get(path).header("Authorization", "Bearer " + bob.token())).andExpect(status().isNotFound());
        mvc.perform(delete(path).header("Authorization", "Bearer " + bob.token())).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/users/me/history").header("Authorization", "Bearer " + bob.token())).andExpect(jsonPath("$", empty()));
        mvc.perform(get("/api/v1/users/me/history").header("Authorization", "Bearer " + alice.token())).andExpect(jsonPath("$", hasSize(1)));
    }
}
