package dev.algomotion.users.auth;

import dev.algomotion.shared.security.JwtProperties;
import dev.algomotion.users.domain.RefreshToken;
import dev.algomotion.users.domain.Repositories.RefreshTokenRepository;
import dev.algomotion.users.domain.User;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

@Service
public class TokenService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private final JwtEncoder encoder;
    private final JwtProperties props;
    private final RefreshTokenRepository refreshTokens;

    public TokenService(JwtEncoder encoder, JwtProperties props, RefreshTokenRepository refreshTokens) {
        this.encoder = encoder;
        this.props = props;
        this.refreshTokens = refreshTokens;
    }

    /** Short-lived HS256 access token; subject = user id. */
    public String accessToken(User u) {
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder().issuer(props.issuer()).subject(u.getId().toString()).issuedAt(now)
            .expiresAt(now.plusSeconds(props.accessTtlSeconds())).claim("name", u.getDisplayName()).build();
        return encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
    }

    /** Opaque random refresh token; only its SHA-256 hash is stored. */
    public String issueRefresh(User u) {
        byte[] b = new byte[32];
        RANDOM.nextBytes(b);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(b);
        refreshTokens.save(new RefreshToken(u.getId(), hash(token), Instant.now().plusSeconds(props.refreshTtlSeconds())));
        return token;
    }

    public long refreshTtl() { return props.refreshTtlSeconds(); }

    public static String hash(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
