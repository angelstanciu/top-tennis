package com.toptennis.controller;

import com.toptennis.model.Booking;
import com.toptennis.model.PlayerUser;
import com.toptennis.service.BookingService;
import com.toptennis.service.PlayerAuthService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/player")
public class PlayerAuthController {

    private final PlayerAuthService playerAuthService;
    private final BookingService bookingService;

    public PlayerAuthController(PlayerAuthService playerAuthService, BookingService bookingService) {
        this.playerAuthService = playerAuthService;
        this.bookingService = bookingService;
    }

    public record PhoneRequest(String phone) {}

    @PostMapping("/auth/request-otp")
    public void requestOtp(@RequestBody PhoneRequest req) {
        if (req.phone() == null || req.phone().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Numărul de telefon este obligatoriu.");
        }
        playerAuthService.requestOtp(req.phone());
    }

    public record VerifyRequest(String phone, String otp) {}
    public record TokenResponse(String token, PlayerUser user) {}

    @PostMapping("/auth/verify-otp")
    public TokenResponse verifyOtp(@RequestBody VerifyRequest req) {
        try {
            String token = playerAuthService.verifyOtp(req.phone(), req.otp());
            PlayerUser user = playerAuthService.getUserByToken("Bearer " + token).orElseThrow();
            return new TokenResponse(token, user);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    public record RegisterRequest(String phone, String password, String fullName) {}

    @PostMapping("/auth/register")
    public TokenResponse register(@RequestBody RegisterRequest req) {
        try {
            String token = playerAuthService.register(req.phone(), req.password(), req.fullName());
            PlayerUser user = playerAuthService.getUserByToken("Bearer " + token).orElseThrow();
            return new TokenResponse(token, user);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    public record LoginRequest(String phone, String password) {}

    @PostMapping("/auth/login")
    public TokenResponse login(@RequestBody LoginRequest req) {
        try {
            String token = playerAuthService.login(req.phone(), req.password());
            PlayerUser user = playerAuthService.getUserByToken("Bearer " + token).orElseThrow();
            return new TokenResponse(token, user);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    @GetMapping("/me")
    public PlayerUser getMe(@RequestHeader("Authorization") String token) {
        return playerAuthService.getUserByToken(token)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token invalid sau expirat."));
    }

    @GetMapping("/history")
    public List<Booking> getHistory(@RequestHeader("Authorization") String token) {
        PlayerUser user = playerAuthService.getUserByToken(token)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token invalid."));
        return bookingService.getPlayerHistory(user.getId());
    }

    public record UpdateProfileRequest(String fullName, String email, String phoneNumber, String preferredSport, Integer age, String gender, String avatarUrl) {}

    @PostMapping("/auth/update-profile")
    public PlayerUser updateProfile(
            @RequestHeader("Authorization") String token,
            @RequestBody UpdateProfileRequest req) {
        PlayerUser user = playerAuthService.getUserByToken(token)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token invalid."));
        return playerAuthService.updateProfile(user.getId(), req.fullName(), req.email(), req.phoneNumber(), req.preferredSport(), req.age(), req.gender(), req.avatarUrl());
    }

    @PostMapping("/auth/link-phone")
    public PlayerUser linkPhone(
            @RequestHeader("Authorization") String token,
            @RequestBody VerifyRequest req) {
        PlayerUser user = playerAuthService.getUserByToken(token)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token invalid."));
        try {
            return playerAuthService.linkPhoneNumber(user.getId(), req.phone(), req.otp());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    public record FacebookRequest(String accessToken) {}

    @PostMapping("/auth/facebook")
    public TokenResponse loginWithFacebook(@RequestBody FacebookRequest req) {
        try {
            String token = playerAuthService.loginOrRegisterWithFacebook(req.accessToken());
            PlayerUser user = playerAuthService.getUserByToken("Bearer " + token).orElseThrow();
            return new TokenResponse(token, user);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    @PostMapping("/auth/google")
    public TokenResponse loginWithGoogle(@RequestBody GoogleAuthRequest req) {
        try {
            String token = playerAuthService.loginOrRegisterWithGoogle(req.credential());
            PlayerUser user = playerAuthService.getUserByToken("Bearer " + token).orElseThrow();
            return new TokenResponse(token, user);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        } catch (java.security.GeneralSecurityException | java.io.IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Eroare la comunicarea cu Google.");
        }
    }

    public record GoogleAuthRequest(String credential) {}
}
