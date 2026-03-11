package com.toptennis.controller;

import com.toptennis.model.PlayerUser;
import com.toptennis.model.SubscriptionRequest;
import com.toptennis.model.SubscriptionStatus;
import com.toptennis.service.PlayerAuthService;
import com.toptennis.service.SubscriptionRequestService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class SubscriptionRequestController {

    @Autowired
    private SubscriptionRequestService service;

    @Autowired
    private PlayerAuthService playerAuthService;

    @PostMapping("/player/subscriptions/request")
    public ResponseEntity<?> createRequest(@RequestHeader("Authorization") String token, @RequestBody SubscriptionRequest request) {
        try {
            PlayerUser player = playerAuthService.getUserByToken(token)
                .orElseThrow(() -> new RuntimeException("Utilizator neautorizat sau sesiune expirată."));
            request.setPlayer(player);
            return ResponseEntity.ok(service.createRequest(request));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(e.getMessage());
        }
    }

    @GetMapping("/admin/subscriptions/requests")
    public ResponseEntity<List<SubscriptionRequest>> getAllRequests() {
        return ResponseEntity.ok(service.getAllRequests());
    }

    @PostMapping("/admin/subscriptions/requests/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        try {
            SubscriptionStatus status = SubscriptionStatus.valueOf(payload.get("status"));
            return ResponseEntity.ok(service.updateStatus(id, status));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
