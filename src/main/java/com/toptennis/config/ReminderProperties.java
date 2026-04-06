package com.toptennis.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "reminder")
public class ReminderProperties {
    private boolean mockSms;

    public boolean isMockSms() { return mockSms; }
    public void setMockSms(boolean mockSms) { this.mockSms = mockSms; }
}
