package com.toptennis.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;

@Component
public class ApiRateLimiterFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(ApiRateLimiterFilter.class);
    private final RateLimitingService rateLimitingService;

    public ApiRateLimiterFilter(RateLimitingService rateLimitingService) {
        this.rateLimitingService = rateLimitingService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        
        String path = request.getRequestURI();
        // Doar rutele de API sunt filtrate de scrapping/bots
        if (path.startsWith("/api/")) {
            String ip = getClientIp(request);
            try {
                // Generos: maxim 150 request-uri pe minut per IP global pentru preventia scrape-ului.
                // Endpoint-urile individuale sensibile pot avea propriile check-uri mai stricte în Controllere.
                rateLimitingService.checkRateLimit("ip_" + ip, 150, 1);
            } catch (RuntimeException e) {
                // Too Many Requests
                log.warn("BLOCKED TRAFFIC ABUSE: IP {} exceeded global API rate limits.", ip);
                response.setStatus(429);
                response.setContentType("text/plain;charset=UTF-8");
                response.getWriter().write(e.getMessage());
                return;
            }
        }
        
        filterChain.doFilter(request, response);
    }

    private String getClientIp(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null || xfHeader.isEmpty() || !xfHeader.contains(request.getRemoteAddr())) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0];
    }
}
