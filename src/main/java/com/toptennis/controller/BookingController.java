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

    public BookingController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @PostMapping
    public BookingDto create(@RequestBody @Valid CreateBookingRequest req) {
        LocalDate date = LocalDate.parse(req.date);
        LocalTime start = LocalTime.parse(req.startTime);
        LocalTime end;
        if ("24:00".equals(req.endTime)) {
            end = LocalTime.of(23, 59); // treat end-of-day as 23:59
        } else {
            end = LocalTime.parse(req.endTime);
        }
        Booking b = bookingService.createPublic(req.courtId, date, start, end, req.customerName, req.customerPhone, req.customerEmail);
        return BookingMapper.toDto(b);
    }

    @GetMapping("/{id}")
    public BookingDto get(@PathVariable Long id) {
        return BookingMapper.toDto(bookingService.get(id));
    }
}
