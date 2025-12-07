package com.toptennis.controller;

import com.toptennis.dto.BookingDto;
import com.toptennis.mapper.BookingMapper;
import com.toptennis.model.SportType;
import com.toptennis.service.BookingService;
import jakarta.validation.constraints.NotNull;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

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
                .map(com.toptennis.mapper.BookingMapper::toDto)
                .toList();
    }

    // Confirm endpoint removed: bookings are auto-confirmed on creation

    @PatchMapping("/bookings/{id}/cancel")
    public BookingDto cancel(@PathVariable Long id) {
        return BookingMapper.toDto(bookingService.cancel(id));
    }

    public record BlockRequest(@NotNull Long courtId,
                               @NotNull @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
                               @NotNull @DateTimeFormat(iso = DateTimeFormat.ISO.TIME) LocalTime startTime,
                               @NotNull @DateTimeFormat(iso = DateTimeFormat.ISO.TIME) LocalTime endTime,
                               String note) {}

    @PostMapping("/block-slot")
    public BookingDto block(@RequestBody BlockRequest req) {
        return BookingMapper.toDto(bookingService.block(req.courtId, req.date, req.startTime, req.endTime, req.note));
    }

}
