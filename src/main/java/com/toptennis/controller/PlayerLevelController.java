package com.toptennis.controller;

import com.toptennis.model.PlayerSkillLevel;
import com.toptennis.model.PlayerUser;
import com.toptennis.model.SkillLevel;
import com.toptennis.model.SportType;
import com.toptennis.service.OpenMatchService;
import com.toptennis.service.PlayerAuthService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.Map;

/** Nivelul de joc al jucatorului autentificat, per sport. */
@RestController
@RequestMapping("/api/player/level")
public class PlayerLevelController {

    private final OpenMatchService openMatchService;
    private final PlayerAuthService playerAuthService;

    public PlayerLevelController(OpenMatchService openMatchService, PlayerAuthService playerAuthService) {
        this.openMatchService = openMatchService;
        this.playerAuthService = playerAuthService;
    }

    @GetMapping
    public Map<String, Object> getLevel(
            @RequestHeader("Authorization") String token,
            @RequestParam(defaultValue = "PADEL") String sport) {
        PlayerUser user = requireUser(token);
        SportType sportType = parseSport(sport);
        Map<String, Object> body = new HashMap<>();
        body.put("sportType", sportType.name());
        openMatchService.getLevel(user.getId(), sportType).ifPresentOrElse(psl -> {
            body.put("levelRank", psl.getLevelRank());
            body.put("label", SkillLevel.fromRank(psl.getLevelRank()).getLabel());
        }, () -> {
            body.put("levelRank", null);
            body.put("label", null);
        });
        return body;
    }

    public record SetLevelRequest(
            @NotBlank String sportType,
            @NotNull @Min(0) @Max(5) Integer levelRank) {}

    @PutMapping
    public Map<String, Object> setLevel(
            @RequestHeader("Authorization") String token,
            @RequestBody @Valid SetLevelRequest req) {
        PlayerUser user = requireUser(token);
        SportType sportType = parseSport(req.sportType());
        PlayerSkillLevel saved = openMatchService.setLevel(user, sportType, req.levelRank());
        Map<String, Object> body = new HashMap<>();
        body.put("sportType", saved.getSportType().name());
        body.put("levelRank", saved.getLevelRank());
        body.put("label", SkillLevel.fromRank(saved.getLevelRank()).getLabel());
        return body;
    }

    private PlayerUser requireUser(String token) {
        return playerAuthService.getUserByToken(token)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token invalid sau expirat."));
    }

    private SportType parseSport(String raw) {
        try {
            return SportType.valueOf(raw.toUpperCase());
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sport invalid.");
        }
    }
}
