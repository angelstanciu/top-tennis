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

    @PostMapping("/block-slot")
    public BookingDto block(@RequestBody @Valid BlockRequest req) {
        return BookingMapper.toDto(bookingService.block(req.courtId, req.date, req.startTime, req.endTime, req.note));
    }

    public record AdminCreateBookingRequest(
            @NotNull Long courtId,
            @NotNull String date,
            @NotNull String startTime,
            @NotNull String endTime,
            @NotNull @Size(max=100) String customerName,
            @Size(max=20) String customerPhone) {}

    @PostMapping("/bookings")
    public BookingDto createBooking(@RequestBody @Valid AdminCreateBookingRequest req) {
        try {
            java.time.LocalDate date = java.time.LocalDate.parse(req.date);
            java.time.LocalTime start = java.time.LocalTime.parse(req.startTime);
            java.time.LocalTime end = "24:00".equals(req.endTime) ? java.time.LocalTime.of(23, 59) : java.time.LocalTime.parse(req.endTime);
            return BookingMapper.toDto(bookingService.createPublicAdmin(
                    req.courtId, date, start, end, req.customerName,
                    req.customerPhone != null ? req.customerPhone : "0000000000",
                    null, null, true, true));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, e.getMessage());
        }
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

}
