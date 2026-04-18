package com.toptennis.service;

import com.toptennis.config.ReminderProperties;
import com.toptennis.model.Booking;
import com.toptennis.model.BookingStatus;
import com.toptennis.model.SportType;
import com.toptennis.repository.BookingRepository;
import com.toptennis.sms.SmsService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ReminderService {
    private static final Logger log = LoggerFactory.getLogger(ReminderService.class);
    private static final ZoneId ZONE = ZoneId.of("Europe/Bucharest");
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");
    private static final LocalTime LATE_BOOKING_THRESHOLD = LocalTime.of(10, 0);
    private static final LocalTime MAX_EARLY_REMINDER = LocalTime.of(8, 0);

    private final BookingRepository bookingRepository;
    private final SmsService smsService;
    private final ReminderProperties reminderProperties;

    // Tracks booking IDs that already received a reminder today — resets at midnight
    private final Set<Long> sentReminderIds = ConcurrentHashMap.newKeySet();

    public ReminderService(BookingRepository bookingRepository, SmsService smsService,
                           ReminderProperties reminderProperties) {
        this.bookingRepository = bookingRepository;
        this.smsService = smsService;
        this.reminderProperties = reminderProperties;
    }

    /**
     * La 09:00 in fiecare zi — trimite reminder pentru toate rezervarile
     * din ziua curenta care incep la ora 10:00 sau mai tarziu.
     */
    @Scheduled(cron = "0 0 9 * * *", zone = "Europe/Bucharest")
    public void sendLateBookingReminders() {
        LocalDate today = LocalDate.now(ZONE);
        List<Booking> bookings = bookingRepository.findForReminder(
                today, BookingStatus.CONFIRMED, LATE_BOOKING_THRESHOLD, LocalTime.of(23, 59));
        log.info("Reminder batch (>= 10:00) date={} candidates={}", today, bookings.size());
        for (Booking booking : bookings) {
            sendReminderIfEligible(booking);
        }
    }

    /**
     * La fiecare 5 minute intre 00:00 si 08:55 — verifica rezervarile din ziua curenta
     * care incep inainte de 10:00 si trimite reminder-ul cu 60 min inainte
     * (dar nu mai tarziu de 08:00).
     */
    @Scheduled(cron = "0 */5 0-8 * * *", zone = "Europe/Bucharest")
    public void sendEarlyBookingReminders() {
        LocalDate today = LocalDate.now(ZONE);
        LocalTime now = LocalTime.now(ZONE).withSecond(0).withNano(0);
        List<Booking> bookings = bookingRepository.findForReminder(
                today, BookingStatus.CONFIRMED, LocalTime.of(0, 0), LATE_BOOKING_THRESHOLD.minusMinutes(1));
        for (Booking booking : bookings) {
            LocalTime remindAt = computeEarlyRemindAt(booking.getStartTime());
            // Fereastra de 10 minute dupa ora de reminder pentru a prinde rularea cron-ului
            if (!now.isBefore(remindAt) && now.isBefore(remindAt.plusMinutes(10))) {
                sendReminderIfEligible(booking);
            }
        }
    }

    /**
     * La miezul noptii — curata setul de ID-uri trimise pentru a permite
     * re-trimiterea reminders-urilor pentru ziua urmatoare.
     */
    @Scheduled(cron = "0 1 0 * * *", zone = "Europe/Bucharest")
    public void clearSentReminderIds() {
        int cleared = sentReminderIds.size();
        sentReminderIds.clear();
        log.info("Cleared {} sent reminder IDs at midnight.", cleared);
    }

    /**
     * Calculeaza ora la care trebuie trimis reminder-ul pentru o rezervare matinala.
     * Regula: cu 60 min inainte, dar nu mai tarziu de 08:00.
     */
    private LocalTime computeEarlyRemindAt(LocalTime bookingStart) {
        LocalTime sixtyBefore = bookingStart.minusHours(1);
        return sixtyBefore.isAfter(MAX_EARLY_REMINDER) ? MAX_EARLY_REMINDER : sixtyBefore;
    }

    private void sendReminderIfEligible(Booking booking) {
        if (booking.getCourt() == null) {
            log.debug("Reminder skip bookingId={} — missing court", booking.getId());
            return;
        }
        String phone = booking.getCustomerPhone();
        if (phone == null || phone.isBlank()) {
            log.debug("Reminder skip bookingId={} — missing phone", booking.getId());
            return;
        }
        if (!sentReminderIds.add(booking.getId())) {
            log.debug("Reminder skip bookingId={} — already sent today", booking.getId());
            return;
        }
        String message = buildReminderMessage(booking);
        log.info("Reminder send bookingId={} phone={} start={}", booking.getId(), phone,
                formatTime(booking.getStartTime()));
        if (reminderProperties.isMockSms()) {
            log.info("REMINDER MOCK: {}", message);
        } else {
            smsService.sendSms(phone, message);
        }
    }

    private String buildReminderMessage(Booking booking) {
        String firstName = firstNameOf(booking.getCustomerName());
        String start = formatTime(booking.getStartTime());
        String end = formatTime(booking.getEndTime());
        String sport = mapSportLabel(booking.getCourt() != null ? booking.getCourt().getSportType() : null);
        String court = formatCourt(booking);
        String price = formatPrice(booking.getPrice());
        return firstName + ", rezervare astazi la Star Arena\n" +
                sport + " - Teren " + court + " - " + start + "-" + end + "\n" +
                "De achitat: " + price + " RON\n\n" +
                locationBlock(booking);
    }

    private String formatPrice(BigDecimal price) {
        if (price == null) return "0";
        return price.stripTrailingZeros().toPlainString();
    }

    private String locationBlock(Booking booking) {
        boolean indoorPadel = booking.getCourt() != null
                && booking.getCourt().getSportType() == SportType.PADEL
                && booking.getCourt().isIndoor();
        if (indoorPadel) {
            return "Star Arena Padel Maracineni\nhttps://maps.app.goo.gl/saPNV5271ff6UyE89";
        }
        return "Star Arena Bascov\nhttps://maps.app.goo.gl/zrjTZd6DbZJwerJaA";
    }

    private String firstNameOf(String fullName) {
        if (fullName == null || fullName.isBlank()) return "Salut";
        return fullName.split(" ")[0];
    }

    private String formatTime(LocalTime time) {
        if (time == null) return "";
        if (time.getHour() == 23 && time.getMinute() == 59) return "24:00";
        return time.format(TIME_FMT);
    }

    private String formatCourt(Booking booking) {
        if (booking.getCourt() == null || booking.getCourt().getName() == null) return "";
        String name = booking.getCourt().getName().trim();
        if (name.toLowerCase().startsWith("teren")) {
            String rest = name.substring(5).trim();
            return rest.isEmpty() ? name : rest;
        }
        return name;
    }

    private String mapSportLabel(SportType sportType) {
        if (sportType == null) return "";
        return switch (sportType) {
            case TENNIS -> "Tenis";
            case PADEL -> "Padel";
            case BEACH_VOLLEY -> "Volei pe plaja";
            case BASKETBALL -> "Baschet";
            case FOOTVOLLEY -> "Tenis de picior";
            case TABLE_TENNIS -> "Tenis de masa";
        };
    }
}
