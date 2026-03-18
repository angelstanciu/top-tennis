package com.toptennis.security;

import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RateLimitingService {
    
    private static class RateLimitData {
        int attempts;
        LocalDateTime resetTime;
        
        RateLimitData(int attempts, LocalDateTime resetTime) {
            this.attempts = attempts;
            this.resetTime = resetTime;
        }
    }

    private final Map<String, RateLimitData> cache = new ConcurrentHashMap<>();

    private final int MAX_ATTEMPTS = 5;
    private final int RESET_MINUTES = 1;

    public void checkRateLimit(String key) {
        checkRateLimit(key, MAX_ATTEMPTS, RESET_MINUTES);
    }

    public void checkRateLimit(String key, int maxAttempts, int resetMinutes) {
        cleanCache();
        RateLimitData data = cache.get(key);
        if (data != null) {
            if (data.resetTime.isAfter(LocalDateTime.now())) {
                if (data.attempts >= maxAttempts) {
                    throw new RuntimeException("Prea multe interogări. Te rugăm să aștepți " + resetMinutes + " minut(e).");
                }
                data.attempts++;
            } else {
                cache.put(key, new RateLimitData(1, LocalDateTime.now().plusMinutes(resetMinutes)));
            }
        } else {
            cache.put(key, new RateLimitData(1, LocalDateTime.now().plusMinutes(resetMinutes)));
        }
    }

    public void resetLimit(String key) {
        cache.remove(key);
    }

    private void cleanCache() {
        LocalDateTime now = LocalDateTime.now();
        cache.entrySet().removeIf(entry -> entry.getValue().resetTime.isBefore(now));
    }
}
