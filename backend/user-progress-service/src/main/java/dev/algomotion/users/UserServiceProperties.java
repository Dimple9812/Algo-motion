package dev.algomotion.users;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("user-service")
public record UserServiceProperties(String catalogUrl, boolean cookieSecure) {}
