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

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class ReminderService {
    private static final Logger log = LoggerFactory.getLogger(ReminderService.class);
    private static final ZoneId ZONE = ZoneId.of("Europe/Bucharest");
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");

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
        sendReminders(today, range.start, range.end, true);
    }

    @Scheduled(cron = "#{@reminderScheduleProvider.secondBatchCron}", zone = "Europe/Bucharest")
    public void sendNextDayReminders() {
        LocalDate tomorrow = LocalDate.now(ZONE).plusDays(1);
        LocalTimeRange range = parseRange(reminderProperties.getSecondBatchIntervals());
        log.info("Reminder batch (next-day) date={} start={} end={}", tomorrow, range.start, range.end);
        sendReminders(tomorrow, range.start, range.end, false);
    }

    private void sendReminders(LocalDate date, LocalTime start, LocalTime end, boolean sameDay) {
        List<Booking> bookings = bookingRepository.findForReminder(date, BookingStatus.CONFIRMED, start, end);
        log.info("Reminder candidates found: {}", bookings.size());
        for (Booking booking : bookings) {
            if (booking.getCourt() == null || booking.getCourt().getSportType() != SportType.TABLE_TENNIS) {
                log.info("Reminder skip bookingId={} sport={}", booking.getId(),
                        booking.getCourt() != null ? booking.getCourt().getSportType() : null);
                continue;
            }
            String phone = booking.getCustomerPhone();
            if (phone == null || phone.isBlank()) {
                log.info("Reminder skip bookingId={} missing phone", booking.getId());
                continue;
            }
            String message = buildReminderMessage(booking, sameDay);
            log.info("Reminder send bookingId={} phone={} interval={} - {}", booking.getId(), phone,
                    formatTime(booking.getStartTime()), formatTime(booking.getEndTime()));
            smsService.sendSms(phone, message);
        }
    }

    private String buildReminderMessage(Booking booking, boolean sameDay) {
        String start = formatTime(booking.getStartTime());
        String end = formatTime(booking.getEndTime());
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
