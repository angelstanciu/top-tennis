package com.toptennis.service;

import com.toptennis.config.ReminderProperties;
import com.toptennis.config.ReminderScheduleProvider;
import com.toptennis.model.Booking;
import com.toptennis.model.BookingStatus;
import com.toptennis.model.SportType;
import com.toptennis.repository.BookingRepository;
import com.toptennis.sms.SmsService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class ReminderService {
    private static final Logger log = LoggerFactory.getLogger(ReminderService.class);
    private static final ZoneId ZONE = ZoneId.of("Europe/Bucharest");
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");
    private static final Duration SPLIT_PAIR_WINDOW = Duration.ofSeconds(1);
    private static final LocalTime EARLY_NEXT_DAY_END = LocalTime.of(1, 30);
    private static final LocalTime LATE_TODAY_START = LocalTime.of(22, 30);
    private static final LocalTime END_OF_DAY = LocalTime.of(23, 59);

    private final BookingRepository bookingRepository;
    private final SmsService smsService;
    private final ReminderProperties reminderProperties;

    public ReminderService(BookingRepository bookingRepository, SmsService smsService, ReminderProperties reminderProperties) {
        this.bookingRepository = bookingRepository;
        this.smsService = smsService;
        this.reminderProperties = reminderProperties;
    }

    @Scheduled(cron = "#{@reminderScheduleProvider.firstBatchCron}", zone = "Europe/Bucharest")
    public void sendSameDayReminders() {
        LocalDate today = LocalDate.now(ZONE);
        LocalTimeRange range = parseRange(reminderProperties.getFirstBatchIntervals());
        log.info("Reminder batch (same-day) date={} start={} end={}", today, range.start, range.end);
        Set<Long> sent = new HashSet<>();
        sendReminders(today, range.start, range.end, true, false, sent);
        LocalDate tomorrow = today.plusDays(1);
        log.info("Reminder batch (same-day extra) date={} start={} end={}", tomorrow, LocalTime.of(0, 0), EARLY_NEXT_DAY_END);
        sendReminders(tomorrow, LocalTime.of(0, 0), EARLY_NEXT_DAY_END, false, false, sent);
    }

    @Scheduled(cron = "#{@reminderScheduleProvider.secondBatchCron}", zone = "Europe/Bucharest")
    public void sendNextDayReminders() {
        LocalDate today = LocalDate.now(ZONE);
        LocalDate tomorrow = today.plusDays(1);
        log.info("Reminder batch (next-day extra) date={} start={} end={}", today, LATE_TODAY_START, END_OF_DAY);
        Set<Long> sent = new HashSet<>();
        sendReminders(today, LATE_TODAY_START, END_OF_DAY, true, true, sent);
        LocalTimeRange range = parseRange(reminderProperties.getSecondBatchIntervals());
        log.info("Reminder batch (next-day) date={} start={} end={}", tomorrow, range.start, range.end);
        sendReminders(tomorrow, range.start, range.end, false, true, sent);
    }

    private void sendReminders(LocalDate date, LocalTime start, LocalTime end, boolean sameDay, boolean skipPairedAlways, Set<Long> sent) {
        List<Booking> bookings = bookingRepository.findForReminder(date, BookingStatus.CONFIRMED, start, end);
        log.info("Reminder candidates found: {}", bookings.size());
        for (Booking booking : bookings) {
            if (sent.contains(booking.getId())) {
                continue;
            }
            if (booking.getCourt() == null || booking.getCourt().getSportType() != SportType.TABLE_TENNIS) {
                log.info("Reminder skip bookingId={} sport={}", booking.getId(),
                        booking.getCourt() != null ? booking.getCourt().getSportType() : null);
                continue;
            }
            Booking paired = sameDay ? findNextDaySplitPair(booking) : findPreviousDaySplitPair(booking);
            if (paired != null && (skipPairedAlways || !sameDay)) {
                log.info("Reminder skip bookingId={} (paired split with previous day)", booking.getId());
                continue;
            }
            String phone = booking.getCustomerPhone();
            if (phone == null || phone.isBlank()) {
                log.info("Reminder skip bookingId={} missing phone", booking.getId());
                continue;
            }
            LocalTime overrideEnd = paired != null ? paired.getEndTime() : null;
            String message = buildReminderMessage(booking, sameDay, overrideEnd);
            log.info("Reminder send bookingId={} phone={} interval={} - {}", booking.getId(), phone,
                    formatTime(booking.getStartTime()), formatTime(overrideEnd != null ? overrideEnd : booking.getEndTime()));
            smsService.sendSms(phone, message);
            sent.add(booking.getId());
            if (paired != null) {
                sent.add(paired.getId());
            }
        }
    }

    private String buildReminderMessage(Booking booking, boolean sameDay, LocalTime overrideEnd) {
        String start = formatTime(booking.getStartTime());
        String end = formatTime(overrideEnd != null ? overrideEnd : booking.getEndTime());
        String sport = mapSportLabel(booking.getCourt() != null ? booking.getCourt().getSportType() : null);
        String court = formatCourt(booking);
        if (sameDay) {
            return "Buna ziua! Va reamintim ca azi, in intervalul " + start + "-" + end +
                    ", aveti rezervare la " + sport + ", terenul " + court + ". Jocuri frumoase!";
        }
        return "Buna seara! Va reamintim ca maine, in intervalul " + start + "-" + end +
                ", aveti rezervare la " + sport + ", terenul " + court + ". Jocuri frumoase!";
    }

    private String formatTime(LocalTime time) {
        if (time == null) {
            return "";
        }
        if (time.getHour() == 23 && time.getMinute() == 59) {
            return "24:00";
        }
        return time.format(TIME_FMT);
    }

    private String formatCourt(Booking booking) {
        if (booking == null || booking.getCourt() == null || booking.getCourt().getName() == null) {
            return "";
        }
        String name = booking.getCourt().getName().trim();
        if (name.toLowerCase().startsWith("teren")) {
            String rest = name.substring(5).trim();
            return rest.isEmpty() ? name : rest;
        }
        return name;
    }

    private String mapSportLabel(SportType sportType) {
        if (sportType == null) {
            return "";
        }
        switch (sportType) {
            case TENNIS:
                return "Tenis";
            case PADEL:
                return "Padel";
            case BEACH_VOLLEY:
                return "Volei pe plaja";
            case BASKETBALL:
                return "Baschet";
            case FOOTVOLLEY:
                return "Tenis de picior";
            case TABLE_TENNIS:
                return "Tenis de masa";
            default:
                return sportType.name();
        }
    }

    private Booking findNextDaySplitPair(Booking booking) {
        if (booking == null || booking.getCourt() == null) {
            return null;
        }
        if (!LocalTime.of(23, 59).equals(booking.getEndTime())) {
            return null;
        }
        if (booking.getCourt().getSportType() == null) {
            return null;
        }
        String phone = booking.getCustomerPhone();
        String name = booking.getCustomerName();
        if (phone == null || phone.isBlank() || name == null || name.isBlank()) {
            return null;
        }
        LocalDate nextDate = booking.getBookingDate().plusDays(1);
        List<Booking> candidates = bookingRepository.findByDateStartCourtAndCustomer(
                nextDate,
                LocalTime.of(0, 0),
                booking.getCourt().getId(),
                phone,
                name
        );
        return candidates.stream()
                .filter(b -> sameSport(booking, b))
                .filter(b -> isWithinWindow(booking, b))
                .findFirst()
                .orElse(null);
    }

    private Booking findPreviousDaySplitPair(Booking booking) {
        if (booking == null || booking.getCourt() == null) {
            return null;
        }
        if (!LocalTime.of(0, 0).equals(booking.getStartTime())) {
            return null;
        }
        if (booking.getCourt().getSportType() == null) {
            return null;
        }
        String phone = booking.getCustomerPhone();
        String name = booking.getCustomerName();
        if (phone == null || phone.isBlank() || name == null || name.isBlank()) {
            return null;
        }
        LocalDate prevDate = booking.getBookingDate().minusDays(1);
        List<Booking> candidates = bookingRepository.findByDateEndCourtAndCustomer(
                prevDate,
                LocalTime.of(23, 59),
                booking.getCourt().getId(),
                phone,
                name
        );
        return candidates.stream()
                .filter(b -> sameSport(booking, b))
                .filter(b -> isWithinWindow(b, booking))
                .findFirst()
                .orElse(null);
    }

    private boolean isWithinWindow(Booking first, Booking second) {
        if (first.getCreatedAt() == null || second.getCreatedAt() == null) {
            return false;
        }
        Duration delta = Duration.between(first.getCreatedAt(), second.getCreatedAt()).abs();
        return !delta.minus(SPLIT_PAIR_WINDOW).isNegative();
    }

    private boolean sameSport(Booking first, Booking second) {
        if (first.getCourt() == null || second.getCourt() == null) {
            return false;
        }
        if (first.getCourt().getSportType() == null || second.getCourt().getSportType() == null) {
            return false;
        }
        return first.getCourt().getSportType() == second.getCourt().getSportType();
    }

    private LocalTimeRange parseRange(String raw) {
        if (raw == null || raw.isBlank()) {
            return new LocalTimeRange(LocalTime.MIN, LocalTime.MAX);
        }
        String[] parts = raw.split("-");
        if (parts.length != 2) {
            return new LocalTimeRange(LocalTime.MIN, LocalTime.MAX);
        }
        LocalTime start = LocalTime.parse(parts[0].trim(), TIME_FMT);
        String endRaw = parts[1].trim();
        LocalTime end = "24:00".equals(endRaw) ? LocalTime.of(23, 59) : LocalTime.parse(endRaw, TIME_FMT);
        return new LocalTimeRange(start, end);
    }

    private static class LocalTimeRange {
        private final LocalTime start;
        private final LocalTime end;

        private LocalTimeRange(LocalTime start, LocalTime end) {
            this.start = start;
            this.end = end;
        }
    }
}
