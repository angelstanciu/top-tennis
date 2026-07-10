package com.toptennis.controller;

import com.toptennis.dto.BookingDto;
import com.toptennis.dto.CreateBookingRequest;
import com.toptennis.mapper.BookingMapper;
import com.toptennis.model.Booking;
import com.toptennis.service.BookingService;
import com.toptennis.service.BookingSseBroadcaster;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDate;
import java.time.LocalTime;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {
    private final BookingService bookingService;
    private final com.toptennis.service.PlayerAuthService playerAuthService;
    private final BookingSseBroadcaster bookingSseBroadcaster;

    public BookingController(BookingService bookingService, com.toptennis.service.PlayerAuthService playerAuthService, BookingSseBroadcaster bookingSseBroadcaster) {
        this.bookingService = bookingService;
        this.playerAuthService = playerAuthService;
        this.bookingSseBroadcaster = bookingSseBroadcaster;
    }

    // Grid clients subscribe here to get live push updates instead of polling/refreshing.
    // Nginx buffers proxied responses by default, which silently holds back SSE
    // events instead of forwarding them as they're written — X-Accel-Buffering
    // tells it to stream this response through untouched. Cache-Control keeps any
    // intermediary from caching the (never-ending) response body.
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(HttpServletResponse response) {
        response.setHeader("X-Accel-Buffering", "no");
        response.setHeader("Cache-Control", "no-cache");
        return bookingSseBroadcaster.subscribe();
    }

    @PostMapping
    public BookingDto create(
            @RequestHeader(value = "Authorization", required = false) String token,
            @RequestBody @Valid CreateBookingRequest req) {
        LocalDate date = LocalDate.parse(req.date);
        LocalTime start = LocalTime.parse(req.startTime);
        LocalTime end;
        if ("24:00".equals(req.endTime)) {
            end = LocalTime.of(23, 59); // treat end-of-day as 23:59
        } else {
            end = LocalTime.parse(req.endTime);
        }
        
        Booking b = bookingService.createPublic(req.courtId, date, start, end, req.customerName, req.customerPhone, req.customerEmail, token, req.bypassDoubleBooking);
        return BookingMapper.toDto(b);
    }

    @GetMapping("/{id}")
    public BookingDto get(
            @RequestHeader(value = "Authorization", required = false) String token,
            @PathVariable Long id) {
        Booking b = bookingService.get(id);
        BookingDto dto = BookingMapper.toDto(b);

        boolean isAdmin = false;
        com.toptennis.model.PlayerUser currentUser = null;
        try {
            if (token != null && token.startsWith("Bearer ")) {
                currentUser = playerAuthService.getUserByToken(token).orElse(null);
            }
            org.springframework.security.core.Authentication authentication = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
                isAdmin = true;
            }
        } catch (Exception e) {}

        boolean isOwner = currentUser != null && b.getPlayerUser() != null && b.getPlayerUser().getId().equals(currentUser.getId());
        if (!isAdmin && !isOwner && b.getStatus() != com.toptennis.model.BookingStatus.BLOCKED) {
            dto.customerName = "Ocupat";
            dto.customerPhone = null;
            dto.customerEmail = null;
        }

        return dto;
    }

    @PatchMapping("/{id}/cancel")
    public void cancel(
            @PathVariable Long id,
            @RequestHeader("Authorization") String token) {
        bookingService.cancelBooking(id, token);
    }

    @PostMapping("/cancel-public/{token}")
    public void cancelPublic(@PathVariable String token) {
        bookingService.cancelByPublicToken(token);
    }
}
