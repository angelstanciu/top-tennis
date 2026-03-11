package com.toptennis.service;

import com.toptennis.model.*;
import com.toptennis.sms.SmsService;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
 
import com.toptennis.repository.BookingRepository;
import com.toptennis.repository.CourtRepository;
import com.toptennis.repository.PlayerUserRepository;
import org.springframework.beans.factory.annotation.Qualifier;
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
    private final PlayerUserRepository playerUserRepository;
    private final ThreadPoolTaskExecutor taskExecutor;
 

    public BookingService(BookingRepository bookingRepository, CourtRepository courtRepository, SmsService smsService, PlayerUserRepository playerUserRepository, @Qualifier("smsTaskExecutor") ThreadPoolTaskExecutor taskExecutor) {
        this.bookingRepository = bookingRepository;
        this.courtRepository = courtRepository;
        this.smsService = smsService;
        this.playerUserRepository = playerUserRepository;
        this.taskExecutor = taskExecutor;
    }

    @Transactional
    public Booking createPublic(Long courtId, LocalDate date, LocalTime start, LocalTime end, String name, String phone, String email) {
        Court court = courtRepository.findById(courtId).orElseThrow(() -> new IllegalArgumentException("Terenul nu a fost găsit: " + courtId));
        validateTime(court, date, start, end);

                List<BookingStatus> activeStatuses = Arrays.asList(BookingStatus.CONFIRMED, BookingStatus.BLOCKED);
        boolean crossesMidnight = !end.isAfter(start);
        if (!crossesMidnight) {
            if (!bookingRepository.findOverlapping(courtId, date, start, end, activeStatuses).isEmpty()) {
                throw new IllegalArgumentException("Intervalul selectat se suprapune cu o rezervare existent.");
            }

            Booking b = new Booking();
            b.setCourt(court);
            b.setBookingDate(date);
            b.setStartTime(start);
            b.setEndTime(end);
            b.setCustomerName(name);
            b.setCustomerPhone(normalizePhone(phone));
            b.setCustomerEmail(email);
            b.setStatus(BookingStatus.CONFIRMED);
            b.setCreatedAt(LocalDateTime.now());
            b.setUpdatedAt(LocalDateTime.now());
            b.setPrice(calculatePrice(court.getPricePerHour(), start, end));
            b.setMidnightBooking(false);
            
            String normPhone = normalizePhone(phone);
            playerUserRepository.findByPhoneNumber(normPhone).ifPresent(pu -> {
                b.setPlayerUser(pu);
                pu.setMatchesPlayed(pu.getMatchesPlayed() + 1);
                playerUserRepository.save(pu);
            });

            Booking saved = bookingRepository.save(b);
            taskExecutor.execute(() -> smsService.sendReservationNotifications(saved));
            return saved;
        } else {
            // Cross-midnight: split into two bookings [start, 24:00) and [00:00, end) on next day
            LocalTime part1End = LocalTime.of(23, 59); // represent 24:00
            LocalDate nextDate = date.plusDays(1);

            if (!bookingRepository.findOverlapping(courtId, date, start, part1End, activeStatuses).isEmpty()) {
                throw new IllegalArgumentException("Intervalul selectat se suprapune cu o rezervare existenta (ziua curenta).");
            }
            if (!bookingRepository.findOverlapping(courtId, nextDate, LocalTime.of(0,0), end, activeStatuses).isEmpty()) {
                throw new IllegalArgumentException("Intervalul selectat se suprapune cu o rezervare existenta (ziua urmatoare).");
            }

            Booking b1 = new Booking();
            b1.setCourt(court);
            b1.setBookingDate(date);
            b1.setStartTime(start);
            b1.setEndTime(part1End);
            b1.setCustomerName(name);
            b1.setCustomerPhone(normalizePhone(phone));
            b1.setCustomerEmail(email);
            b1.setStatus(BookingStatus.CONFIRMED);
            b1.setCreatedAt(LocalDateTime.now());
            b1.setUpdatedAt(LocalDateTime.now());
            b1.setPrice(calculatePrice(court.getPricePerHour(), start, part1End));
            b1.setMidnightBooking(true);
            Booking b2 = new Booking();
            b2.setCourt(court);
            b2.setBookingDate(nextDate);
            b2.setStartTime(LocalTime.of(0,0));
            b2.setEndTime(end);
            b2.setCustomerName(name);
            b2.setCustomerPhone(normalizePhone(phone));
            b2.setCustomerEmail(email);
            b2.setStatus(BookingStatus.CONFIRMED);
            b2.setCreatedAt(LocalDateTime.now());
            b2.setUpdatedAt(LocalDateTime.now());
            b2.setPrice(calculatePrice(court.getPricePerHour(), LocalTime.of(0,0), end));
            b2.setMidnightBooking(true);

            String normPhone = normalizePhone(phone);
            playerUserRepository.findByPhoneNumber(normPhone).ifPresent(pu -> {
                b1.setPlayerUser(pu);
                b2.setPlayerUser(pu);
                pu.setMatchesPlayed(pu.getMatchesPlayed() + 1);
                playerUserRepository.save(pu);
            });

            Booking saved1 = bookingRepository.save(b1);
            Booking saved2 = bookingRepository.save(b2);

            taskExecutor.execute(() -> smsService.sendReservationNotificationsCrossMidnight(saved1, saved2));
            return saved1;
        }
    }

    @Transactional(readOnly = true)
    public Booking get(Long id) {
        return bookingRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Rezervarea nu a fost găsită: " + id));
    }

    @Transactional(readOnly = true)
    public List<Booking> getPlayerHistory(Integer userId) {
        return bookingRepository.findByPlayerUserIdOrderByBookingDateDesc(userId);
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
    public Booking restore(Long id) {
        Booking b = get(id);
        if (b.getStatus() != BookingStatus.CANCELLED) {
            return b;
        }
        List<BookingStatus> activeStatuses = Arrays.asList(BookingStatus.CONFIRMED, BookingStatus.BLOCKED);
        boolean overlaps = !bookingRepository.findOverlappingExcludingId(
                b.getId(),
                b.getCourt().getId(),
                b.getBookingDate(),
                b.getStartTime(),
                b.getEndTime(),
                activeStatuses
        ).isEmpty();
        if (overlaps) {
            throw new IllegalStateException("Intervalul nu mai este disponibil.");
        }
        b.setStatus(BookingStatus.CONFIRMED);
        b.setUpdatedAt(LocalDateTime.now());
        return bookingRepository.save(b);
    }

    @Transactional
    public Booking block(Long courtId, LocalDate date, LocalTime start, LocalTime end, String note) {
        Court court = courtRepository.findById(courtId).orElseThrow(() -> new IllegalArgumentException("Terenul nu a fost găsit: " + courtId));
        validateTime(court, date, start, end);
        List<BookingStatus> activeStatuses = Arrays.asList(BookingStatus.CONFIRMED, BookingStatus.BLOCKED);
        if (!bookingRepository.findOverlapping(courtId, date, start, end, activeStatuses).isEmpty()) {
            throw new IllegalArgumentException("Intervalul selectat se suprapune cu o rezervare existentă.");
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
            throw new IllegalArgumentException("Data și intervalul sunt obligatorii.");
        }
        // Alignment check with end-of-day allowance (23:59 as 24:00)
        if (!isAlignedTo30Min(start) || !isAlignedTo30MinOrEndOfDay(end)) {
            throw new IllegalArgumentException("Ora de început și de sfârșit trebuie să fie la multiplu de 30 de minute.");
        }

        int startMin = minutesSinceMidnight(start);
        int endMin = minutesSinceMidnight(end);
        int durMin = endMin - startMin;
        if (durMin <= 0) durMin += 24 * 60;
        if (durMin < 60) {
            throw new IllegalArgumentException("Durata minimă a rezervării este de 1 oră.");
        }
        // No opening hours constraint: base is open non-stop
        validateGaps(court, date, start, end);
    }

    private void validateGaps(Court court, LocalDate date, LocalTime start, LocalTime end) {
        List<Booking> dayBookings = bookingRepository.findByCourtIdAndBookingDateOrderByStartTimeAsc(court.getId(), date);
        List<BookingStatus> activeStatuses = Arrays.asList(BookingStatus.CONFIRMED, BookingStatus.BLOCKED);
        
        // Filter only active/blocked ones for gap analysis
        List<Booking> active = dayBookings.stream()
                .filter(b -> activeStatuses.contains(b.getStatus()))
                .toList();
        
        if (active.isEmpty()) return;

        // Check gap BEFORE the new booking
        LocalTime beforeStart = start.minusMinutes(30);
        boolean hasBookingAtStart = false;
        boolean hasBookingEnding30MinBefore = false;

        for (Booking b : active) {
            if (b.getEndTime().equals(start)) hasBookingAtStart = true;
            if (b.getEndTime().equals(beforeStart)) hasBookingEnding30MinBefore = true;
        }

        if (hasBookingEnding30MinBefore && !hasBookingAtStart) {
            throw new IllegalArgumentException("Această rezervare lasă un gol de 30 de minute care nu poate fi vândut. Te rugăm să alegi un interval adiacent (ex: de la " + beforeStart + ") sau să lași un gol de cel puțin o oră.");
        }

        // Check gap AFTER the new booking
        LocalTime afterEnd = end.plusMinutes(30);
        // Handle end-of-day special case if needed (23:59 represents 24:00)
        if (end.getHour() == 23 && end.getMinute() == 59) {
            // No gap check after midnight for now, as it involves next day
            return;
        }

        boolean hasBookingAtEnd = false;
        boolean hasBookingStarting30MinAfter = false;

        for (Booking b : active) {
            if (b.getStartTime().equals(end)) hasBookingAtEnd = true;
            if (b.getStartTime().equals(afterEnd)) hasBookingStarting30MinAfter = true;
        }

        if (hasBookingStarting30MinAfter && !hasBookingAtEnd) {
            throw new IllegalArgumentException("Această rezervare lasă un gol de 30 de minute care nu poate fi vândut. Te rugăm să alegi un interval adiacent sau să lași un gol de cel puțin o oră.");
        }
    }

    private String normalizePhone(String phone) {
        if (phone == null) {
            return null;
        }
        String stripped = phone.replaceAll("\\s+", "");
        if (stripped.matches("^0\\d{9}$")) {
            return "+4" + stripped;
        }
        return stripped;
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
}

@Configuration
class SmsTaskConfig {
    @Bean
    public org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor smsTaskExecutor() {
        var exec = new org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor();
        exec.setCorePoolSize(1);
        exec.setMaxPoolSize(1);
        exec.setQueueCapacity(100);
        exec.setThreadNamePrefix("sms-queue-");
        exec.initialize();
        return exec;
    }
}
