package com.toptennis.controller;

import com.toptennis.dto.BookingDto;
import com.toptennis.mapper.BookingMapper;
import com.toptennis.model.Booking;
import com.toptennis.model.PlayerUser;
import com.toptennis.security.RateLimitingService;
import com.toptennis.service.BookingService;
import com.toptennis.service.PlayerAuthService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import jakarta.validation.constraints.*;
import jakarta.validation.Valid;

import java.util.List;

@RestController
@RequestMapping("/api/player")
public class PlayerAuthController {

    private final PlayerAuthService playerAuthService;
    private final BookingService bookingService;
    private final RateLimitingService rateLimitingService;

    public PlayerAuthController(PlayerAuthService playerAuthService, BookingService bookingService, RateLimitingService rateLimitingService) {
        this.playerAuthService = playerAuthService;
        this.bookingService = bookingService;
        this.rateLimitingService = rateLimitingService;
    }

    public record PhoneRequest(@NotBlank @Pattern(regexp = "^\\+?[0-9\\s]{9,15}$") String phone) {}

    @PostMapping("/auth/request-otp")
    public void requestOtp(@RequestBody @Valid PhoneRequest req) {
        if (req.phone() == null || req.phone().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Numărul de telefon este obligatoriu.");
        }
        try {
            rateLimitingService.checkRateLimit("otp_" + req.phone());
            playerAuthService.requestOtp(req.phone());
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, e.getMessage());
        }
    }

    public record VerifyRequest(@NotBlank @Pattern(regexp = "^\\+?[0-9\\s]{9,15}$") String phone, @NotBlank @Size(min=6, max=6) String otp) {}
    public record TokenResponse(String token, PlayerUser user) {}

    @PostMapping("/auth/verify-otp")
    public TokenResponse verifyOtp(@RequestBody @Valid VerifyRequest req) {
        try {
            String token = playerAuthService.verifyOtp(req.phone(), req.otp());
            PlayerUser user = playerAuthService.getUserByToken("Bearer " + token).orElseThrow();
            return new TokenResponse(token, user);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    public record RegisterRequest(
            @NotBlank @Size(max=20) @Pattern(regexp = "^\\+?[0-9\\s]{9,15}$") String phone, 
            @NotBlank String password, 
            @NotBlank @Size(min=2, max=50) @Pattern(regexp = "^[^<>%$]+$", message="Numele conține caractere invalide") String fullName, 
            @Email String email) {}

    @PostMapping("/auth/register")
    public TokenResponse register(@RequestBody @Valid RegisterRequest req) {
        try {
            rateLimitingService.checkRateLimit("reg_" + req.phone());
            String token = playerAuthService.register(req.phone(), req.password(), req.fullName(), req.email());
            PlayerUser user = playerAuthService.getUserByToken("Bearer " + token).orElseThrow();
            rateLimitingService.resetLimit("reg_" + req.phone());
            return new TokenResponse(token, user);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, e.getMessage());
        }
    }

    public record LoginRequest(@NotBlank String identifier, @NotBlank String password) {}

    @PostMapping("/auth/login")
    public TokenResponse login(@RequestBody @Valid LoginRequest req) {
        try {
            rateLimitingService.checkRateLimit("login_" + req.identifier());
            String token = playerAuthService.login(req.identifier(), req.password());
            PlayerUser user = playerAuthService.getUserByToken("Bearer " + token).orElseThrow();
            rateLimitingService.resetLimit("login_" + req.identifier());
            return new TokenResponse(token, user);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, e.getMessage());
        }
    }

    public record ForgotPasswordRequest(@NotBlank String identifier) {}
    public record ResetPasswordRequest(@NotBlank String identifier, @NotBlank String otp, @NotBlank @Size(min=6) String newPassword) {}

    @PostMapping("/auth/forgot-password")
    public void forgotPassword(@RequestBody @Valid ForgotPasswordRequest req) {
        try {
            rateLimitingService.checkRateLimit("forgot_" + req.identifier());
            playerAuthService.forgotPassword(req.identifier());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, e.getMessage());
        }
    }

    @PostMapping("/auth/reset-password")
    public void resetPassword(@RequestBody @Valid ResetPasswordRequest req) {
        try {
            rateLimitingService.checkRateLimit("reset_" + req.identifier());
            playerAuthService.resetPassword(req.identifier(), req.otp(), req.newPassword());
            rateLimitingService.resetLimit("reset_" + req.identifier());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, e.getMessage());
        }
    }

    @GetMapping("/me")
    public PlayerUser getMe(@RequestHeader("Authorization") String token) {
        PlayerUser user = playerAuthService.getUserByToken(token)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token invalid sau expirat."));
        // Compute matches played dynamically (past, non-cancelled bookings)
        long matches = bookingService.countMatchesPlayed(user.getId());
        user.setMatchesPlayed((int) matches);
        return user;
    }

    @GetMapping("/history")
    public List<BookingDto> getHistory(@RequestHeader("Authorization") String token) {
        PlayerUser user = playerAuthService.getUserByToken(token)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token invalid."));
        return bookingService.getPlayerHistory(user.getId()).stream()
                .map(BookingMapper::toDto)
                .toList();
    }

    public record UpdateProfileRequest(
            @NotBlank @Size(min=2, max=50) @Pattern(regexp = "^[^<>%$]+$", message="Nume invalid") String fullName, 
            @Email String email, 
            @Pattern(regexp = "^\\+?[0-9\\s]{9,15}$") String phoneNumber, 
            String preferredSport, Integer age, String gender, String avatarUrl) {}

    @PostMapping("/auth/update-profile")
    public PlayerUser updateProfile(
            @RequestHeader("Authorization") String token,
            @RequestBody @Valid UpdateProfileRequest req) {
        PlayerUser user = playerAuthService.getUserByToken(token)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token invalid."));
        return playerAuthService.updateProfile(user.getId(), req.fullName(), req.email(), req.phoneNumber(), req.preferredSport(), req.age(), req.gender(), req.avatarUrl());
    }

    @PostMapping("/auth/link-phone")
    public PlayerUser linkPhone(
            @RequestHeader("Authorization") String token,
            @RequestBody @Valid VerifyRequest req) {
        PlayerUser user = playerAuthService.getUserByToken(token)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token invalid."));
        try {
            return playerAuthService.linkPhoneNumber(user.getId(), req.phone(), req.otp());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    @PostMapping("/auth/verify-phone")
    public PlayerUser verifyPhone(
            @RequestHeader("Authorization") String token,
            @RequestBody @Valid VerifyRequest req) {
        PlayerUser user = playerAuthService.getUserByToken(token)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token invalid."));
        try {
            return playerAuthService.verifyPhoneNumber(user.getId(), req.otp());
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
