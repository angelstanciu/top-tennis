package com.toptennis.config;

import org.springframework.stereotype.Component;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;

@Component
public class ReminderScheduleProvider {
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");
    private final ReminderProperties reminderProperties;

    public ReminderScheduleProvider(ReminderProperties reminderProperties) {
        this.reminderProperties = reminderProperties;
    }

    public String getFirstBatchCron() {
        return hourToCron(reminderProperties.getFirstBatchHour());
    }

    public String getSecondBatchCron() {
        return hourToCron(reminderProperties.getSecondBatchHour());
    }

    private String hourToCron(String hhmm) {
        LocalTime t = parseTime(hhmm);
        return String.format("0 %d %d * * *", t.getMinute(), t.getHour());
    }

    private LocalTime parseTime(String raw) {
        if (raw == null) {
            return LocalTime.of(0, 0);
        }
        String value = raw.trim();
        if (value.matches("^\\d{3,4}$")) {
            int minutes = Integer.parseInt(value);
            int hour = minutes / 60;
            int minute = minutes % 60;
            return LocalTime.of(hour, minute);
        }
        return LocalTime.parse(value, TIME_FMT);
    }
}
