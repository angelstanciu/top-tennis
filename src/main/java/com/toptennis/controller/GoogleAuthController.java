package com.toptennis.controller;

import com.toptennis.service.PlayerAuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/player/auth")
public class GoogleAuthController {

    private final PlayerAuthService playerAuthService;

    public GoogleAuthController(PlayerAuthService playerAuthService) {
        this.playerAuthService = playerAuthService;
    }

    @PostMapping("/google")
    public ResponseEntity<?> loginWithGoogle(@RequestBody Map<String, String> body) {
        try {
            String credential = body.get("credential");
            if (credential == null || credential.isBlank()) {
                return ResponseEntity.badRequest().body("Credential is required");
            }

            String token = playerAuthService.loginOrRegisterWithGoogle(credential);
            
            return playerAuthService.getUserByToken("Bearer " + token)
                    .map(user -> ResponseEntity.ok(Map.of("token", token, "user", user)))
                    .orElse(ResponseEntity.internalServerError().build());
                    
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
