package dev.algomotion.users.auth;

import dev.algomotion.shared.web.ApiException;
import dev.algomotion.users.UserServiceProperties;
import dev.algomotion.users.domain.RefreshToken;
import dev.algomotion.users.domain.Repositories.RefreshTokenRepository;
import dev.algomotion.users.domain.Repositories.UserRepository;
import dev.algomotion.users.domain.User;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Duration;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Authentication")
public class AuthController {
    private static final Logger log = LoggerFactory.getLogger(AuthController.class);
    static final String COOKIE = "am_refresh";

    private final UserRepository users;
    private final RefreshTokenRepository refreshTokens;
    private final PasswordEncoder encoder;
    private final TokenService tokens;
    private final UserServiceProperties props;

    public AuthController(UserRepository users, RefreshTokenRepository refreshTokens, PasswordEncoder encoder, TokenService tokens, UserServiceProperties props) {
        this.users = users;
        this.refreshTokens = refreshTokens;
        this.encoder = encoder;
        this.tokens = tokens;
        this.props = props;
        this.dummyHash = encoder.encode("timing-equaliser-not-a-real-password-1");
    }

    /** Compared against when the email does not exist, so both paths cost one BCrypt check. */
    private final String dummyHash;

    public record RegisterRequest(@NotBlank @Email @Size(max = 254) String email,
                                  @NotBlank @Size(min = 8, max = 128) @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d).+$", message = "must contain a letter and a number") String password,
                                  @NotBlank @Size(min = 2, max = 40) @Pattern(regexp = "^[\\p{L}\\p{N} _.-]+$", message = "may contain letters, numbers, spaces, _ . -") String displayName) {}

    public record LoginRequest(@NotBlank @Size(max = 254) String email, @NotBlank @Size(max = 128) String password) {}

    public record UserDto(UUID id, String email, String displayName) {
        static UserDto of(User u) { return new UserDto(u.getId(), u.getEmail(), u.getDisplayName()); }
    }

    public record AuthResponse(String accessToken, UserDto user) {}

    private ResponseEntity<AuthResponse> issue(User u, HttpStatus status) {
        ResponseCookie c = ResponseCookie.from(COOKIE, tokens.issueRefresh(u)).httpOnly(true).secure(props.cookieSecure())
            .sameSite("Strict").path("/api/v1/auth").maxAge(Duration.ofSeconds(tokens.refreshTtl())).build();
        return ResponseEntity.status(status).header(HttpHeaders.SET_COOKIE, c.toString()).body(new AuthResponse(tokens.accessToken(u), UserDto.of(u)));
    }

    private ResponseCookie clearCookie() {
        return ResponseCookie.from(COOKIE, "").httpOnly(true).secure(props.cookieSecure()).sameSite("Strict").path("/api/v1/auth").maxAge(0).build();
    }

    @PostMapping("/register")
    @Transactional
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest r) {
        String email = r.email().trim().toLowerCase();
        if (users.findByEmailIgnoreCase(email).isPresent())
            throw new ApiException(HttpStatus.CONFLICT, "EMAIL_TAKEN", "An account with this email already exists");
        User u = users.save(new User(email, encoder.encode(r.password()), r.displayName().trim()));
        log.info("User registered id={}", u.getId());
        return issue(u, HttpStatus.CREATED);
    }

    @PostMapping("/login")
    @Transactional
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest r) {
        User u = users.findByEmailIgnoreCase(r.email().trim()).orElse(null);
        boolean ok = encoder.matches(r.password(), u == null ? dummyHash : u.getPasswordHash());
        if (u == null || !ok) throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Invalid email or password");
        return issue(u, HttpStatus.OK);
    }

    /** Rotates the refresh token. Presenting an already-revoked token revokes every session of that user (token theft signal). */
    @PostMapping("/refresh")
    @Transactional(noRollbackFor = ApiException.class)
    public ResponseEntity<AuthResponse> refresh(@CookieValue(name = COOKIE, required = false) String cookie) {
        if (cookie == null || cookie.isBlank()) throw new ApiException(HttpStatus.UNAUTHORIZED, "NO_SESSION", "No refresh session");
        RefreshToken t = refreshTokens.findByTokenHash(TokenService.hash(cookie))
            .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "NO_SESSION", "No refresh session"));
        if (t.isRevoked()) {
            refreshTokens.revokeAllForUser(t.getUserId());
            log.warn("Refresh token reuse detected for user {} — all sessions revoked", t.getUserId());
            throw new ApiException(HttpStatus.UNAUTHORIZED, "NO_SESSION", "Session expired");
        }
        if (!t.isActive()) throw new ApiException(HttpStatus.UNAUTHORIZED, "NO_SESSION", "Session expired");
        t.revoke();
        User u = users.findById(t.getUserId()).orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "NO_SESSION", "Session expired"));
        return issue(u, HttpStatus.OK);
    }

    @PostMapping("/logout")
    @Transactional
    public ResponseEntity<Void> logout(@CookieValue(name = COOKIE, required = false) String cookie) {
        if (cookie != null) refreshTokens.findByTokenHash(TokenService.hash(cookie)).ifPresent(RefreshToken::revoke);
        return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE, clearCookie().toString()).build();
    }
}
