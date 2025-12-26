package com.toptennis.service;

import com.toptennis.model.*;
import com.toptennis.sms.SmsService;
 
import com.toptennis.repository.BookingRepository;
import com.toptennis.repository.CourtRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.util.Arrays;
import java.util.List;

@Service
public class BookingService {
    private final BookingRepository bookingRepository;
    private final CourtRepository courtRepository;
    private final SmsService smsService;
 

    public BookingService(BookingRepository bookingRepository, CourtRepository courtRepository, SmsService smsService) {
        this.bookingRepository = bookingRepository;
        this.courtRepository = courtRepository;
        this.smsService = smsService;
    }

    @Transactional
    public Booking createPublic(Long courtId, LocalDate date, LocalTime start, LocalTime end, String name, String phone, String email) {
        Court court = courtRepository.findById(courtId).orElseThrow(() -> new IllegalArgumentException("Court not found: " + courtId));
        validateTime(court, date, start, end);

        List<BookingStatus> activeStatuses = Arrays.asList(BookingStatus.CONFIRMED, BookingStatus.BLOCKED);
        if (!bookingRepository.findOverlapping(courtId, date, start, end, activeStatuses).isEmpty()) {
            throw new IllegalArgumentException("Selected time overlaps with existing booking.");
        }

        // Disallow leaving a 30-minute gap adjacent to existing bookings
        ensureNoThirtyMinuteGap(courtId, date, start, end);

        Booking b = new Booking();
        b.setCourt(court);
        b.setBookingDate(date);
        b.setStartTime(start);
        b.setEndTime(end);
        b.setCustomerName(name);
        b.setCustomerPhone(phone);
        b.setCustomerEmail(email);
        b.setStatus(BookingStatus.CONFIRMED);
        b.setCreatedAt(LocalDateTime.now());
        b.setUpdatedAt(LocalDateTime.now());
        b.setPrice(calculatePrice(court.getPricePerHour(), start, end));
        Booking saved = bookingRepository.save(b);
        smsService.sendReservationNotifications(saved);
        return saved;
    }

    @Transactional(readOnly = true)
    public Booking get(Long id) {
        return bookingRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Booking not found: " + id));
    }

    @Transactional(readOnly = true)
    public java.util.List<Booking> findByDateAndSport(java.time.LocalDate date, com.toptennis.model.SportType sportType) {
        return bookingRepository.findByDateAndSportType(date, sportType);
    }

    @Transactional
    public Booking confirm(Long id) {
        Booking b = get(id);
        b.setStatus(BookingStatus.CONFIRMED);
        b.setUpdatedAt(LocalDateTime.now());
        return bookingRepository.save(b);
    }

    @Transactional
    public Booking cancel(Long id) {
        Booking b = get(id);
        b.setStatus(BookingStatus.CANCELLED);
        b.setUpdatedAt(LocalDateTime.now());
        return bookingRepository.save(b);
    }

    @Transactional
    public Booking block(Long courtId, LocalDate date, LocalTime start, LocalTime end, String note) {
        Court court = courtRepository.findById(courtId).orElseThrow(() -> new IllegalArgumentException("Court not found: " + courtId));
        validateTime(court, date, start, end);
        List<BookingStatus> activeStatuses = Arrays.asList(BookingStatus.CONFIRMED, BookingStatus.BLOCKED);
        if (!bookingRepository.findOverlapping(courtId, date, start, end, activeStatuses).isEmpty()) {
            throw new IllegalArgumentException("Selected time overlaps with existing booking.");
        }
        Booking b = new Booking();
        b.setCourt(court);
        b.setBookingDate(date);
        b.setStartTime(start);
        b.setEndTime(end);
        b.setCustomerName("Club");
        b.setCustomerPhone("-");
        b.setCustomerEmail(note);
        b.setStatus(BookingStatus.BLOCKED);
        b.setCreatedAt(LocalDateTime.now());
        b.setUpdatedAt(LocalDateTime.now());
        b.setPrice(BigDecimal.ZERO);
        return bookingRepository.save(b);
    }

    private void validateTime(Court court, LocalDate date, LocalTime start, LocalTime end) {
        if (date == null || start == null || end == null) {
            throw new IllegalArgumentException("Date and time are required.");
        }
        // Alignment check with end-of-day allowance (23:59 as 24:00)
        if (!isAlignedTo30Min(start) || !isAlignedTo30MinOrEndOfDay(end)) {
            throw new IllegalArgumentException("Start/end must align to 30-minute slots.");
        }

        int startMin = minutesSinceMidnight(start);
        int endMin = minutesSinceMidnight(end);
        if (endMin <= startMin) {
            throw new IllegalArgumentException("End time must be after start time.");
        }
        int durMin = endMin - startMin;
        if (durMin < 60) {
            throw new IllegalArgumentException("Minimum booking duration is 1 hour.");
        }
        // No opening hours constraint: base is open non-stop
    }

    private boolean isAlignedTo30Min(LocalTime t) {
        return t.getMinute() % 30 == 0 && t.getSecond() == 0 && t.getNano() == 0;
    }

    private boolean isAlignedTo30MinOrEndOfDay(LocalTime t) {
        if (isAlignedTo30Min(t)) return true;
        // allow end-of-day 23:59 as a special case to represent 24:00
        return t.getHour() == 23 && t.getMinute() == 59 && t.getSecond() == 0 && t.getNano() == 0;
    }

    private BigDecimal calculatePrice(BigDecimal hourly, LocalTime start, LocalTime end) {
        int minutes = minutesSinceMidnight(end) - minutesSinceMidnight(start);
        BigDecimal hours = BigDecimal.valueOf(minutes).divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
        return hourly.multiply(hours).setScale(2, RoundingMode.HALF_UP);
    }

    private int minutesSinceMidnight(LocalTime t) {
        if (t.getHour() == 23 && t.getMinute() == 59 && t.getSecond() == 0 && t.getNano() == 0) {
            return 24 * 60; // treat 23:59 as 24:00 end-of-day
        }
        return t.getHour() * 60 + t.getMinute();
    }

    private void ensureNoThirtyMinuteGap(Long courtId, LocalDate date, LocalTime start, LocalTime end) {
        // fetch same-day bookings ordered by start
        var all = bookingRepository.findByCourtIdAndBookingDateOrderByStartTimeAsc(courtId, date);
        // consider only active bookings
        var relevant = all.stream()
                .filter(b -> b.getStatus() == BookingStatus.CONFIRMED || b.getStatus() == BookingStatus.BLOCKED)
                .toList();

        // Find previous booking that ends at or before the new start
        LocalTime prevEnd = null;
        for (var b : relevant) {
            if (!b.getEndTime().isAfter(start)) {
                if (prevEnd == null || b.getEndTime().isAfter(prevEnd)) {
                    prevEnd = b.getEndTime();
                }
            } else {
                break;
            }
        }
        if (prevEnd != null && minutesSinceMidnight(start) - minutesSinceMidnight(prevEnd) == 30) {
            throw new IllegalArgumentException("Nu este permis să lăsați o pauză de 30 de minute între rezervări pe același teren.");
        }

        // Find next booking that starts at or after the new end
        LocalTime nextStart = null;
        for (var b : relevant) {
            if (!b.getStartTime().isBefore(end)) {
                nextStart = b.getStartTime();
                break;
            }
        }
        if (nextStart != null && minutesSinceMidnight(nextStart) - minutesSinceMidnight(end) == 30) {
            throw new IllegalArgumentException("Nu este permis să lăsați o pauză de 30 de minute între rezervări pe același teren.");
        }
    }

    
}
