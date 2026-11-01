package dev.algomotion.users.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.algomotion.shared.security.CurrentUser;
import dev.algomotion.shared.web.ApiException;
import dev.algomotion.users.auth.AuthController.UserDto;
import dev.algomotion.users.catalog.CatalogClient;
import dev.algomotion.users.catalog.CatalogClient.ProblemSummary;
import dev.algomotion.users.domain.Repositories.SavedSessionRepository;
import dev.algomotion.users.domain.Repositories.UserRepository;
import dev.algomotion.users.domain.SavedSession;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClientException;

@RestController
@RequestMapping("/api/v1/users/me")
@Tag(name = "Current user: progress, bookmarks, history")
public class UserController {
    private static final int MAX_SESSIONS = 200;
    private final UserRepository users;
    private final SavedSessionRepository sessions;
    private final JdbcTemplate jdbc;
    private final CatalogClient catalog;
    private final ObjectMapper mapper;

    public UserController(UserRepository users, SavedSessionRepository sessions, JdbcTemplate jdbc, CatalogClient catalog, ObjectMapper mapper) {
        this.users = users;
        this.sessions = sessions;
        this.jdbc = jdbc;
        this.catalog = catalog;
        this.mapper = mapper;
    }

    @GetMapping
    public UserDto me() {
        return users.findById(CurrentUser.id()).map(u -> new UserDto(u.getId(), u.getEmail(), u.getDisplayName()))
            .orElseThrow(() -> ApiException.notFound("User"));
    }

    // ------------------------------------------------------------ preferences
    public record Preferences(@NotNull @Pattern(regexp = "playful|technical") String mode, boolean gamification, @NotNull @Pattern(regexp = "system|reduce|full") String motion) {}

    @GetMapping("/preferences")
    public Preferences preferences() {
        List<Preferences> r = jdbc.query("select mode, gamification, motion from user_preferences where user_id = ?",
            (rs, i) -> new Preferences(rs.getString(1), rs.getBoolean(2), rs.getString(3)), CurrentUser.id());
        return r.isEmpty() ? new Preferences("playful", true, "system") : r.get(0);
    }

    @PutMapping("/preferences")
    public ResponseEntity<Void> savePreferences(@Valid @RequestBody Preferences p) {
        jdbc.update("""
            insert into user_preferences (user_id, mode, gamification, motion, updated_at) values (?, ?, ?, ?, now())
            on conflict (user_id) do update set mode = excluded.mode, gamification = excluded.gamification, motion = excluded.motion, updated_at = now()
            """, CurrentUser.id(), p.mode(), p.gamification(), p.motion());
        return ResponseEntity.noContent().build();
    }

    // ------------------------------------------------------------ progress & achievements
    public record ProgressEventRequest(@NotBlank @Size(max = 120) String key, @NotBlank @Pattern(regexp = "VISUALIZATION|PREDICTION|CHALLENGE|PROBLEM|PATH") String kind,
                                       @NotBlank @Size(max = 40) String topic) {}

    public record XpEvent(String key, String kind, String topic, int xp, Instant at) {}

    public record Progress(List<XpEvent> events, int totalXp, List<String> solvedProblems) {}

    @GetMapping("/progress")
    public Progress progress() {
        UUID uid = CurrentUser.id();
        List<XpEvent> ev = jdbc.query("select event_key, kind, topic, xp, created_at from learning_events where user_id = ? order by created_at",
            (rs, i) -> new XpEvent(rs.getString(1), rs.getString(2).toLowerCase(), rs.getString(3), rs.getInt(4), rs.getTimestamp(5).toInstant()), uid);
        List<String> solved = jdbc.queryForList("select problem_slug from user_problem_progress where user_id = ? order by solved_at", String.class, uid);
        return new Progress(ev, ev.stream().mapToInt(XpEvent::xp).sum(), solved);
    }

    /**
     * Records a learning milestone. Idempotent per (user, key): replays return 200 with awarded=false,
     * so XP cannot be farmed by repeating an action.
     */
    @PostMapping("/progress/events")
    @Transactional
    public ResponseEntity<Map<String, Object>> record(@Valid @RequestBody ProgressEventRequest r) {
        if (!ProgressRules.KEY.matcher(r.key()).matches() || !r.key().startsWith(ProgressRules.KEY_PREFIX.get(r.kind())))
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_EVENT", "Event key does not match its kind");
        if (!ProgressRules.TOPIC.matcher(r.topic()).matches()) throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_EVENT", "Invalid topic");
        UUID uid = CurrentUser.id();
        int xp = ProgressRules.XP.get(r.kind());
        int inserted = jdbc.update("insert into learning_events (id, user_id, event_key, kind, topic, xp) values (?, ?, ?, ?, ?, ?) on conflict (user_id, event_key) do nothing",
            UUID.randomUUID(), uid, r.key(), r.kind(), r.topic(), xp);
        List<String> unlocked = new ArrayList<>();
        if (inserted == 1) {
            if (r.kind().equals("PROBLEM"))
                jdbc.update("insert into user_problem_progress (user_id, problem_slug) values (?, ?) on conflict do nothing", uid, r.key().substring("problem:".length()));
            unlocked = evaluateBadges(uid);
        }
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("awarded", inserted == 1);
        body.put("xp", inserted == 1 ? xp : 0);
        body.put("unlockedBadges", unlocked);
        return ResponseEntity.status(inserted == 1 ? HttpStatus.CREATED : HttpStatus.OK).body(body);
    }

