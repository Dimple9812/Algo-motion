package dev.algomotion.shared.security;

import java.util.UUID;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import dev.algomotion.shared.web.ApiException;
import org.springframework.http.HttpStatus;

public final class CurrentUser {
    private CurrentUser() {}

    /** The authenticated user's id (JWT subject). Ownership checks compare against this. */
    public static UUID id() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth instanceof JwtAuthenticationToken jwt) return UUID.fromString(jwt.getToken().getSubject());
        throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Authentication required");
    }

    public static UUID idOrNull() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        return auth instanceof JwtAuthenticationToken jwt ? UUID.fromString(jwt.getToken().getSubject()) : null;
    }
}
