package com.toptennis.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig {
    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**")
                        .allowedOrigins("http://localhost:5173")
                        .allowedOriginPatterns("https://*.trycloudflare.com")
                        .allowedMethods("GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS")
                        .allowedHeaders("Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With")
                        .exposedHeaders("WWW-Authenticate")
                        .allowCredentials(true);
            }

            @Override
            public void addResourceHandlers(ResourceHandlerRegistry registry) {
                // sw.js and index.html must never be cached so browsers always get the latest SW
                registry.addResourceHandler("/sw.js", "/index.html", "/workbox-*.js")
                        .addResourceLocations("classpath:/static/")
                        .setCacheControl(CacheControl.noCache().mustRevalidate());
            }
        };
    }
}
