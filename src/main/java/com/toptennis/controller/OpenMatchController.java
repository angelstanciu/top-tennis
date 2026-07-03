package com.toptennis.controller;

import com.toptennis.dto.OpenMatchDto;
import com.toptennis.model.Booking;
import com.toptennis.model.OpenMatch;
import com.toptennis.service.OpenMatchService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/open-matches")
public class OpenMatchController {

    private final OpenMatchService openMatchService;

    /** Grupul WhatsApp al comunitatii de padel — afisat organizatorului dupa crearea meciului. */
    @org.springframework.beans.factory.annotation.Value("${app.padel-whatsapp-group:}")
    private String padelWhatsappGroupUrl;

    public OpenMatchController(OpenMatchService openMatchService) {
        this.openMatchService = openMatchService;
    }

    public record CreateOpenMatchRequest(
            @NotNull Long courtId,
            @NotBlank String date,
            @NotBlank String startTime,
            @NotBlank String endTime,
            @NotBlank @Size(max = 100) String customerName,
            @NotBlank @Pattern(regexp = "^\\+?[0-9\\s-]{9,15}$") String customerPhone,
            @Email String customerEmail,
            @NotNull @Min(2) @Max(3) Integer groupSize,
            @NotNull @Min(0) @Max(5) Integer targetLevelRank) {}

    @PostMapping
    public Map<String, Object> create(
            @RequestHeader("Authorization") String token,
            @RequestBody @Valid CreateOpenMatchRequest req) {
        LocalDate date;
        LocalTime start;
        LocalTime end;
        try {
            date = LocalDate.parse(req.date());
            start = LocalTime.parse(req.startTime());
            end = "24:00".equals(req.endTime()) ? LocalTime.of(23, 59) : LocalTime.parse(req.endTime());
        } catch (DateTimeParseException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Data sau ora este invalida.");
        }

        try {
            OpenMatchService.CreateResult result = openMatchService.createOpenMatch(
                    token, req.courtId(), date, start, end,
                    req.customerName(), req.customerPhone(), req.customerEmail(),
                    req.groupSize(), req.targetLevelRank());
            Booking booking = result.booking();
            OpenMatch match = result.match();
            return Map.of(
                    "matchId", match.getId(),
                    "bookingId", booking.getId(),
                    "bookingStatus", booking.getStatus().name(),
                    "whatsappText", result.whatsappText(),
                    "whatsappGroupUrl", padelWhatsappGroupUrl == null ? "" : padelWhatsappGroupUrl
            );
        } catch (IllegalArgumentException e) {
            // erorile de validare din BookingService (suprapuneri, goluri etc.)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    @PostMapping("/{id}/join")
    public Map<String, Object> join(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id) {
        OpenMatch match = openMatchService.joinMatch(token, id);
        return Map.of(
                "matchId", match.getId(),
                "status", match.getStatus().name()
        );
    }

    @GetMapping
    public List<OpenMatchDto> list(
            @RequestHeader(value = "Authorization", required = false) String token) {
        return openMatchService.listUpcoming(token);
    }

    public record TakeoverRequest(
            @NotBlank @Size(max = 100) String customerName,
            @NotBlank @Pattern(regexp = "^\\+?[0-9\\s-]{9,15}$") String customerPhone,
            @Email String customerEmail) {}

    /** O echipa completa preia intervalul unui meci deschis (doar in ultimele 6 ore). */
    @PostMapping("/{id}/takeover")
    public Map<String, Object> takeover(
            @RequestHeader(value = "Authorization", required = false) String token,
            @PathVariable Long id,
            @RequestBody @Valid TakeoverRequest req) {
        try {
            OpenMatchService.TakeoverResult result = openMatchService.takeoverMatch(
                    token, id, req.customerName(), req.customerPhone(), req.customerEmail());
            return Map.of(
                    "bookingId", result.newBooking().getId(),
                    "bookingStatus", result.newBooking().getStatus().name()
            );
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }
}
