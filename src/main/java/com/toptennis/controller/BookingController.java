package com.toptennis.controller;

import com.toptennis.dto.BookingDto;
import com.toptennis.dto.CreateBookingRequest;
import com.toptennis.mapper.BookingMapper;
import com.toptennis.model.Booking;
import com.toptennis.service.BookingService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {
    private final BookingService bookingService;
    private final com.toptennis.service.PlayerAuthService playerAuthService;

    public BookingController(BookingService bookingService, com.toptennis.service.PlayerAuthService playerAuthService) {
        this.bookingService = bookingService;
        this.playerAuthService = playerAuthService;
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
        
        com.toptennis.model.PaymentMethod requestedMethod = com.toptennis.model.PaymentMethod.CASH;
        if (req.paymentMethod != null && req.paymentMethod.trim().equalsIgnoreCase("CARD_ONLINE")) {
            requestedMethod = com.toptennis.model.PaymentMethod.CARD_ONLINE;
        }
        
        Booking b = bookingService.createPublic(req.courtId, date, start, end, req.customerName, req.customerPhone, req.customerEmail, token, req.bypassDoubleBooking, requestedMethod);
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
