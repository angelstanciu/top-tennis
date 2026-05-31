package com.toptennis.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "sms")
public class SmsProperties {
    private String mode = "production";
    private String port = "/dev/ttyUSB0";
    private int baud = 115200;
    private long commandTimeoutMs = 4000;
    private long sendTimeoutMs = 20000;
    private long interCommandDelayMs = 100;
    private String clubNumber;
    private String adminNotificationNumber;
    private String padelIndoorSupervisorNumber;

    public String getMode() { return mode; }
    public void setMode(String mode) { this.mode = mode; }
    public String getPort() { return port; }
    public void setPort(String port) { this.port = port; }
    public int getBaud() { return baud; }
    public void setBaud(int baud) { this.baud = baud; }
    public long getCommandTimeoutMs() { return commandTimeoutMs; }
    public void setCommandTimeoutMs(long commandTimeoutMs) { this.commandTimeoutMs = commandTimeoutMs; }
    public long getSendTimeoutMs() { return sendTimeoutMs; }
    public void setSendTimeoutMs(long sendTimeoutMs) { this.sendTimeoutMs = sendTimeoutMs; }
    public long getInterCommandDelayMs() { return interCommandDelayMs; }
    public void setInterCommandDelayMs(long interCommandDelayMs) { this.interCommandDelayMs = interCommandDelayMs; }
    public String getClubNumber() { return clubNumber; }
    public void setClubNumber(String clubNumber) { this.clubNumber = clubNumber; }
    public String getAdminNotificationNumber() { return adminNotificationNumber; }
    public void setAdminNotificationNumber(String adminNotificationNumber) { this.adminNotificationNumber = adminNotificationNumber; }
    public String getPadelIndoorSupervisorNumber() { return padelIndoorSupervisorNumber; }
    public void setPadelIndoorSupervisorNumber(String padelIndoorSupervisorNumber) { this.padelIndoorSupervisorNumber = padelIndoorSupervisorNumber; }
}