    private List<String> evaluateBadges(UUID uid) {
        Map<String, Integer> byTopic = new HashMap<>();
        jdbc.query("select topic, kind, sum(xp) from learning_events where user_id = ? group by topic, kind", rs -> {
            byTopic.merge(rs.getString(1), rs.getInt(3), Integer::sum);
            if (rs.getString(2).equals("PROBLEM")) byTopic.merge("problems", rs.getInt(3), Integer::sum);
        }, uid);
        List<String> unlocked = new ArrayList<>();
        for (ProgressRules.Badge b : ProgressRules.BADGES) {
            int have = b.topics().stream().mapToInt(t -> byTopic.getOrDefault(t, 0)).sum();
            if (have >= b.threshold() && jdbc.update("insert into user_achievements (user_id, badge_id) values (?, ?) on conflict do nothing", uid, b.id()) == 1)
                unlocked.add(b.id());
        }
        return unlocked;
    }

    public record Achievement(String badgeId, Instant unlockedAt) {}

    @GetMapping("/achievements")
    public List<Achievement> achievements() {
        return jdbc.query("select badge_id, unlocked_at from user_achievements where user_id = ? order by unlocked_at",
            (rs, i) -> new Achievement(rs.getString(1), rs.getTimestamp(2).toInstant()), CurrentUser.id());
    }

    // ------------------------------------------------------------ bookmarks
    public record BookmarkRequest(@NotBlank @Pattern(regexp = "^[a-z0-9-]{1,80}$") String problemSlug) {}

    @GetMapping("/bookmarks")
    public List<ProblemSummary> bookmarks() {
        List<String> slugs = jdbc.queryForList("select problem_slug from bookmarks where user_id = ? order by created_at desc", String.class, CurrentUser.id());
        try {
            Map<String, ProblemSummary> bySlug = new HashMap<>();
            catalog.summaries(slugs).forEach(s -> bySlug.put(s.slug(), s));
            return slugs.stream().filter(bySlug::containsKey).map(bySlug::get).toList();
        } catch (RestClientException e) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "CATALOG_UNAVAILABLE", "Problem catalog is unavailable");
        }
    }

    @PostMapping("/bookmarks")
    public ResponseEntity<Void> addBookmark(@Valid @RequestBody BookmarkRequest r) {
        List<ProblemSummary> found;
        try {
            found = catalog.summaries(List.of(r.problemSlug()));
        } catch (RestClientException e) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "CATALOG_UNAVAILABLE", "Problem catalog is unavailable");
        }
        if (found.isEmpty()) throw ApiException.notFound("Problem");
        jdbc.update("insert into bookmarks (user_id, problem_slug) values (?, ?) on conflict do nothing", CurrentUser.id(), r.problemSlug());
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @DeleteMapping("/bookmarks/{slug}")
    public ResponseEntity<Void> removeBookmark(@PathVariable String slug) {
        jdbc.update("delete from bookmarks where user_id = ? and problem_slug = ?", CurrentUser.id(), slug);
        return ResponseEntity.noContent().build();
    }

    // ------------------------------------------------------------ saved sessions / history
    public record SessionRequest(@NotBlank @Pattern(regexp = "VISUALIZATION|SOLUTION") String type, @NotBlank @Size(max = 120) String title,
                                 @NotBlank @Pattern(regexp = "^[A-Za-z0-9-]{1,80}$") String reference, @NotNull JsonNode payload) {}

    public record SessionDto(UUID id, String type, String title, String reference, JsonNode payload, Instant createdAt) {}

    private SessionDto dto(SavedSession s) {
        try {
            return new SessionDto(s.getId(), s.getType(), s.getTitle(), s.getReference(), mapper.readTree(s.getPayload()), s.getCreatedAt());
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    @GetMapping("/history")
    public List<SessionDto> history() {
        return sessions.findByUserIdOrderByCreatedAtDesc(CurrentUser.id(), PageRequest.of(0, 100)).stream().map(this::dto).toList();
    }

    @PostMapping("/sessions")
    @Transactional
    public ResponseEntity<SessionDto> save(@Valid @RequestBody SessionRequest r) {
        UUID uid = CurrentUser.id();
        String payload = r.payload().toString();
        if (!r.payload().isObject() || payload.length() > 16_384) throw new ApiException(HttpStatus.BAD_REQUEST, "PAYLOAD_TOO_LARGE", "Session payload must be a JSON object under 16 KB");
        if (sessions.countByUserId(uid) >= MAX_SESSIONS) throw new ApiException(HttpStatus.CONFLICT, "SESSION_LIMIT", "Saved-session limit reached; delete some first");
        return ResponseEntity.status(HttpStatus.CREATED).body(dto(sessions.save(new SavedSession(uid, r.type(), r.title(), r.reference(), payload))));
    }

    /** Ownership check: other users' sessions are reported as not found, never as forbidden, to avoid leaking existence. */
    @GetMapping("/sessions/{id}")
    public SessionDto session(@PathVariable UUID id) {
        return sessions.findByIdAndUserId(id, CurrentUser.id()).map(this::dto).orElseThrow(() -> ApiException.notFound("Session"));
    }

    @DeleteMapping("/sessions/{id}")
    @Transactional
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        SavedSession s = sessions.findByIdAndUserId(id, CurrentUser.id()).orElseThrow(() -> ApiException.notFound("Session"));
        sessions.delete(s);
        return ResponseEntity.noContent().build();
    }
}
