package dev.algomotion.shared.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.slf4j.MDC;
import org.springframework.web.filter.OncePerRequestFilter;

/** Propagates X-Correlation-Id into the logging MDC and the response. */
public class CorrelationIdFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain) throws ServletException, IOException {
        String id = CorrelationId.sanitize(req.getHeader(CorrelationId.HEADER));
        MDC.put(CorrelationId.MDC_KEY, id);
        res.setHeader(CorrelationId.HEADER, id);
        try {
            chain.doFilter(req, res);
        } finally {
            MDC.remove(CorrelationId.MDC_KEY);
        }
    }
}
