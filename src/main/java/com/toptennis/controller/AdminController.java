package com.toptennis.controller;

import com.toptennis.dto.BookingDto;
import com.toptennis.mapper.BookingMapper;
import com.toptennis.model.SportType;
import com.toptennis.service.BookingService;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalTime;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final BookingService bookingService;
    public AdminController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @GetMapping("/bookings")
    public java.util.List<com.toptennis.dto.BookingDto> list(
            @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE)
            @org.springframework.web.bind.annotation.RequestParam java.time.LocalDate date,
            @org.springframework.web.bind.annotation.RequestParam(required = false) com.toptennis.model.SportType sportType) {
        return bookingService.findByDateAndSport(date, sportType).stream()
                .map(b -> {
                    com.toptennis.dto.BookingDto dto = com.toptennis.mapper.BookingMapper.toDto(b);
                    dto.playerCancellationsCount = bookingService.calculateOriginalCancelCount(b);
                    dto.playerNoShowCount = bookingService.calculateNoShowCount(b);
                    return dto;
                })
                .toList();
    }

    @PatchMapping("/bookings/{id}/approve")
    public BookingDto approve(@PathVariable Long id) {
        return BookingMapper.toDto(bookingService.confirm(id));
    }

    @PostMapping("/bookings/approve-all")
    public java.util.Map<String, Integer> approveAll(
            @RequestParam(required = false) SportType sportType) {
        int count = bookingService.approveAllPending(sportType);
        return java.util.Map.of("approved", count);
    }

    @PatchMapping("/bookings/{id}/reject")
    public BookingDto reject(@PathVariable Long id) {
        return BookingMapper.toDto(bookingService.cancel(id));
    }

    // Confirm endpoint removed: bookings are auto-confirmed on creation

    @PatchMapping("/bookings/{id}/cancel")
    public BookingDto cancel(@PathVariable Long id) {
        return BookingMapper.toDto(bookingService.cancel(id));
    }

    @PatchMapping("/bookings/{id}/no-show")
    public BookingDto markNoShow(@PathVariable Long id) {
        return BookingMapper.toDto(bookingService.markNoShow(id));
    }

    @PatchMapping("/bookings/{id}/restore")
    public BookingDto restore(@PathVariable Long id) {
        try {
            return BookingMapper.toDto(bookingService.restore(id));
        } catch (IllegalStateException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, e.getMessage());
        }
    }

    public record BlockRequest(@NotNull Long courtId,
                               @NotNull @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
                               @NotNull @DateTimeFormat(iso = DateTimeFormat.ISO.TIME) LocalTime startTime,
                               @NotNull @DateTimeFormat(iso = DateTimeFormat.ISO.TIME) LocalTime endTime,
                               @Size(max=255) String note) {}

    public record BlockResponse(BookingDto booking, int cancelledCount, int notifiedCount) {}

    @PostMapping("/block-slot")
    public BlockResponse block(@RequestBody @Valid BlockRequest req) {
        try {
            com.toptennis.service.BookingService.BlockResult result =
                    bookingService.block(req.courtId, req.date, req.startTime, req.endTime, req.note);
            return new BlockResponse(BookingMapper.toDto(result.blockBooking()), result.cancelledCount(), result.notifiedCount());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, e.getMessage());
        }
    }

    public record AdminCreateBookingRequest(
            @NotNull Long courtId,
            @NotNull String date,
            @NotNull String startTime,
            @NotNull String endTime,
            @NotNull @Size(max=100) String customerName,
            @Size(max=20) String customerPhone,
            @Size(max=36) String subscriptionKey) {}

    @PostMapping("/bookings")
    public BookingDto createBooking(@RequestBody @Valid AdminCreateBookingRequest req) {
        try {
            java.time.LocalDate date = java.time.LocalDate.parse(req.date);
            java.time.LocalTime start = java.time.LocalTime.parse(req.startTime);
            java.time.LocalTime end = "24:00".equals(req.endTime) ? java.time.LocalTime.of(23, 59) : java.time.LocalTime.parse(req.endTime);
            return BookingMapper.toDto(bookingService.createPublicAdmin(
                    req.courtId, date, start, end, req.customerName,
                    req.customerPhone != null ? req.customerPhone : "0000000000",
                    null, null, null, true, req.subscriptionKey));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, e.getMessage());
        }
    }

    @GetMapping("/subscriptions")
    public java.util.List<com.toptennis.dto.SubscriptionSummaryDto> listSubscriptions() {
        return bookingService.listActiveSubscriptions();
    }

    public record CancelSubscriptionRequest(@NotNull java.util.List<Long> bookingIds) {}

    @PostMapping("/subscriptions/cancel")
    public java.util.Map<String, Integer> cancelSubscription(@RequestBody @Valid CancelSubscriptionRequest req) {
        int count = bookingService.cancelSubscription(req.bookingIds());
        return java.util.Map.of("cancelled", count);
    }

    @DeleteMapping("/bookings/cancel-future-by-phone")
    public int cancelFutureByPhone(@RequestParam String phone) {
        return bookingService.cancelFutureBookingsByPhone(phone);
    }

    @DeleteMapping("/bookings/cancel-all-future")
    public int cancelAllFuture() {
        return bookingService.cancelAllFutureBookings();
    }

    @GetMapping("/debug/all")
    public java.util.List<BookingDto> debugAll() {
        return bookingService.getBookingRepository().findAll().stream()
            .map(BookingMapper::toDto)
            .toList();
    }

    @GetMapping("/debug/history/{phone}")
    public java.util.List<BookingDto> debugHistory(@PathVariable String phone) {
        return bookingService.getBookingRepository().findByCustomerPhoneOrderByBookingDateDesc(phone).stream()
            .map(BookingMapper::toDto)
            .toList();
    }

    @PostMapping("/reset-no-shows")
    public void resetNoShows() {
        bookingService.resetAllNoShows();
    }

    @PostMapping("/hard-reset-penalties")
    public void hardResetPenalties(@RequestParam(required = false) String phone) {
        if (phone != null && !phone.isBlank()) {
            bookingService.hardResetPenalties(phone);
        } else {
            bookingService.hardResetAllPenalties();
        }
    }

}
