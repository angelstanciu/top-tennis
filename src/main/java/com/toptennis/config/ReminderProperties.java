package com.toptennis.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "reminder")
public class ReminderProperties {
    private String firstBatchHour;
    private String firstBatchIntervals;
    private String secondBatchHour;
    private String secondBatchIntervals;

    public String getFirstBatchHour() {
        return firstBatchHour;
    }

    public void setFirstBatchHour(String firstBatchHour) {
        this.firstBatchHour = firstBatchHour;
    }

    public String getFirstBatchIntervals() {
        return firstBatchIntervals;
    }

    public void setFirstBatchIntervals(String firstBatchIntervals) {
        this.firstBatchIntervals = firstBatchIntervals;
    }

    public String getSecondBatchHour() {
        return secondBatchHour;
    }

    public void setSecondBatchHour(String secondBatchHour) {
        this.secondBatchHour = secondBatchHour;
    }

    public String getSecondBatchIntervals() {
        return secondBatchIntervals;
    }

    public void setSecondBatchIntervals(String secondBatchIntervals) {
        this.secondBatchIntervals = secondBatchIntervals;
    }
}
